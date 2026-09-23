import { useCallback } from 'react';
import { useStore } from '../store/AppStore';
import type { DataState } from '../types';

export function useUI() {
  const { state, dispatch } = useStore();
  const ui = state.ui;

  const toast = useCallback((msg: string) => dispatch({ type: 'ui/setToast', value: msg }), [dispatch]);

  return {
    ...ui,
    /** current toast text (ui.toast from state) */
    toastMessage: ui.toast,
    /** show a toast */
    toast,
    setDataState: (value: DataState) => dispatch({ type: 'ui/setDataState', value }),
    setConfirmLogout: (value: boolean) => dispatch({ type: 'ui/setConfirmLogout', value }),
    openDeviceSheet: () => dispatch({ type: 'ui/openDeviceSheet' }),
    closeDeviceSheet: () => dispatch({ type: 'ui/closeDeviceSheet' }),
    setDeviceReason: (value: string) => dispatch({ type: 'ui/setDeviceReason', value }),
    openCollectSheet: () => dispatch({ type: 'ui/openCollectSheet' }),
    closeCollectSheet: () => dispatch({ type: 'ui/closeCollectSheet' }),
    setFaqOpen: (index: number) => dispatch({ type: 'ui/setFaqOpen', index }),
    openVideo: (scope: 'ob' | 'profile', index: number, title: string, videoId?: string) =>
      dispatch({ type: 'ui/openVideo', scope, index, title, videoId }),
    toggleVideoPlay: () => dispatch({ type: 'ui/toggleVideoPlay' }),
    closeVideo: () => dispatch({ type: 'ui/closeVideo' }),
  };
}
