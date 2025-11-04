import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Chip, List, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

const contractsAPI = { get: async (id: number) => ({ data: null }), delete: async (id: number) => {} };

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContract();
  }, [id]);

  const fetchContract = async () => {
    try {
      const response = await contractsAPI.get(Number(id));
      setContract(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le contrat');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Supprimer le contrat', 'Êtes-vous sûr de vouloir supprimer ce contrat ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await contractsAPI.delete(Number(id));
          Alert.alert('Succès', 'Contrat supprimé', [{ text: 'OK', onPress: () => router.back() }]);
        } catch (error) {
          Alert.alert('Erreur', 'Impossible de supprimer le contrat');
        }
      }},
    ]);
  };

  const getContractStatus = () => {
    if (!contract) return { label: '-', color: Colors.disabled };
    const now = new Date();
    const endDate = new Date(contract.end_date);
    const startDate = new Date(contract.start_date);
    if (now < startDate) return { label: 'À venir', color: Colors.info };
    if (now > endDate) return { label: 'Expiré', color: Colors.error };
    return { label: 'Actif', color: Colors.success };
  };

  if (loading || !contract) return <View style={styles.container}><Text>Chargement...</Text></View>;

  const status = getContractStatus();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="headlineSmall" style={styles.contractName}>{contract.name}</Text>
              <Text variant="bodyMedium" style={styles.secondaryText}>{contract.contract_number}</Text>
              <Chip mode="flat" style={{ backgroundColor: status.color, marginTop: Spacing.sm }} textStyle={{ color: '#fff' }}>
                {status.label}
              </Chip>
            </View>
            <IconButton icon="pencil" size={24} onPress={() => router.push(`/contracts/${id}/edit`)} />
          </View>
        </Card.Content>
      </Card>

      {contract.supplier_name && (
        <Card style={styles.card}>
          <Card.Title title="Fournisseur" left={(props) => <List.Icon {...props} icon="truck" />} />
          <Card.Content>
            <Text variant="titleMedium">{contract.supplier_name}</Text>
          </Card.Content>
        </Card>
      )}

      {contract.value && (
        <Card style={styles.card}>
          <Card.Title title="Valeur du contrat" left={(props) => <List.Icon {...props} icon="currency-eur" />} />
          <Card.Content>
            <Text variant="headlineMedium" style={styles.amount}>
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(contract.value)}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Title title="Dates" left={(props) => <List.Icon {...props} icon="calendar" />} />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium">Date de début:</Text>
            <Text variant="bodyMedium">{new Date(contract.start_date).toLocaleDateString('fr-FR')}</Text>
          </View>
          <View style={[styles.row, { marginTop: Spacing.sm }]}>
            <Text variant="bodyMedium">Date de fin:</Text>
            <Text variant="bodyMedium">{new Date(contract.end_date).toLocaleDateString('fr-FR')}</Text>
          </View>
          {contract.renewal_date && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">Date de renouvellement:</Text>
              <Text variant="bodyMedium">{new Date(contract.renewal_date).toLocaleDateString('fr-FR')}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {contract.description && (
        <Card style={styles.card}>
          <Card.Title title="Description" left={(props) => <List.Icon {...props} icon="text" />} />
          <Card.Content>
            <Text variant="bodyMedium">{contract.description}</Text>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Title title="Options" left={(props) => <List.Icon {...props} icon="cog" />} />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium">Renouvellement automatique:</Text>
            <Text variant="bodyMedium">{contract.auto_renew ? 'Oui' : 'Non'}</Text>
          </View>
          {contract.notification_days && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">Notification avant expiration:</Text>
              <Text variant="bodyMedium">{contract.notification_days} jours</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="outlined" onPress={handleDelete} icon="delete" style={styles.actionButton} textColor={Colors.error}>
          Supprimer le contrat
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  contractName: { fontWeight: '700', color: Colors.text },
  secondaryText: { color: Colors.textSecondary, marginTop: Spacing.xs },
  amount: { color: Colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { padding: Spacing.md, paddingBottom: Spacing.xl },
  actionButton: { marginBottom: Spacing.sm },
});
