import React from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { List, Divider, Card, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { Colors, Spacing, Shadows } from '../../constants/theme';

export default function MoreScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = async () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logout());
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Profile Card */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={60}
            label={user?.email ? user.email[0].toUpperCase() : 'U'}
            style={{ backgroundColor: Colors.primary }}
          />
          <View style={styles.profileInfo}>
            <List.Item
              title={user?.email || 'Utilisateur'}
              description="Voir le profil"
              onPress={() => router.push('/settings/profile')}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Advanced Modules */}
      <List.Section>
        <List.Subheader>Modules avancés</List.Subheader>

        <List.Item
          title="Contrats"
          description="Gérer vos contrats fournisseurs"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/contracts')}
        />
        <Divider />

        <List.Item
          title="E-Sourcing"
          description="Demandes de devis et appels d'offres"
          left={(props) => <List.Icon {...props} icon="gavel" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/e-sourcing')}
        />
        <Divider />

        <List.Item
          title="Assistant IA"
          description="Analyse intelligente et suggestions"
          left={(props) => <List.Icon {...props} icon="robot" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/ai-assistant')}
        />
      </List.Section>

      <Divider />

      {/* Tools & Data */}
      <List.Section>
        <List.Subheader>Outils et données</List.Subheader>

        <List.Item
          title="Migration de données"
          description="Importer/Exporter vos données"
          left={(props) => <List.Icon {...props} icon="database" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/settings/data-migration')}
        />
        <Divider />

        <List.Item
          title="Scanner de code-barres"
          description="Scanner les produits rapidement"
          left={(props) => <List.Icon {...props} icon="barcode-scan" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {
            // Navigate to a product screen with scanner
            router.push('/products/create');
          }}
        />
      </List.Section>

      <Divider />

      {/* Account & Settings */}
      <List.Section>
        <List.Subheader>Compte et paramètres</List.Subheader>

        <List.Item
          title="Abonnement"
          description="Gérer votre plan"
          left={(props) => <List.Icon {...props} icon="credit-card" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => router.push('/settings/subscription')}
        />
        <Divider />

        <List.Item
          title="Langue"
          description="Français"
          left={(props) => <List.Icon {...props} icon="translate" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />

        <List.Item
          title="Notifications"
          description="Gérer les notifications"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
      </List.Section>

      <Divider />

      {/* Help & Info */}
      <List.Section>
        <List.Subheader>Aide et informations</List.Subheader>

        <List.Item
          title="Centre d'aide"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />

        <List.Item
          title="Politique de confidentialité"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />

        <List.Item
          title="Conditions d'utilisation"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />

        <List.Item
          title="Version"
          description="1.0.0-beta"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
      </List.Section>

      <Divider />

      {/* Logout */}
      <List.Section>
        <List.Item
          title="Se déconnecter"
          titleStyle={{ color: Colors.error }}
          left={(props) => <List.Icon {...props} icon="logout" color={Colors.error} />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleLogout}
        />
      </List.Section>

      <View style={styles.footer}>
        {/* Empty footer for spacing */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileCard: {
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  footer: {
    height: Spacing.xl,
  },
});
