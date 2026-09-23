import { resolvePostAuthDestination } from '../src/services/api/mappers';

describe('resolvePostAuthDestination', () => {
  it('sends existing completed users to Home after login', () => {
    expect(
      resolvePostAuthDestination({
        dto: { state: 'ACTIVE' },
        nextScreen: 'main',
        isNewUser: false,
        intent: 'login',
      }),
    ).toBe('Main');
  });

  it('treats lowercase active as Home', () => {
    expect(
      resolvePostAuthDestination({
        dto: { state: 'active' as never },
        isNewUser: false,
        intent: 'login',
      }),
    ).toBe('Main');
  });

  it('sends new users to onboarding after signup', () => {
    expect(
      resolvePostAuthDestination({
        dto: { state: 'ONBOARDING' },
        nextScreen: 'onboarding',
        isNewUser: true,
        intent: 'signup',
      }),
    ).toBe('Onboarding');
  });

  it('resumes incomplete onboarding when backend still requires it', () => {
    expect(
      resolvePostAuthDestination({
        dto: { state: 'ONBOARDING', step: 3 },
        nextScreen: 'onboarding',
        isNewUser: false,
        intent: 'login',
      }),
    ).toBe('Onboarding');
  });

  it('sends submitted applications to Status', () => {
    expect(
      resolvePostAuthDestination({
        dto: { state: 'ONBOARDING', submittedForReviewAt: '2026-09-15T00:00:00.000Z' },
        nextScreen: 'pending_review',
        isNewUser: false,
        intent: 'login',
      }),
    ).toBe('Status');
  });

  it('fail-opens to Home when onboarding fetch fails for a returning login', () => {
    expect(
      resolvePostAuthDestination({
        dto: null,
        isNewUser: false,
        intent: 'login',
      }),
    ).toBe('Main');
  });
});
