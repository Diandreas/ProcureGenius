import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, Chip, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

const PLANS = [
  {
    name: 'Gratuit',
    price: 0,
    features: ['10 factures/mois', '100 produits', '5 clients', 'Support email'],
    current: true
  },
  {
    name: 'Professionnel',
    price: 29,
    features: ['Factures illimitées', 'Produits illimités', 'Clients illimités', 'E-Sourcing', 'Assistant IA', 'Support prioritaire'],
    popular: true
  },
  {
    name: 'Entreprise',
    price: 99,
    features: ['Tout du Pro', 'Multi-utilisateurs', 'API access', 'Support dédié', 'Formations', 'Personnalisation'],
  }
];

export default function SubscriptionScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Gérer votre abonnement</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Choisissez le plan qui correspond à vos besoins</Text>
      </View>

      {PLANS.map((plan, idx) => (
        <Card key={idx} style={[styles.card, plan.popular && styles.popularCard]}>
          {plan.popular && (
            <Chip mode="flat" style={styles.popularChip} textStyle={{ color: '#fff' }}>Le plus populaire</Chip>
          )}
          <Card.Content>
            <Text variant="headlineMedium" style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              <Text variant="displaySmall" style={styles.price}>{plan.price}€</Text>
              <Text variant="bodyMedium" style={styles.priceUnit}>/mois</Text>
            </View>
            {plan.current && <Chip mode="flat" style={styles.currentChip}>Plan actuel</Chip>}

            <View style={styles.features}>
              {plan.features.map((feature, i) => (
                <View key={i} style={styles.feature}>
                  <MaterialCommunityIcons name="check-circle" size={20} color={Colors.success} />
                  <Text variant="bodyMedium" style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <Button
              mode={plan.current ? 'outlined' : 'contained'}
              onPress={() => {}}
              style={styles.button}
              disabled={plan.current}
            >
              {plan.current ? 'Plan actuel' : 'Choisir ce plan'}
            </Button>
          </Card.Content>
        </Card>
      ))}

      <Card style={styles.card}>
        <Card.Title title="Historique des paiements" left={(props) => <List.Icon {...props} icon="history" />} />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.emptyText}>Aucun paiement enregistré</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  title: { fontWeight: '700', color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginTop: Spacing.xs },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  popularCard: { borderWidth: 2, borderColor: Colors.primary },
  popularChip: { backgroundColor: Colors.primary, alignSelf: 'flex-start', marginBottom: Spacing.sm },
  planName: { fontWeight: '700' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginVertical: Spacing.md },
  price: { fontWeight: '700', color: Colors.primary },
  priceUnit: { color: Colors.textSecondary, marginLeft: Spacing.xs },
  currentChip: { backgroundColor: Colors.success, alignSelf: 'flex-start', marginVertical: Spacing.sm },
  features: { marginVertical: Spacing.md },
  feature: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  featureText: { marginLeft: Spacing.sm },
  button: { marginTop: Spacing.md },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, padding: Spacing.lg },
});
