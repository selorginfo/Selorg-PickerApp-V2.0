import { useCallback, useEffect, useRef, useState } from 'react';
import {
  biometricService,
  type BiometricAvailability,
  type BiometricKind,
} from '../services/biometricService';

interface Options {
  visible?: boolean;
  promptMessage?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  autoTrigger?: boolean;
}

export function useBiometricAuth(options: Options = {}) {
  const {
    visible = true,
    promptMessage = 'Confirm it is you',
    onSuccess,
    onError,
    autoTrigger = true,
  } = options;

  const [checking, setChecking] = useState(true);
  const [availability, setAvailability] = useState<BiometricAvailability>({
    available: false,
    kind: 'none',
  });
  const [authenticating, setAuthenticating] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const successFired = useRef(false);
  const autoTriggered = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const reset = useCallback(() => {
    successFired.current = false;
    autoTriggered.current = false;
    setVerified(false);
    setError(null);
    setAuthenticating(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!visible) {
      reset();
      return;
    }
    setChecking(true);
    biometricService
      .checkAvailability()
      .then(result => {
        if (!cancelled) setAvailability(result);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, reset]);

  const authenticate = useCallback(async () => {
    if (authenticating || verified || successFired.current) return false;
    setAuthenticating(true);
    setError(null);
    const result = await biometricService.authenticate(promptMessage);
    setAuthenticating(false);

    if (result.success) {
      successFired.current = true;
      setVerified(true);
      onSuccessRef.current?.();
      return true;
    }

    if (!result.cancelled && result.error) {
      setError(result.error);
      onErrorRef.current?.(result.error);
    }
    return false;
  }, [authenticating, verified, promptMessage]);

  useEffect(() => {
    if (!visible || !autoTrigger || checking || verified || authenticating) return;
    if (!availability.available || autoTriggered.current || successFired.current) return;
    autoTriggered.current = true;
    const id = setTimeout(() => {
      authenticate().catch(() => {});
    }, 280);
    return () => clearTimeout(id);
  }, [
    visible,
    autoTrigger,
    checking,
    verified,
    authenticating,
    availability.available,
    authenticate,
  ]);

  const kind: BiometricKind = availability.kind;
  const label = biometricService.displayName(kind);

  return {
    checking,
    available: availability.available,
    kind,
    label,
    authenticating,
    verified,
    error,
    authenticate,
    reset,
  };
}
