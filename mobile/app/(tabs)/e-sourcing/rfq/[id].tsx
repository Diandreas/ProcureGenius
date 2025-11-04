import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Chip, List } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing, Shadows } from '../../../../constants/theme';

const rfqAPI = {
  get: async (id: number) => ({ data: null }),
  close: async (id: number) => {},
  getBids: async (id: number) => ({ data: [] })
};

export default function RFQDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [rfq, setRfq] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRfq(); fetchBids(); }, [id]);

  const fetchRfq = async () => {
    try {
      const response = await rfqAPI.get(Number(id));
      setRfq(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger la demande');
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async () => {
    try {
      const response = await rfqAPI.getBids(Number(id));
      setBids(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleClose = async () => {
    Alert.alert('Clôturer la demande', 'Voulez-vous clôturer cette demande de devis ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Clôturer', onPress: async () => {
        try {
          await rfqAPI.close(Number(id));
          Alert.alert('Succès', 'Demande clôturée');
          fetchRfq();
        } catch (error) {
          Alert.alert('Erreur', 'Impossible de clôturer');
        }
      }},
    ]);
  };

  if (loading || !rfq) return <View style={styles.container}><Text>Chargement...</Text></View>;

  const statusColor: any = { draft: Colors.disabled, open: Colors.info, closed: Colors.success };
  const statusLabel: any = { draft: 'Brouillon', open: 'Ouverte', closed: 'Clôturée' };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>{rfq.title}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>{rfq.rfq_number}</Text>
          <Chip mode="flat" style={{ backgroundColor: statusColor[rfq.status], marginTop: Spacing.sm, alignSelf: 'flex-start' }} textStyle={{ color: '#fff' }}>
            {statusLabel[rfq.status]}
          </Chip>
        </Card.Content>
      </Card>

      {rfq.description && (
        <Card style={styles.card}>
          <Card.Title title="Description" left={(props) => <List.Icon {...props} icon="text" />} />
          <Card.Content><Text>{rfq.description}</Text></Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Title title="Dates" left={(props) => <List.Icon {...props} icon="calendar" />} />
        <Card.Content>
          <View style={styles.row}>
            <Text>Date de publication:</Text>
            <Text>{new Date(rfq.published_date).toLocaleDateString('fr-FR')}</Text>
          </View>
          <View style={[styles.row, { marginTop: Spacing.sm }]}>
            <Text>Date limite:</Text>
            <Text>{new Date(rfq.deadline).toLocaleDateString('fr-FR')}</Text>
          </View>
        </Card.Content>
      </Card>

      {bids.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title={`Offres reçues (${bids.length})`} left={(props) => <List.Icon {...props} icon="email" />} />
          <Card.Content>
            {bids.map((bid, idx) => (
              <View key={idx} style={[styles.bidRow, idx > 0 && { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md }]}>
                <Text variant="titleSmall">{bid.supplier_name}</Text>
                <Text variant="titleMedium" style={styles.bidAmount}>
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(bid.total_amount)}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {rfq.status === 'open' && (
        <View style={styles.actions}>
          <Button mode="contained" onPress={handleClose} icon="check">Clôturer la demande</Button>
        </View>
      )}

      {rfq.status === 'closed' && bids.length > 0 && (
        <View style={styles.actions}>
          <Button mode="contained" onPress={() => router.push('/e-sourcing/analysis')} icon="chart-bar">
            Analyser les offres
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  title: { fontWeight: '700', color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginTop: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  bidRow: { marginBottom: Spacing.md },
  bidAmount: { fontWeight: '700', color: Colors.primary, marginTop: Spacing.xs },
  actions: { padding: Spacing.md, paddingBottom: Spacing.xl },
});
