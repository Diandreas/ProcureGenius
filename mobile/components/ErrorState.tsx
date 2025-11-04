import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import Mascot from './Mascot';
import { Colors, Spacing } from '../constants/theme';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showHome?: boolean;
  onGoHome?: () => void;
}

/**
 * Composant d'état d'erreur avec mascotte
 */
export default function ErrorState({
  title = 'Erreur',
  message = "Une erreur s'est produite.",
  onRetry,
  showHome = false,
  onGoHome,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Mascot pose="error" animation="wave" size={120} />
      <Text variant="headlineSmall" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.message}>
        {message}
      </Text>
      <View style={styles.actions}>
        {onRetry && (
          <Button
            mode="contained"
            onPress={onRetry}
            style={styles.button}
          >
            Réessayer
          </Button>
        )}
        {showHome && onGoHome && (
          <Button
            mode="outlined"
            onPress={onGoHome}
            style={styles.button}
          >
            Retour à l'accueil
          </Button>
        )}
      </View>
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
    color: Colors.error,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    marginBottom: Spacing.sm,
  },
});
