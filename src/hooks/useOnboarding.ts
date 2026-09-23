import { useCallback, useRef, useState } from 'react';
import { useStore } from '../store/AppStore';
import { computeFieldError } from '../utils/validators';
import { navigate, resetTo, resetToNested } from '../navigation/navigationRef';
import { onboardingApi } from '../services/api/onboardingApi';
import { ApiError } from '../services/api/client';
import { toIsoDob } from '../services/api/mappers';
import type { ObFormSection } from '../store/actions';
import type { OnboardingStateDto } from '../types/api';
import type { FieldValidationOpts, LocationType } from '../types';

const FIELD_SPECS: Record<ObFormSection, [string, FieldValidationOpts][]> = {
  obProfile: [
    ['name', { req: true, maxLen: 100 }],
    ['dob', { req: true, dob: true }],
    ['phone', { phone: true }],
    ['email', { email: true }],
  ],
  obKyc: [['aadhaar', { req: true, aadhaar: true }], ['pan', { req: true, pan: true }]],
  obBank: [
    ['holder', { req: true, maxLen: 100 }],
    ['bank', { maxLen: 100 }],
    ['acc', { req: true, bankAcc: true }],
    ['ifsc', { req: true, ifsc: true }],
  ],
};
const SEC_KEY = { obProfile: 'profile', obKyc: 'kyc', obBank: 'bank' } as const;

export function useOnboarding() {
  const { state, dispatch } = useStore();
  const ob = state.onboarding;
  const collectBusyRef = useRef(false);
  const [collectBusy, setCollectBusy] = useState(false);
  const stepBusyRef = useRef(false);
  const [stepBusy, setStepBusy] = useState(false);

  const toastErr = useCallback((e: unknown, fallback: string) => {
    dispatch({ type: 'ui/setToast', value: e instanceof ApiError ? e.message : fallback });
  }, [dispatch]);

  const errorsFor = (section: ObFormSection) => {
    const attempted = state.profile.attempts[section];
    const data = ob[SEC_KEY[section]] as unknown as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [k, opts] of FIELD_SPECS[section]) {
      out[k] = attempted ? computeFieldError(data[k], opts) : '';
    }
    return out;
  };

  const gate = (section: ObFormSection): boolean => {
    const data = ob[SEC_KEY[section]] as unknown as Record<string, string>;
    const ok = FIELD_SPECS[section].every(([k, opts]) => !computeFieldError(data[k], opts));
    if (!ok) {
      dispatch({ type: 'profile/setAttempt', section, value: true });
      dispatch({ type: 'ui/setToast', value: 'Please fix the highlighted fields' });
    }
    return ok;
  };

  const next = useCallback(async () => {
    if (stepBusyRef.current) return;
    const step = ob.step;

    // Validate before entering PENDING (no busy flicker on local gates).
    if (step === 1 && !gate('obProfile')) return;
    if (step === 2 && !ob.locType) {
      dispatch({ type: 'ui/setToast', value: 'Choose a location type' });
      return;
    }
    if (step === 3 && !ob.location) {
      dispatch({ type: 'ui/setToast', value: 'Select your work location' });
      return;
    }
    if ((step === 4 || step === 5 || step === 6) && !gate('obKyc')) return;
    if ((step === 4 || step === 5 || step === 6) && !ob.kyc.aadhaarUrl) {
      dispatch({ type: 'ui/setToast', value: 'Upload Aadhaar card image' });
      return;
    }
    if ((step === 4 || step === 5 || step === 6) && !ob.kyc.panUrl) {
      dispatch({ type: 'ui/setToast', value: 'Upload PAN card image' });
      return;
    }
    if (step === 7 && !ob.faceDone) {
      dispatch({ type: 'ui/setToast', value: 'Complete face verification' });
      return;
    }
    if (step === 8) {
      if (ob.bankSaved) {
        resetTo('Main');
        return;
      }
      if (!gate('obBank')) return;
    }

    stepBusyRef.current = true;
    setStepBusy(true);
    try {
      if (step === 1) {
        const body: Record<string, unknown> = {
          name: ob.profile.name,
          dob: toIsoDob(ob.profile.dob),
          gender: ob.profile.gender,
        };
        // Only send the non-login contact so locked identity is never overwritten.
        if (ob.profile.email.trim()) body.email = ob.profile.email.trim().toLowerCase();
        if (ob.profile.phone.trim()) body.phone = ob.profile.phone.replace(/\D/g, '').slice(-10);
        await onboardingApi.submitProfile(body);
      } else if (step === 2) {
        await onboardingApi.submitLocationType(ob.locType!);
      } else if (step === 3) {
        await onboardingApi.setWorkLocation(ob.location);
        await onboardingApi.registerAtDarkStore({ hubId: ob.location }).catch(() => undefined);
        // Skip removed shift + training steps → KYC
        dispatch({ type: 'ob/setStep', step: 6 });
        return;
      } else if (step === 4 || step === 5 || step === 6) {
        await onboardingApi.submitKyc({
          aadhaar: ob.kyc.aadhaar.replace(/\s/g, ''),
          pan: ob.kyc.pan.toUpperCase(),
          aadhaarUrl: ob.kyc.aadhaarUrl,
          panUrl: ob.kyc.panUrl,
          aadhaarFileName: ob.kyc.aadhaarFileName,
          panFileName: ob.kyc.panFileName,
        });
        dispatch({ type: 'ob/setStep', step: 7 });
        return;
      } else if (step === 7) {
        let submitted: OnboardingStateDto = {
          state: 'ONBOARDING',
          submittedForReviewAt: new Date().toISOString(),
        };
        try {
          const st = await onboardingApi.submitForReview({});
          if (st?.state) submitted = st;
        } catch (e) {
          // Face verify may already have marked review; formal submit can also race.
          if (
            !(
              e instanceof ApiError &&
              (e.appCode === 'ALREADY_SUBMITTED' || e.appCode === 'ALREADY_APPROVED')
            )
          ) {
            throw e;
          }
        }
        dispatch({ type: 'ob/statusFetched', dto: submitted });
        navigate('Onboarding', { screen: 'Status' });
        return;
      } else if (step === 8) {
        await onboardingApi.complete({
          holder: ob.bank.holder,
          bank: ob.bank.bank,
          acc: ob.bank.acc,
          ifsc: ob.bank.ifsc,
        });
        dispatch({ type: 'ob/setBankSaved', value: true });
        dispatch({ type: 'ui/setToast', value: 'Bank details saved' });
        return;
      }
      dispatch({ type: 'ob/setStep', step: (step + 1) as typeof step });
    } catch (e) {
      toastErr(e, 'Could not save this step');
    } finally {
      stepBusyRef.current = false;
      setStepBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ob, dispatch]);

  const back = useCallback(() => {
    const step = ob.step;
    if (step === 8) return navigate('Onboarding', { screen: 'Status' });
    // Skip removed shift + training (4–5): KYC ↔ Work location
    if (step === 4 || step === 5 || step === 6) return dispatch({ type: 'ob/setStep', step: 3 });
    if (step > 1) return dispatch({ type: 'ob/setStep', step: (step - 1) as typeof step });
    // Cross-root: clear Onboarding from history so back from OTP cannot return to Wizard
    resetToNested('Auth', 'Otp');
  }, [ob.step, dispatch]);

  const continueLabel =
    ob.step === 7
      ? 'Submit for review'
      : ob.step === 8
        ? ob.bankSaved
          ? 'Enter app'
          : 'Save bank & continue'
        : 'Continue';
  const backLabel = ob.step === 1 ? 'Back to OTP' : ob.step === 8 ? 'Back to status' : 'Back';
  // 4-phase tracker: Profile → Work → KYC → Bank (shift + training removed)
  const phase = ob.step <= 1 ? 1 : ob.step <= 3 ? 2 : ob.step <= 7 ? 3 : 4;

  const refreshStatus = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      dispatch({ type: 'ob/statusLoading' });
    }
    try {
      const st = await onboardingApi.getState();
      dispatch({ type: 'ob/statusFetched', dto: st });
      return true;
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Could not refresh status';
      dispatch({ type: 'ob/statusFailed', error: message });
      if (opts?.silent) toastErr(e, 'Could not refresh status');
      return false;
    }
  }, [dispatch, toastErr]);

  const requestMgrOtp = useCallback(async () => {
    try {
      await onboardingApi.requestManagerOtp();
      dispatch({ type: 'ob/setMgrSent', value: true });
      dispatch({ type: 'ui/setToast', value: 'OTP sent to your hub manager' });
    } catch (e) {
      toastErr(e, 'Failed to send manager OTP');
    }
  }, [dispatch, toastErr]);

  const confirmCollect = useCallback(async () => {
    if (collectBusyRef.current) return;
    if (!ob.mgrSent) {
      dispatch({ type: 'ui/setToast', value: 'Request a collection OTP first' });
      return;
    }
    if (!/^\d{4}$/.test(ob.mgrOtp)) {
      dispatch({ type: 'ui/setToast', value: 'Enter the 4-digit manager OTP' });
      return;
    }
    if (!ob.deviceAck) {
      dispatch({ type: 'ui/setToast', value: 'Confirm device receipt' });
      return;
    }
    collectBusyRef.current = true;
    setCollectBusy(true);
    try {
      const res = await onboardingApi.confirmDeviceCollection({ otp: ob.mgrOtp });
      dispatch({ type: 'ui/closeCollectSheet' });
      dispatch({ type: 'ob/setDeviceCollected', value: true });
      dispatch({
        type: 'ui/setToast',
        value: `Device collected · ${res.deviceId || 'HHD'} assigned`,
      });
      await refreshStatus({ silent: true });
      resetTo('Main');
    } catch (e) {
      toastErr(e, 'Device collection failed');
    } finally {
      collectBusyRef.current = false;
      setCollectBusy(false);
    }
  }, [ob.mgrSent, ob.mgrOtp, ob.deviceAck, dispatch, toastErr, refreshStatus]);

  const approvedContinue = useCallback(() => {
    const action = ob.application?.nextAction;
    if (action === 'collect_device') {
      dispatch({ type: 'ui/openCollectSheet' });
      return;
    }
    if (action === 'enter_app') {
      resetTo('Main');
      return;
    }
    dispatch({ type: 'ob/setStep', step: 8 });
    navigate('Onboarding', { screen: 'Wizard' });
  }, [dispatch, ob.application?.nextAction]);

  const markLocalApproved = useCallback(() => {
    dispatch({ type: 'ob/setGate', value: 'approved' });
  }, [dispatch]);

  const reapply = useCallback(() => {
    dispatch({ type: 'ob/setStep', step: 6 });
    navigate('Onboarding', { screen: 'Wizard' });
  }, [dispatch]);

  return {
    ...ob,
    phase,
    continueLabel,
    backLabel,
    collectBusy,
    stepBusy,
    errorsFor,
    setField: (section: ObFormSection, key: string, value: string) =>
      dispatch({ type: 'ob/setField', section, key, value }),
    setLocType: (value: LocationType) => dispatch({ type: 'ob/setLocType', value }),
    setLocation: (value: string) => dispatch({ type: 'ob/setLocation', value }),
    setFaceDone: (value: boolean) => dispatch({ type: 'ob/setFaceDone', value }),
    setMgrOtp: (value: string) => dispatch({ type: 'ob/setMgrOtp', value }),
    toggleDeviceAck: () => dispatch({ type: 'ob/toggleDeviceAck' }),
    next,
    back,
    requestMgrOtp,
    confirmCollect,
    approvedContinue,
    refreshStatus,
    reapply,
    markLocalApproved,
    upload: () => dispatch({ type: 'ui/setToast', value: 'Use the KYC form fields to submit document numbers' }),
  };
}
