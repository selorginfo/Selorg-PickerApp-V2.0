import { Alert } from 'react-native';

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/*',
]);

export type EnsuredImage = {
  uri: string;
  base64: string;
  mimeType: string;
  fileName: string;
};

function extOf(name?: string): string {
  return (name || '').split('.').pop()?.toLowerCase() || '';
}

function mimeFromName(name?: string, fallback = 'image/jpeg'): string {
  const ext = extOf(name);
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return fallback;
}

/** Detect real image type from magic bytes (picker MIME is often wrong on Android). */
function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  // HEIC/HEIF: ....ftyp....
  const brand = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (brand === 'ftyp') {
    const major = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (/heic|heif|mif1|msf1|heim|heis/i.test(major)) return 'image/heic';
  }
  return null;
}

function stripDataUriPrefix(raw: string): string {
  const m = String(raw || '').trim().match(/^data:[^;]+;base64,(.+)$/i);
  return (m?.[1] || raw).replace(/\s/g, '');
}

function base64ToBytesPrefix(b64: string, maxBytes = 64): Uint8Array {
  const clean = stripDataUriPrefix(b64);
  const atobFn = typeof globalThis.atob === 'function' ? globalThis.atob.bind(globalThis) : null;
  if (!atobFn) return new Uint8Array();
  // Decode a small prefix only (magic-byte detection).
  const charsNeeded = Math.ceil((maxBytes * 4) / 3) + 4;
  const slice = clean.slice(0, charsNeeded);
  const binary = atobFn(slice);
  const out = new Uint8Array(Math.min(binary.length, maxBytes));
  for (let i = 0; i < out.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function estimateBase64Bytes(b64: string): number {
  const clean = stripDataUriPrefix(b64);
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      const b64 = comma >= 0 ? result.slice(comma + 1) : result;
      if (!b64) {
        reject(new Error('Empty Base64 from image URI'));
        return;
      }
      resolve(b64.replace(/\s/g, ''));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Prefer picker-provided Base64; otherwise read the file URI and convert.
 * Normalizes HEIC→JPEG when the decoded bytes are already JPEG (common after picker compression).
 */
export async function ensureImageBase64(input: {
  uri: string;
  base64?: string;
  mimeType?: string;
  fileName?: string;
}): Promise<EnsuredImage | null> {
  const uri = String(input.uri || '').trim();
  if (!uri) return null;

  let base64 = input.base64 ? stripDataUriPrefix(input.base64) : '';
  let mimeHint = (input.mimeType || mimeFromName(input.fileName || uri)).toLowerCase();

  if (!base64) {
    try {
      const res = await fetch(uri);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (typeof blob.size === 'number' && blob.size > MAX_BYTES) {
        Alert.alert('File too large', 'Please use an image smaller than 10 MB.');
        return null;
      }
      const blobType = String(blob.type || '').toLowerCase();
      if (blobType && blobType !== 'application/octet-stream') mimeHint = blobType;
      base64 = await blobToBase64(blob);
    } catch (err) {
      Alert.alert(
        'Could not read image',
        (err as Error)?.message || 'Failed to convert the selected image to Base64. Try another photo.',
      );
      return null;
    }
  }

  if (!base64) {
    Alert.alert('Could not read image', 'Base64 conversion failed. Try another photo.');
    return null;
  }

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytesPrefix(base64, 64);
  } catch {
    Alert.alert('Could not read image', 'Invalid image data. Try another photo.');
    return null;
  }

  if (estimateBase64Bytes(base64) > MAX_BYTES) {
    Alert.alert('File too large', 'Please use an image smaller than 10 MB.');
    return null;
  }

  const detected = detectMimeFromBytes(bytes);
  let mimeType = detected || mimeHint || 'image/jpeg';

  // Picker often labels compressed HEIC output as HEIC while bytes are JPEG — normalize.
  if ((mimeType === 'image/heic' || mimeType === 'image/heif') && detected === 'image/jpeg') {
    mimeType = 'image/jpeg';
  }
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  if (mimeType === 'image/*') mimeType = detected || 'image/jpeg';

  if (!ALLOWED_MIME.has(mimeType) && !mimeType.startsWith('image/')) {
    Alert.alert('Unsupported file', 'Please upload a JPG, JPEG, PNG, WEBP, or HEIC image.');
    return null;
  }

  const ext =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : mimeType === 'image/heic' || mimeType === 'image/heif'
          ? 'heic'
          : 'jpg';

  const rawName = input.fileName || `document.${ext}`;
  const stem = rawName.replace(/\.[^.]+$/, '') || 'document';
  const fileName = `${stem}.${ext}`;

  return { uri, base64, mimeType, fileName };
}

export function toDataUri(base64: string, mimeType = 'image/jpeg'): string {
  const raw = stripDataUriPrefix(base64);
  return `data:${mimeType || 'image/jpeg'};base64,${raw}`;
}
