import { Alert, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraType,
  type ImageLibraryOptions,
  type PhotoQuality,
} from 'react-native-image-picker';
import { ensureImageBase64, type EnsuredImage } from './ensureImageBase64';

const PICKER_OPTS: ImageLibraryOptions = {
  mediaType: 'photo',
  selectionLimit: 1,
  quality: 0.7 as PhotoQuality,
  maxWidth: 1600,
  maxHeight: 1600,
  includeBase64: true,
  includeExtra: true,
};

export type PickedDocumentImage = EnsuredImage;

type PickOptions = {
  cameraType?: CameraType;
};

function mimeFromAsset(asset: Asset): string {
  const named = (asset.fileName || asset.uri || '').split('.').pop()?.toLowerCase();
  if (asset.type) return String(asset.type).toLowerCase();
  if (named === 'png') return 'image/png';
  if (named === 'webp') return 'image/webp';
  if (named === 'heic' || named === 'heif') return 'image/heic';
  return 'image/jpeg';
}

async function fromAsset(asset?: Asset | null): Promise<PickedDocumentImage | null> {
  if (!asset?.uri) return null;

  if (typeof asset.fileSize === 'number' && asset.fileSize > 10 * 1024 * 1024) {
    Alert.alert('File too large', 'Please use an image smaller than 10 MB.');
    return null;
  }

  const ensured = await ensureImageBase64({
    uri: asset.uri,
    base64: asset.base64 || undefined,
    mimeType: mimeFromAsset(asset),
    fileName: asset.fileName || undefined,
  });
  return ensured;
}

async function fromCamera(cameraType: CameraType = 'back'): Promise<PickedDocumentImage | null> {
  const result = await launchCamera({
    ...PICKER_OPTS,
    saveToPhotos: false,
    cameraType,
  });
  if (result.didCancel || result.errorCode) {
    if (result.errorCode === 'permission') {
      Alert.alert('Permission needed', 'Allow camera access in Settings to take a photo.');
    } else if (result.errorMessage) {
      Alert.alert('Camera', result.errorMessage);
    }
    return null;
  }
  return fromAsset(result.assets?.[0]);
}

async function fromGallery(): Promise<PickedDocumentImage | null> {
  const result = await launchImageLibrary(PICKER_OPTS);
  if (result.didCancel || result.errorCode) {
    if (result.errorCode === 'permission') {
      Alert.alert('Permission needed', 'Allow photo library access in Settings to choose a photo.');
    } else if (result.errorMessage) {
      Alert.alert('Gallery', result.errorMessage);
    }
    return null;
  }
  return fromAsset(result.assets?.[0]);
}

/** Shows Camera / Gallery chooser and returns a Base64-ready image, or null if cancelled. */
export function pickDocumentImage(
  title = 'Upload document',
  opts?: PickOptions,
): Promise<PickedDocumentImage | null> {
  const cameraType = opts?.cameraType || 'back';
  return new Promise(resolve => {
    Alert.alert(
      title,
      Platform.OS === 'ios'
        ? 'JPG, PNG, WEBP, or HEIC · max 10 MB'
        : 'JPG, PNG, WEBP, or HEIC · max 10 MB',
      [
        {
          text: 'Take photo',
          onPress: () => {
            void fromCamera(cameraType).then(resolve);
          },
        },
        {
          text: 'Choose from gallery',
          onPress: () => {
            void fromGallery().then(resolve);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
    );
  });
}

/** Profile / avatar pick — prefers the front camera. */
export function pickProfilePhoto(): Promise<PickedDocumentImage | null> {
  return pickDocumentImage('Change profile photo', { cameraType: 'front' });
}
