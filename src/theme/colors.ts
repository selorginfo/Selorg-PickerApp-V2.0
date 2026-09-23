/**
 * Colour tokens — extracted verbatim from the source HTML inline styles.
 * See PICKER_UI_AUDIT.md § "Design system / Colour".
 */
export const colors = {
  // brand green
  primary: '#1E8E43',
  primaryDark: '#14672F',
  primaryDeep: '#0E4A22',
  inkGreen: '#123B22', // dark green cards (balance, profile, chat header, device)
  primarySoftBg: '#EAF5EC', // success pill / selected radio / icon chip
  primaryTintBorder: '#CFE7D5',
  neutralGreenBg: '#EFF3EE',
  neutralGreenBg2: '#F6F9F5',
  neutralGreenBg3: '#F6F8F5',
  mint: '#8CE0A3',
  railTint: '#BFE6C9',

  // teal (secondary flows / orders icon)
  teal: '#0E8F8A',
  tealBg: '#E0F2F0',
  tealDeep: '#0A5F5B',

  // amber (pending / warning / half-day / offline)
  amber: '#E8A317',
  amberText: '#8A6400',
  amberText2: '#7A5600',
  amberBg: '#FCF2DC',
  amberBorder: '#F0DCA6',
  amberInk: '#3A2A00',

  // red (error / destructive / absent / blocked)
  danger: '#D64545',
  dangerBg: '#FBE9E9',
  dangerBorder: '#F0D2D2',
  dangerBorder2: '#F3D6D6',

  gold: '#F2C94C', // money numerals on dark cards

  // surfaces & backgrounds — full white app chrome
  screenBg: '#FFFFFF',
  stageBg: '#FFFFFF',
  chatBg: '#FFFFFF',
  chatBgAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#FFFFFF',
  border: '#E4EAE5',
  borderSoft: '#EEF2ED',
  borderHair: '#F1F4F0',
  divider: '#EEF2ED',

  // ink / text
  ink: '#16231B',
  inkSecondary: '#5E6E63',
  inkMuted: '#8A9990',
  inkMuted2: '#9AA89E',
  inkDisabled: '#C3CFC6',
  railLabel: '#8A9990',

  // inputs
  inputBorder: '#D8E0D8',
  inputBorderFocus: '#1E8E43',
  inputBorderError: '#D64545',
  inputFill: '#FFFFFF',

  // disabled button
  buttonDisabled: '#B7C9BC',
  toggleOff: '#CBD5CD',

  // status bar / phone chrome
  statusInkLogin: '#FFFFFF',
  statusInk: '#16231B',

  white: '#FFFFFF',
  black: '#0E1A12',
  overlayScrim: 'rgba(14,26,18,0.5)',
  videoScrim: 'rgba(8,16,10,0.85)',
} as const;

export type ColorToken = keyof typeof colors;
