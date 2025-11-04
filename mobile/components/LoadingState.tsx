import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import Mascot from './Mascot';
import { Colors, Spacing } from '../constants/theme';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Composant d'état de chargement avec mascotte
 */
export default function LoadingState({
  message = 'Chargement...',
  fullScreen = false
}: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <Mascot pose="thinking" animation="pulse" size={100} />
      <Text variant="titleMedium" style={styles.message}>
        {message}
      </Text>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  message: {
    marginTop: Spacing.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  spinner: {
    marginTop: Spacing.md,
  },
});
