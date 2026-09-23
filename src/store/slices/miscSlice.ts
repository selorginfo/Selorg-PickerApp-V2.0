import type { AppState } from '../state';
import type { Action } from '../actions';
import { digitsOnly } from '../../utils/validators';

/** attendance + settings + wallet + support — small domains grouped. */
export function miscSlice(state: AppState, action: Action): AppState | null {
  switch (action.type) {
    case 'attendance/setTab':
      return { ...state, attendance: { tab: action.tab } };

    case 'settings/toggle':
      return { ...state, settings: { ...state.settings, [action.key]: !state.settings[action.key] } };
    case 'settings/setLang':
      return { ...state, settings: { ...state.settings, lang: action.value } };
    case 'settings/hydrate':
      return { ...state, settings: { ...state.settings, ...action.value } };

    case 'wallet/openWithdraw':
      return { ...state, wallet: { ...state.wallet, wdSheet: true, wdAmount: '', wdKey: `wd_${Date.now()}` } };
    case 'wallet/closeWithdraw':
      return { ...state, wallet: { ...state.wallet, wdSheet: false } };
    case 'wallet/setAmount':
      return { ...state, wallet: { ...state.wallet, wdAmount: digitsOnly(action.value, 6) } };
    case 'wallet/invalidateTxns':
      return { ...state, wallet: { ...state.wallet, txNonce: state.wallet.txNonce + 1 } };

    case 'support/setChatInput':
      return { ...state, support: { ...state.support, chatInput: action.value } };
    case 'support/pushMessage':
      return {
        ...state,
        support: {
          ...state.support,
          chatMsgs: [...state.support.chatMsgs, { who: action.who, text: action.text, time: action.time }],
          chatInput: action.who === 'me' ? '' : state.support.chatInput,
        },
      };
    case 'support/setMessages':
      return { ...state, support: { ...state.support, chatMsgs: action.messages } };
    case 'support/setTyping':
      return { ...state, support: { ...state.support, chatTyping: action.value } };
    case 'support/markTrainingDone': {
      if (state.support.profTrainDone[action.index]) return state;
      const profTrainDone = state.support.profTrainDone.slice();
      profTrainDone[action.index] = true;
      return { ...state, support: { ...state.support, profTrainDone } };
    }
    default:
      return null;
  }
}
