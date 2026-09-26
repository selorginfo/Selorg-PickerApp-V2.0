import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store/AppStore';
import { computeFieldError, last10Digits } from '../utils/validators';
import { normalizePickerGender } from '../utils/gender';
import { formatInPhone, resolveAuthContact, type AuthContact } from '../utils/authContact';
import { goBack } from '../navigation/navigationRef';
import { profileApi } from '../services/api/profileApi';
import { ApiError } from '../services/api/client';
import type { ProfileFormSection } from '../store/actions';
import type { BankForm, EditProfileForm, FieldValidationOpts, PersonalInfoForm } from '../types';

const SPECS: Record<ProfileFormSection, [string, FieldValidationOpts][]> = {
  edit: [
    ['name', { req: true, maxLen: 100 }],
    ['dob', { dob: true }],
    ['email', { email: true }],
    ['phone', { phone: true }],
  ],
  personal: [
    ['altPhone', { phone: true }],
    ['address', { req: true, multiline: true, maxLen: 250 }],
    ['city', { req: true, maxLen: 100 }],
    ['pincode', { pin: true }],
    ['emgName', { req: true, maxLen: 100 }],
    ['emgPhone', { req: true, phone: true }],
  ],
  bank: [
    ['holder', { req: true, maxLen: 100 }],
    ['bank', { maxLen: 100 }],
    ['acc', { req: true, bankAcc: true }],
    ['ifsc', { req: true, ifsc: true }],
  ],
};

export function isoToDisplayDob(iso?: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]} / ${m[2]} / ${m[1]}`;
}

function mapEdit(p: {
  name?: string | null;
  dob?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
}): EditProfileForm {
  return {
    name: p.name || '',
    dob: isoToDisplayDob(p.dob),
    gender: normalizePickerGender(p.gender) || 'male',
    email: p.email || '',
    phone: last10Digits(p.phone || ''),
  };
}

function mapPersonal(p: {
  altPhone?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  emergencyContact?: { name?: string | null; phone?: string | null; relation?: string | null } | null;
}): PersonalInfoForm {
  return {
    altPhone: p.altPhone || '',
    address: p.address || '',
    city: p.city || '',
    pincode: p.pincode || '',
    emgName: p.emergencyContact?.name || '',
    emgPhone: p.emergencyContact?.phone || '',
    emgRel: (p.emergencyContact?.relation as PersonalInfoForm['emgRel']) || 'Parent',
  };
}

export function useProfileForms() {
  const { state, dispatch } = useStore();
  const { profile, auth } = state;
  const primaryPhoneRef = useRef('');
  const [authContact, setAuthContact] = useState<AuthContact>(() =>
    resolveAuthContact({
      channel: auth.channel,
      loginPhone: auth.loginPhone,
      loginEmail: auth.loginEmail,
    }),
  );
  /** Editable unlocked contact (personal screen). */
  const [extraPhone, setExtraPhone] = useState('');
  const [extraEmail, setExtraEmail] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const applyProfile = useCallback(
    (p: Awaited<ReturnType<typeof profileApi.getProfile>>) => {
      if (!p) return;
      const contact = resolveAuthContact({
        loginMethod: p.loginMethod,
        phone: p.phone,
        email: p.email,
        // Only use session channel when this OTP session still has a contact filled.
        channel: auth.loginPhone || auth.loginEmail ? auth.channel : null,
        loginPhone: auth.loginPhone,
        loginEmail: auth.loginEmail,
      });
      setAuthContact(contact);
      primaryPhoneRef.current = contact.phone;
      setExtraPhone(contact.phone);
      setExtraEmail(contact.email);
      setPhotoUri(p.photoUri || null);
      dispatch({
        type: 'profile/replaceEdit',
        value: mapEdit({
          ...p,
          phone: contact.phone,
          email: contact.email,
        }),
      });
      dispatch({ type: 'profile/replacePersonal', value: mapPersonal(p) });
    },
    [auth.channel, auth.loginEmail, auth.loginPhone, dispatch],
  );

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoadError(null);
      setLoading(true);
    }
    try {
      const p = await profileApi.getProfile();
      applyProfile(p);
      return p;
    } catch (e) {
      if (!opts?.silent) {
        setLoadError(e instanceof ApiError ? e.message : 'Could not load profile');
      }
      return null;
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    let cancelled = false;
    reload()
      .then(() => {
        if (cancelled) return;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const fieldError = useCallback(
    (section: ProfileFormSection, key: string, value: string, opts: FieldValidationOpts) => {
      let err = computeFieldError(value, opts);
      if (
        !err &&
        section === 'personal' &&
        key === 'altPhone' &&
        value.trim() &&
        primaryPhoneRef.current &&
        last10Digits(value) === primaryPhoneRef.current
      ) {
        err = 'Must differ from your login phone';
      }
      return err;
    },
    [],
  );

  const errorsFor = (section: ProfileFormSection) => {
    const attempted = profile.attempts[section];
    const data = profile[section] as unknown as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [k, opts] of SPECS[section]) {
      if (section === 'edit' && k === 'phone' && authContact.phoneLocked) {
        out[k] = '';
        continue;
      }
      if (section === 'edit' && k === 'email' && authContact.emailLocked) {
        out[k] = '';
        continue;
      }
      out[k] = attempted ? fieldError(section, k, data[k] || '', opts) : '';
    }
    return out;
  };

  const setField = (section: ProfileFormSection, key: string, value: string) => {
    if (section === 'edit' && key === 'phone' && authContact.phoneLocked) return;
    if (section === 'edit' && key === 'email' && authContact.emailLocked) return;
    dispatch({ type: 'profile/setField', section, key, value });
  };

  const restoreEdit = useCallback(
    (snapshot: EditProfileForm) => {
      dispatch({ type: 'profile/replaceEdit', value: snapshot });
      dispatch({ type: 'profile/setAttempt', section: 'edit', value: false });
    },
    [dispatch],
  );

  const restorePersonal = useCallback(
    (snapshot: PersonalInfoForm) => {
      dispatch({ type: 'profile/replacePersonal', value: snapshot });
      dispatch({ type: 'profile/setAttempt', section: 'personal', value: false });
    },
    [dispatch],
  );

  const restoreBank = useCallback(
    (snapshot: BankForm) => {
      dispatch({ type: 'profile/replaceBank', value: snapshot });
      dispatch({ type: 'profile/setAttempt', section: 'bank', value: false });
    },
    [dispatch],
  );

  const save = useCallback(
    async (
      section: ProfileFormSection,
      options?: { navigateOnSuccess?: 'profile' | false },
    ) => {
      if (saving) return false;
      const navigateOnSuccess = options?.navigateOnSuccess ?? 'profile';
      dispatch({ type: 'profile/setAttempt', section, value: true });
      const data = state.profile[section] as unknown as Record<string, string>;

      const ok = SPECS[section].every(([k, opts]) => {
        if (section === 'edit' && k === 'phone' && authContact.phoneLocked) return true;
        if (section === 'edit' && k === 'email' && authContact.emailLocked) return true;
        return !fieldError(section, k, data[k] || '', opts);
      });

      // Personal screen: validate editable unlocked contact if present.
      if (section === 'personal') {
        if (!authContact.phoneLocked && extraPhone.trim()) {
          const phoneErr = computeFieldError(extraPhone, { phone: true });
          if (phoneErr) {
            dispatch({ type: 'ui/setToast', value: phoneErr });
            return false;
          }
        }
        if (!authContact.emailLocked && extraEmail.trim()) {
          const emailErr = computeFieldError(extraEmail, { email: true });
          if (emailErr) {
            dispatch({ type: 'ui/setToast', value: emailErr });
            return false;
          }
        }
      }

      if (!ok) {
        dispatch({ type: 'ui/setToast', value: 'Please fix the highlighted fields' });
        return false;
      }
      setSaving(true);
      try {
        const payload: Record<string, unknown> = { ...data };
        if (section === 'edit') {
          if (authContact.phoneLocked) delete payload.phone;
          else if (data.phone) payload.phone = last10Digits(data.phone);
          if (authContact.emailLocked) delete payload.email;
          else if (data.email) payload.email = String(data.email).trim().toLowerCase();
        }
        if (section === 'personal') {
          // Address / emergency payload — also persist unlocked contact.
          if (!authContact.phoneLocked && extraPhone.trim()) {
            payload.phone = last10Digits(extraPhone);
          }
          if (!authContact.emailLocked && extraEmail.trim()) {
            payload.email = extraEmail.trim().toLowerCase();
          }
        }

        const saved = await profileApi.save(section, payload);
        dispatch({ type: 'profile/setAttempt', section, value: false });
        // Prefer fresh GET; if it fails, apply PUT response when it looks like a profile.
        const refreshed = await reload({ silent: true });
        if (!refreshed && saved && typeof saved === 'object' && ('phone' in saved || 'address' in saved || 'id' in saved)) {
          applyProfile(saved as Awaited<ReturnType<typeof profileApi.getProfile>>);
        }
        dispatch({ type: 'ui/setToast', value: 'Changes saved' });
        if (navigateOnSuccess === 'profile') goBack();
        return true;
      } catch (e: unknown) {
        dispatch({
          type: 'ui/setToast',
          value: e instanceof ApiError ? e.message : 'Could not save changes',
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      state.profile,
      dispatch,
      fieldError,
      saving,
      reload,
      applyProfile,
      authContact,
      extraEmail,
      extraPhone,
    ],
  );

  const hasEditData = Boolean(profile.edit.name.trim());
  const hasPersonalData = Boolean(
    profile.personal.address.trim() ||
      profile.personal.city.trim() ||
      profile.personal.emgName.trim() ||
      profile.personal.emgPhone.trim(),
  );

  return {
    ...profile,
    errorsFor,
    setField,
    save,
    saving,
    loading,
    loadError,
    reload,
    authContact,
    primaryPhone: authContact.phone,
    primaryEmail: authContact.email,
    primaryPhoneDisplay: authContact.phone ? formatInPhone(authContact.phone) : '',
    primaryEmailDisplay: authContact.email,
    extraPhone,
    extraEmail,
    setExtraPhone: (v: string) => {
      if (!authContact.phoneLocked) setExtraPhone(last10Digits(v));
    },
    setExtraEmail: (v: string) => {
      if (!authContact.emailLocked) setExtraEmail(v);
    },
    photoUri,
    setPhotoUri,
    restoreEdit,
    restorePersonal,
    restoreBank,
    hasEditData,
    hasPersonalData,
  };
}
