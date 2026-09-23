import { displayPickerGender, GENDER_OPTIONS, normalizePickerGender } from '../src/utils/gender';

describe('picker gender helpers', () => {
  it('normalizes title-case UI values', () => {
    expect(normalizePickerGender('Male')).toBe('male');
    expect(normalizePickerGender('Female')).toBe('female');
    expect(normalizePickerGender('Other')).toBe('other');
  });

  it('displays canonical values in title case', () => {
    expect(displayPickerGender('male')).toBe('Male');
    expect(displayPickerGender('Female')).toBe('Female');
  });

  it('exposes Male / Female / Other options with lowercase values', () => {
    expect(GENDER_OPTIONS.map(o => o.value)).toEqual(['male', 'female', 'other']);
    expect(GENDER_OPTIONS.map(o => o.label)).toEqual(['Male', 'Female', 'Other']);
  });
});
