import { Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

export type BiometricKind = 'fingerprint' | 'facial' | 'none';

export interface BiometricAvailability {
  available: boolean;
  kind: BiometricKind;
  biometryType?: string;
  error?: string;
}

export interface BiometricPromptResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

function mapKind(biometryType?: string): BiometricKind {
  if (biometryType === BiometryTypes.FaceID) return 'facial';
  if (biometryType === BiometryTypes.TouchID) return 'fingerprint';
  if (biometryType === BiometryTypes.Biometrics) {
    // Android reports generic "Biometrics"; treat as fingerprint for shift UI.
    return 'fingerprint';
  }
  return 'none';
}

export const biometricService = {
  async checkAvailability(): Promise<BiometricAvailability> {
    try {
      const { available, biometryType, error } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        return {
          available: false,
          kind: 'none',
          biometryType,
          error: error || 'Biometric authentication is not available on this device.',
        };
      }
      return {
        available: true,
        kind: mapKind(biometryType),
        biometryType,
      };
    } catch (e) {
      return {
        available: false,
        kind: 'none',
        error: e instanceof Error ? e.message : 'Could not check biometrics',
      };
    }
  },

  displayName(kind: BiometricKind): string {
    if (kind === 'facial') return Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    if (kind === 'fingerprint') return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    return 'Biometric';
  },

  async authenticate(promptMessage = 'Confirm it is you'): Promise<BiometricPromptResult> {
    try {
      const availability = await this.checkAvailability();
      if (!availability.available) {
        return { success: false, error: availability.error || 'Biometrics unavailable' };
      }

      const { success, error } = await rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel',
        fallbackPromptMessage: 'Use device passcode',
      });

      if (success) return { success: true };

      const message = error || 'Authentication failed';
      const cancelled = /cancel/i.test(message);
      return { success: false, error: message, cancelled };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Authentication failed';
      return { success: false, error: message, cancelled: /cancel/i.test(message) };
    }
  },
};
