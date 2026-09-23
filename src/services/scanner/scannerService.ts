/**
 * SCANNER — intentionally a stub.
 *
 * The source HTML (Selorg Picker Pro) has NO barcode / QR scanner, scan-result,
 * product-verification or order-picking UI. Per _source/uploads/04-picker-workflow.md
 * and BACKEND_ALIGNMENT.md, item scanning / bag-rack / packing photo live in a
 * separate **HHD-App-v2**, not this workforce app. The picker home screen shows
 * order counts only.
 *
 * This module exists so the architecture is ready if a real pick flow is ever
 * added — swap the body for react-native-vision-camera + a barcode plugin.
 */
export interface ScanResult {
  raw: string;
  format: 'ean13' | 'code128' | 'qr' | 'unknown';
  matched: boolean;
}

export const scannerService = {
  isAvailable(): boolean {
    return false;
  },
  async scan(): Promise<ScanResult> {
    throw new Error('Scanner is not part of the Selorg Picker workforce app (HHD-only feature).');
  },
};
