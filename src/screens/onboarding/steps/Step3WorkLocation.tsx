import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, weight } from '../../../theme';
import { OutlineButton } from '../../../components/buttons/OutlineButton';
import { RadioCard } from '../../../components/inputs/RadioCard';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { useOnboarding } from '../../../hooks/useOnboarding';
import { useApiResource } from '../../../hooks/useApiResource';
import { onboardingApi } from '../../../services/api/onboardingApi';

export const Step3WorkLocation: React.FC = () => {
  const ob = useOnboarding();
  const { data, loading, error, refetch } = useApiResource(() => onboardingApi.getLocations());
  const locations = data ?? [];

  return (
    <View>
      <Text style={[styles.title, weight(800)]}>Select your work location</Text>
      <Text style={styles.sub}>Nearest facilities to you.</Text>
      <OutlineButton label="Use my current location" icon="pin" onPress={ob.upload} height={46} style={styles.gpsBtn} />

      {loading && !data && (
        <>
          <Skeleton height={64} style={styles.mb10} />
          <Skeleton height={64} style={styles.mb10} />
          <Skeleton height={64} />
        </>
      )}

      {error && !data && <ErrorState title="Couldn't load locations" onRetry={refetch} />}

      {data && !locations.length ? (
        <EmptyState icon="pin" title="No locations nearby" subtitle="Try again or contact support" compact />
      ) : null}

      {locations.map(l => (
        <RadioCard key={l.id} title={l.title} sub={l.sub} selected={ob.location === l.id} onPress={() => ob.setLocation(l.id)} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 15, marginBottom: 2 },
  sub: { fontSize: 12.5, color: colors.inkSecondary, marginBottom: 16 },
  gpsBtn: { marginBottom: 16 },
  mb10: { marginBottom: 10 },
});
