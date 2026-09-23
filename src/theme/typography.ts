import { Platform, TextStyle } from 'react-native';

/**
 * Plus Jakarta Sans for UI, JetBrains Mono for numerals (timers, money, OTP, account #).
 * The .ttf files must be linked via `react-native.config.js` + `npx react-native-asset`
 * (see PICKER_ARCHITECTURE.md § Assets). Until then these fall back gracefully.
 */
export const fontFamily = {
  regular: Platform.select({ ios: 'PlusJakartaSans-Regular', android: 'PlusJakartaSans-Regular', default: 'System' }),
  medium: Platform.select({ ios: 'PlusJakartaSans-Medium', android: 'PlusJakartaSans-Medium', default: 'System' }),
  semibold: Platform.select({ ios: 'PlusJakartaSans-SemiBold', android: 'PlusJakartaSans-SemiBold', default: 'System' }),
  bold: Platform.select({ ios: 'PlusJakartaSans-Bold', android: 'PlusJakartaSans-Bold', default: 'System' }),
  extrabold: Platform.select({ ios: 'PlusJakartaSans-ExtraBold', android: 'PlusJakartaSans-ExtraBold', default: 'System' }),
  mono: Platform.select({ ios: 'JetBrainsMono-Bold', android: 'JetBrainsMono-Bold', default: 'monospace' }),
} as const;

/** Maps the numeric font-weights seen in the HTML (500/600/700/800) to a family + RN weight. */
export const weight = (w: 500 | 600 | 700 | 800): TextStyle => {
  switch (w) {
    case 500:
      return { fontFamily: fontFamily.medium, fontWeight: '500' };
    case 600:
      return { fontFamily: fontFamily.semibold, fontWeight: '600' };
    case 700:
      return { fontFamily: fontFamily.bold, fontWeight: '700' };
    case 800:
      return { fontFamily: fontFamily.extrabold, fontWeight: '800' };
  }
};

export const mono = (size: number, w: 700 | 800 = 800): TextStyle => ({
  fontFamily: fontFamily.mono,
  fontWeight: String(w) as TextStyle['fontWeight'],
  fontSize: size,
});

/** Named text roles that recur across screens. */
export const text = {
  screenTitle: { fontSize: 22, ...weight(800) } as TextStyle,
  headerTitle: { fontSize: 17, ...weight(700) } as TextStyle,
  cardTitle: { fontSize: 16, ...weight(800) } as TextStyle,
  sectionTitle: { fontSize: 15, ...weight(800) } as TextStyle,
  body: { fontSize: 13.5, ...weight(600) } as TextStyle,
  bodyMuted: { fontSize: 12.5, ...weight(500) } as TextStyle,
  label: { fontSize: 12, ...weight(600) } as TextStyle,
  overline: { fontSize: 12, ...weight(800), letterSpacing: 0.5, textTransform: 'uppercase' } as TextStyle,
  caption: { fontSize: 11, ...weight(500) } as TextStyle,
} as const;
