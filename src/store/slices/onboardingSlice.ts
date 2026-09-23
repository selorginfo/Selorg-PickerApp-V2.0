import type { AppState } from '../state';
import type { Action } from '../actions';
import type { ObStep } from '../../types';
import { digitsOnly } from '../../utils/validators';
import { mapApplicationSnapshot, mapApplicationStatus } from '../../services/api/mappers';

const OB_KEY = { obProfile: 'profile', obKyc: 'kyc', obBank: 'bank' } as const;

export function onboardingSlice(state: AppState, action: Action): AppState | null {
  const ob = state.onboarding;
  switch (action.type) {
    case 'ob/setStep': {
      // Shift + training (steps 4–5) removed — resume/advance lands on KYC.
      const raw = Math.max(1, Math.min(8, action.step));
      const step = (raw === 4 || raw === 5 ? 6 : raw) as ObStep;
      return { ...state, onboarding: { ...ob, step } };
    }
    case 'ob/setField': {
      const target = OB_KEY[action.section];
      let value = action.value;
      if (action.section === 'obKyc' && action.key === 'aadhaar') value = digitsOnly(value, 12);
      if (action.section === 'obKyc' && action.key === 'pan') value = value.toUpperCase().slice(0, 10);
      if (action.section === 'obProfile' && action.key === 'phone') value = digitsOnly(value, 10);
      if (action.section === 'obProfile' && action.key === 'email') value = value.trim().toLowerCase();
      return {
        ...state,
        onboarding: { ...ob, [target]: { ...(ob[target] as object), [action.key]: value } },
      };
    }
    case 'ob/setLocType':
      return { ...state, onboarding: { ...ob, locType: action.value } };
    case 'ob/setLocation':
      return { ...state, onboarding: { ...ob, location: action.value } };
    case 'ob/setShift':
      return { ...state, onboarding: { ...ob, shift: action.value } };
    case 'ob/toggleTrain': {
      const trainDone = ob.trainDone.slice();
      trainDone[action.index] = !trainDone[action.index];
      return { ...state, onboarding: { ...ob, trainDone } };
    }
    case 'ob/setTrainDone': {
      const trainDone = ob.trainDone.slice();
      if (trainDone[action.index] === action.value) return state;
      trainDone[action.index] = action.value;
      return { ...state, onboarding: { ...ob, trainDone } };
    }
    case 'ob/setFaceDone':
      return { ...state, onboarding: { ...ob, faceDone: action.value } };
    case 'ob/setGate':
      return { ...state, onboarding: { ...ob, gate: action.value } };
    case 'ob/statusLoading':
      return { ...state, onboarding: { ...ob, statusLoading: true, statusError: ob.statusHydrated ? ob.statusError : null } };
    case 'ob/statusFetched': {
      const incoming = mapApplicationStatus(action.dto);
      // Keep a local auto-success while the backend catch-up poll is still PENDING.
      const gate = ob.gate === 'approved' && incoming === 'under_review' ? 'approved' : incoming;
      const step = action.dto.step;
      return {
        ...state,
        onboarding: {
          ...ob,
          gate,
          statusHydrated: true,
          statusLoading: false,
          statusError: null,
          application: mapApplicationSnapshot(action.dto),
          deviceCollected: Boolean(action.dto.deviceCollected) || ob.deviceCollected,
          ...(step && step >= 1 && step <= 8
            ? { step: (step === 4 || step === 5 ? 6 : step) as ObStep }
            : {}),
        },
      };
    }
    case 'ob/statusFailed':
      return {
        ...state,
        onboarding: {
          ...ob,
          statusLoading: false,
          statusError: action.error,
        },
      };
    case 'ob/setMgrOtp':
      return { ...state, onboarding: { ...ob, mgrOtp: digitsOnly(action.value, 4) } };
    case 'ob/setMgrSent':
      return { ...state, onboarding: { ...ob, mgrSent: action.value } };
    case 'ob/toggleDeviceAck':
      return { ...state, onboarding: { ...ob, deviceAck: !ob.deviceAck } };
    case 'ob/setDeviceCollected':
      return { ...state, onboarding: { ...ob, deviceCollected: action.value } };
    case 'ob/setBankSaved':
      return { ...state, onboarding: { ...ob, bankSaved: action.value } };
    default:
      return null;
  }
}
