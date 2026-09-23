import type { AppState } from '../state';
import type { Action } from '../actions';

export function uiSlice(state: AppState, action: Action): AppState | null {
  const ui = state.ui;
  switch (action.type) {
    case 'ui/setDataState':
      return { ...state, ui: { ...ui, dataState: action.value } };
    case 'ui/setToast':
      return { ...state, ui: { ...ui, toast: action.value } };
    case 'ui/setConfirmLogout':
      return { ...state, ui: { ...ui, confirmLogout: action.value } };
    case 'ui/openDeviceSheet':
      return { ...state, ui: { ...ui, deviceSheet: true, deviceReason: '' } };
    case 'ui/closeDeviceSheet':
      return { ...state, ui: { ...ui, deviceSheet: false } };
    case 'ui/setDeviceReason':
      return { ...state, ui: { ...ui, deviceReason: action.value } };
    case 'ui/openCollectSheet':
      return {
        ...state,
        ui: { ...ui, collectSheet: true },
        onboarding: { ...state.onboarding, mgrOtp: '', mgrSent: false, deviceAck: false },
      };
    case 'ui/closeCollectSheet':
      return { ...state, ui: { ...ui, collectSheet: false } };
    case 'ui/setFaqOpen':
      return { ...state, ui: { ...ui, faqOpen: ui.faqOpen === action.index ? -1 : action.index } };
    case 'ui/openVideo':
      return {
        ...state,
        ui: {
          ...ui,
          videoOpen: true,
          videoScope: action.scope,
          videoIdx: action.index,
          videoId: action.videoId ?? null,
          videoTitle: action.title,
          videoPlaying: true,
          videoProgress: 0,
        },
      };
    case 'ui/toggleVideoPlay':
      return { ...state, ui: { ...ui, videoPlaying: !ui.videoPlaying } };
    case 'ui/setVideoProgress':
      return { ...state, ui: { ...ui, videoProgress: action.value, videoPlaying: action.value >= 100 ? false : ui.videoPlaying } };
    case 'ui/closeVideo':
      return { ...state, ui: { ...ui, videoOpen: false, videoPlaying: false, videoId: null } };
    default:
      return null;
  }
}
