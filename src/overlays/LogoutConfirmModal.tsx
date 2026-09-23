import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/bottomSheets/BottomSheet';
import { Icon } from '../components/icons/Icon';
import { PrimaryButton } from '../components/buttons/PrimaryButton';
import { OutlineButton } from '../components/buttons/OutlineButton';
import { colors, weight } from '../theme';
import { useUI } from '../hooks/useUI';
import { useAuth } from '../hooks/useAuth';

export const LogoutConfirmModal: React.FC = () => {
  const { confirmLogout, setConfirmLogout } = useUI();
  const { logout, loggingOut } = useAuth();

  return (
    <BottomSheet
      visible={confirmLogout}
      onClose={() => {
        if (!loggingOut) setConfirmLogout(false);
      }}
      variant="center">
      <View style={styles.wrap}>
        <View style={styles.circle}>
          <Icon name="logout" size={30} color={colors.danger} strokeWidth={2} />
        </View>
        <Text style={[styles.title, weight(800)]}>Log out?</Text>
        <Text style={styles.copy}>You'll need your mobile number and OTP to sign back in.</Text>
        <View style={styles.row}>
          <OutlineButton
            label="Cancel"
            color="#16231B"
            onPress={() => setConfirmLogout(false)}
            height={50}
            style={styles.btn}
            disabled={loggingOut}
            testID="logout-cancel"
          />
          <PrimaryButton
            label="Log out"
            danger
            onPress={logout}
            loading={loggingOut}
            disabled={loggingOut}
            height={50}
            fontSize={15}
            style={styles.btn}
            testID="logout-confirm"
          />
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  circle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 19, marginBottom: 6 },
  copy: { fontSize: 13.5, color: colors.inkSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 22 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1 },
});
