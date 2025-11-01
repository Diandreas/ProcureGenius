import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../../constants/theme';

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.welcome}>
          Bienvenue sur ProcureGenius Mobile !
        </Text>

        <Card style={styles.card}>
          <Card.Title title="Dashboard" subtitle="Tableau de bord principal" />
          <Card.Content>
            <Text variant="bodyMedium">
              Voici la version mobile de votre application de gestion des achats.
            </Text>
            <Text variant="bodySmall" style={styles.info}>
              L'application est en cours de développement. Les fonctionnalités
              seront ajoutées progressivement.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Utilisateur" subtitle="Informations du compte" />
          <Card.Content>
            <Text variant="bodyMedium">
              Email: {user?.email || 'Non défini'}
            </Text>
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          icon="logout"
        >
          Se déconnecter
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  welcome: {
    marginBottom: Spacing.lg,
    color: Colors.text,
    fontWeight: '700',
  },
  card: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  info: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  logoutButton: {
    marginTop: Spacing.lg,
  },
});
