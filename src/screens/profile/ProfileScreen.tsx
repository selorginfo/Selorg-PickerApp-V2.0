import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabScreenNavigation } from '../../navigation/navigationTypes';
import { Screen } from '../../components/common/Screen';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { Avatar } from '../../components/common/Avatar';
import { IconChip } from '../../components/cards/IconChip';
import { Icon } from '../../components/icons/Icon';
import { OutlineButton } from '../../components/buttons/OutlineButton';
import { Skeleton } from '../../components/feedback/Skeleton';
import { ErrorState } from '../../components/feedback/ErrorState';
import { colors, weight, shadows } from '../../theme';
import { useUI } from '../../hooks/useUI';
import { useApiResource } from '../../hooks/useApiResource';
import { useProfileMenuSubs } from '../../hooks/useProfileMenuSubs';
import { profileApi } from '../../services/api/profileApi';
import { initialsFromName } from '../../services/api/mappers';
import type { IconName } from '../../types';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<MainTabScreenNavigation<'Profile'>>();
  const { setConfirmLogout } = useUI();
  const { data: profile, loading, error, refetch } = useApiResource(() => profileApi.getProfile());
  const { rows: menuRows } = useProfileMenuSubs();

  const name = profile?.name || 'Picker';
  const phone = profile?.phone || '—';
  const id = profile?.id || '—';
  const status = profile?.status || '—';
  const memberSince = profile?.memberSince || '—';
  const initials = initialsFromName(profile?.name);

  return (
    <Screen scroll contentStyle={styles.content} testID="screen-profile">
      <OfflineBanner />
      <View style={styles.pad}>
        <Text style={[styles.title, weight(800)]}>Profile</Text>

        {loading && !profile && <Skeleton height={160} style={styles.mb16} />}
        {error && !profile && <ErrorState title="Couldn't load profile" onRetry={refetch} />}

        {profile && (
          <View style={styles.profileCard} testID="profile-card">
            <View style={styles.profileTop}>
              <Avatar
                initials={initials}
                uri={profile?.photoUri}
                size={60}
                radius={18}
                bg="rgba(255,255,255,0.16)"
                fontSize={22}
              />
              <View style={styles.flex1}>
                <Text style={[styles.name, weight(800)]} numberOfLines={1} testID="profile-name">
                  {name}
                </Text>
                <Text style={styles.sub} numberOfLines={1} testID="profile-phone">
                  {phone} · ID {id}
                </Text>
              </View>
              <Pressable
                style={styles.editBtn}
                onPress={() => navigation.navigate('EditProfile')}
                testID="profile-edit">
                <Icon name="edit" size={15} color={colors.white} strokeWidth={1.8} />
                <Text style={[styles.editLabel, weight(700)]}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>Account Status</Text>
                <Text style={[styles.statValue, weight(800), { color: colors.mint }]} testID="profile-status">
                  {status}
                </Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statLabel}>Member Since</Text>
                <Text style={[styles.statValue, weight(800)]}>{memberSince}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.menu} testID="profile-menu">
          {menuRows.map((m, i) => (
            <Pressable
              key={m.key}
              style={[styles.menuRow, i < menuRows.length - 1 && styles.menuDivider]}
              testID={`profile-menu-${m.key}`}
              accessibilityLabel={`${m.title}. ${m.sub}`}
              onPress={() => {
                const screen = m.target;
                (navigation.navigate as (name: typeof screen) => void)(screen);
              }}>
              <IconChip name={m.icon as IconName} color={m.color} bg={m.bg} />
              <View style={styles.flex1}>
                <Text style={[styles.menuTitle, weight(700)]}>{m.title}</Text>
                <Text style={styles.menuSub} testID={`profile-menu-${m.key}-sub`}>
                  {m.sub}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.inkDisabled} strokeWidth={2} />
            </Pressable>
          ))}
        </View>

        <OutlineButton
          label="Logout"
          icon="logout"
          color={colors.danger}
          onPress={() => setConfirmLogout(true)}
          style={styles.logout}
          testID="profile-logout"
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  pad: { padding: 16 },
  mb16: { marginBottom: 16 },
  flex1: { flex: 1, minWidth: 100 },
  title: { fontSize: 22, marginBottom: 16 },
  profileCard: { backgroundColor: colors.inkGreen, borderRadius: 20, padding: 20, marginBottom: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' },
  name: { fontSize: 19, color: colors.white },
  sub: { fontSize: 12.5, color: 'rgba(255,255,255,0.75)' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 40,
  },
  editLabel: { color: colors.white, fontSize: 12.5 },
  statRow: { flexDirection: 'row', gap: 12 },
  statChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  statLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.7)' },
  statValue: { fontSize: 13, color: colors.white },
  menu: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: 'hidden', ...shadows.card },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderHair },
  menuTitle: { fontSize: 14.5, color: colors.ink },
  menuSub: { fontSize: 12, color: colors.inkMuted },
  logout: { marginTop: 16, borderColor: colors.dangerBorder },
});
