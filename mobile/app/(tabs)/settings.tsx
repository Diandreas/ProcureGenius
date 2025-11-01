import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { List, Divider, Switch, Text } from 'react-native-paper';
import { Colors, Spacing } from '../../constants/theme';

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>Paramètres généraux</List.Subheader>
        <List.Item
          title="Mode sombre"
          description="Activer le thème sombre"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => (
            <Switch value={darkMode} onValueChange={setDarkMode} />
          )}
        />
        <Divider />
        <List.Item
          title="Notifications"
          description="Recevoir les notifications push"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch value={notifications} onValueChange={setNotifications} />
          )}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Compte</List.Subheader>
        <List.Item
          title="Profil"
          description="Gérer votre profil"
          left={(props) => <List.Icon {...props} icon="account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Abonnement"
          description="Gérer votre abonnement"
          left={(props) => <List.Icon {...props} icon="credit-card" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>À propos</List.Subheader>
        <List.Item
          title="Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
      </List.Section>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          ProcureGenius Mobile © 2025
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
  },
});
