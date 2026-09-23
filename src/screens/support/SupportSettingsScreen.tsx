import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/common/Screen';
import { AppHeader } from '../../components/common/AppHeader';
import { SectionLabel } from '../../components/common/SectionLabel';
import { Toggle } from '../../components/inputs/Toggle';
import { SegmentedControl } from '../../components/inputs/SegmentedControl';
import { IconChip } from '../../components/cards/IconChip';
import { Icon } from '../../components/icons/Icon';
import { OutlineButton } from '../../components/buttons/OutlineButton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { colors, weight, shadows } from '../../theme';
import { useSettings } from '../../hooks/useSettings';
import { useUI } from '../../hooks/useUI';
import { config } from '../../constants/config';
import { helpActions, settingsRows, languageOptions } from '../../mock/support';
import { profileApi } from '../../services/api/profileApi';
import { ApiError } from '../../services/api/client';

/** Shared by Main and Onboarding stacks (same route names). */
type SupportNav = NativeStackNavigationProp<{
  SupportSettings: undefined;
  Faqs: undefined;
  ChatSupport: undefined;
}>;

export const SupportSettingsScreen: React.FC = () => {
  const navigation = useNavigation<SupportNav>();
  const settings = useSettings();
  const { toast, setConfirmLogout } = useUI();
  const deleteBusyRef = useRef(false);
  const [deleting, setDeleting] = useState(false);

  const onHelp = (action: 'chat' | 'call' | 'mail') => {
    if (action === 'chat') navigation.navigate('ChatSupport');
    else if (action === 'call') {
      const phone = config.supportPhone.replace(/\s+/g, '');
      void Linking.openURL(`tel:${phone}`).catch(() => toast('Unable to start a call'));
    } else {
      void Linking.openURL(`mailto:${config.supportEmail}`).catch(() => toast('Unable to open mail'));
    }
  };

  const runDelete = async () => {
    if (deleteBusyRef.current) return;
    deleteBusyRef.current = true;
    setDeleting(true);
    try {
      await profileApi.requestAccountDeletion();
      toast('Deletion requested');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not submit request');
    } finally {
      deleteBusyRef.current = false;
      setDeleting(false);
    }
  };

  const requestDeletion = () => {
    if (deleting) return;
    Alert.alert(
      'Delete account?',
      'We’ll schedule this account for deletion. You can contact support if this was a mistake.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request deletion',
          style: 'destructive',
          onPress: () => {
            void runDelete();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title="Support & settings" />
      <View style={styles.body}>
        {settings.hydrating && !settings.hydrateError ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Loading preferences…</Text>
          </View>
        ) : null}

        {settings.hydrateError ? (
          <ErrorState
            title="Couldn't load settings"
            message={settings.hydrateError}
            onRetry={() => {
              settings.reload().catch(() => undefined);
            }}
          />
        ) : (
          <>
            <SectionLabel>Notifications</SectionLabel>
            <View style={styles.card}>
              {settingsRows.map((row, i) => (
                <View key={row.key} style={[styles.toggleRow, i < settingsRows.length - 1 && styles.divider]}>
                  <View style={styles.flex1}>
                    <Text style={[styles.toggleLabel, weight(700)]}>{row.label}</Text>
                    <Text style={styles.toggleSub}>{row.sub}</Text>
                  </View>
                  <Toggle
                    value={settings[row.key]}
                    disabled={!!settings.toggleBusy[row.key] || settings.hydrating}
                    testID={`settings-toggle-${row.key}`}
                    accessibilityLabel={row.label}
                    onToggle={() => {
                      settings.toggle(row.key).catch(() => undefined);
                    }}
                  />
                </View>
              ))}
            </View>

            <SectionLabel>Language</SectionLabel>
            <View style={styles.segment}>
              <SegmentedControl
                options={languageOptions}
                value={settings.lang}
                onChange={v => {
                  if (settings.langSaving) return;
                  settings.setLang(v).catch(() => undefined);
                }}
              />
            </View>
          </>
        )}

        <SectionLabel>Get help</SectionLabel>
        <View style={styles.card}>
          {helpActions.map(h => (
            <Pressable key={h.label} style={[styles.helpRow, styles.divider]} onPress={() => onHelp(h.action)}>
              <IconChip name={h.icon} color={h.color} bg={h.bg} />
              <View style={styles.flex1}>
                <Text style={[styles.helpLabel, weight(700)]}>{h.label}</Text>
                <Text style={styles.helpSub}>{h.sub}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkDisabled} strokeWidth={2} />
            </Pressable>
          ))}
          <Pressable style={styles.helpRow} onPress={() => navigation.navigate('Faqs')}>
            <View style={styles.faqChip}>
              <Text style={[styles.faqQ, weight(800)]}>?</Text>
            </View>
            <Text style={[styles.helpLabel, weight(700), styles.flex1]}>FAQs</Text>
            <Icon name="chevronRight" size={18} color={colors.inkDisabled} strokeWidth={2} />
          </Pressable>
        </View>

        <Text style={styles.version}>{config.appVersion}</Text>
        <OutlineButton label="Logout" icon="logout" color={colors.danger} onPress={() => setConfirmLogout(true)} style={styles.logout} />
        <Pressable onPress={requestDeletion} style={styles.deleteWrap} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={styles.deleteText}>Request account deletion</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { padding: 16, paddingBottom: 28 },
  flex1: { flex: 1 },
  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  loadingText: { color: colors.inkMuted, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, marginBottom: 20, ...shadows.card },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderHair },
  toggleLabel: { fontSize: 14 },
  toggleSub: { fontSize: 12, color: colors.inkMuted },
  segment: { marginBottom: 20 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 },
  helpLabel: { fontSize: 14 },
  helpSub: { fontSize: 12, color: colors.inkMuted },
  faqChip: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.neutralGreenBg, alignItems: 'center', justifyContent: 'center' },
  faqQ: { fontSize: 18, color: colors.inkSecondary },
  version: { textAlign: 'center', fontSize: 11.5, color: colors.inkMuted2, marginVertical: 14 },
  logout: { borderColor: colors.dangerBorder },
  deleteWrap: { alignItems: 'center', paddingVertical: 16 },
  deleteText: { fontSize: 13, color: colors.danger, fontWeight: '700' },
});
