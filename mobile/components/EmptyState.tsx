import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import Mascot from './Mascot';
import { Colors, Spacing } from '../constants/theme';

interface EmptyStateProps {
  title?: string;
  description?: string;
  mascotPose?: 'main' | 'happy' | 'excited' | 'thinking' | 'reading' | 'thumbup' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Composant d'état vide avec mascotte
 */
export default function EmptyState({
  title = 'Aucune donnée',
  description = 'Commencez par ajouter votre premier élément.',
  mascotPose = 'reading',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Mascot pose={mascotPose} animation="float" size={120} />
      <Text variant="headlineSmall" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.description}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.button}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    marginTop: Spacing.lg,
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.lg,
  },
});
