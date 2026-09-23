import React, { useCallback } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { OutlineButton } from '../../components/buttons/OutlineButton';
import { StepTracker } from './steps/StepTracker';
import { Step1Profile } from './steps/Step1Profile';
import { Step2LocationType } from './steps/Step2LocationType';
import { Step3WorkLocation } from './steps/Step3WorkLocation';
import { Step6Kyc } from './steps/Step6Kyc';
import { Step7Face } from './steps/Step7Face';
import { Step8Bank } from './steps/Step8Bank';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useLayout } from '../../hooks/useLayout';

/** Steps 4–5 (shift + training) removed — map stale resume to KYC. */
const STEP_VIEWS: Record<number, React.FC> = {
  1: Step1Profile,
  2: Step2LocationType,
  3: Step3WorkLocation,
  4: Step6Kyc,
  5: Step6Kyc,
  6: Step6Kyc,
  7: Step7Face,
  8: Step8Bank,
};

export const OnboardingWizardScreen: React.FC = () => {
  const ob = useOnboarding();
  const { back } = ob;
  const layout = useLayout();
  const StepView = STEP_VIEWS[ob.step] ?? Step1Profile;
  const stackNav = layout.isCompact || layout.isLandscape;

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        back();
        return true;
      });
      return () => sub.remove();
    }, [back]),
  );

  return (
    <Screen scroll keyboard edges={['top', 'bottom']}>
      <AppHeader title="Complete your profile" onBack={back} flush />
      <View style={styles.body}>
        <StepTracker phase={ob.phase} />
        <StepView />
        <View style={[styles.navRow, stackNav && styles.navStack]}>
          <OutlineButton
            label={ob.backLabel}
            onPress={back}
            color="#16231B"
            height={54}
            style={stackNav ? styles.backBtnStack : styles.backBtn}
          />
          <PrimaryButton
            label={ob.continueLabel}
            onPress={ob.next}
            loading={ob.stepBusy}
            disabled={ob.stepBusy}
            style={stackNav ? styles.nextBtnStack : styles.nextBtn}
            testID="ob-continue"
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 22, paddingBottom: 28 },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 18, alignItems: 'stretch' },
  navStack: { flexDirection: 'column-reverse' },
  backBtn: { paddingHorizontal: 16, flexShrink: 0 },
  backBtnStack: { width: '100%' as const, paddingHorizontal: 0 },
  nextBtn: { flex: 1 },
  nextBtnStack: { width: '100%' as const },
});
