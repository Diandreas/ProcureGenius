import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Text, Card, Button, DataTable, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

const rfqAPI = {
  getComparison: async () => ({ data: { rfqs: [], comparison: [] } })
};

export default function AnalysisScreen() {
  const router = useRouter();
  const [data, setData] = useState<any>({ rfqs: [], comparison: [] });
  const [selectedRfq, setSelectedRfq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await rfqAPI.getComparison();
      setData(response.data);
      if (response.data.rfqs.length > 0) {
        setSelectedRfq(response.data.rfqs[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComparisonForRfq = () => {
    if (!selectedRfq) return [];
    return data.comparison.filter((c: any) => c.rfq_id === selectedRfq);
  };

  const getBestOffer = (offers: any[]) => {
    if (offers.length === 0) return null;
    return offers.reduce((best, current) =>
      current.total_amount < best.total_amount ? current : best
    );
  };

  const comparison = getComparisonForRfq();
  const bestOffer = getBestOffer(comparison);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Analyse comparative des offres</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Comparez les propositions et sélectionnez le meilleur fournisseur</Text>
      </View>

      {data.rfqs.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Sélectionner une demande de devis" />
          <Card.Content>
            <View style={styles.rfqButtons}>
              {data.rfqs.map((rfq: any) => (
                <Button
                  key={rfq.id}
                  mode={selectedRfq === rfq.id ? 'contained' : 'outlined'}
                  onPress={() => setSelectedRfq(rfq.id)}
                  style={styles.rfqButton}
                  compact
                >
                  {rfq.title}
                </Button>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {comparison.length > 0 ? (
        <>
          <Card style={styles.card}>
            <Card.Title title="Résumé" />
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">Nombre d'offres:</Text>
                <Text variant="titleMedium" style={styles.summaryValue}>{comparison.length}</Text>
              </View>
              {bestOffer && (
                <>
                  <View style={[styles.summaryRow, { marginTop: Spacing.md }]}>
                    <Text variant="bodyMedium">Meilleure offre:</Text>
                    <Text variant="titleMedium" style={styles.bestOfferValue}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(bestOffer.total_amount)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, { marginTop: Spacing.xs }]}>
                    <Text variant="bodySmall" style={styles.secondaryText}>Fournisseur:</Text>
                    <Text variant="bodySmall" style={styles.secondaryText}>{bestOffer.supplier_name}</Text>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Comparaison détaillée" />
            <ScrollView horizontal>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title style={styles.wideColumn}>Fournisseur</DataTable.Title>
                  <DataTable.Title numeric style={styles.column}>Prix (€)</DataTable.Title>
                  <DataTable.Title numeric style={styles.column}>Délai (j)</DataTable.Title>
                  <DataTable.Title style={styles.column}>Note</DataTable.Title>
                </DataTable.Header>

                {comparison.map((offer: any, idx: number) => (
                  <DataTable.Row key={idx} style={offer.id === bestOffer?.id ? styles.bestRow : undefined}>
                    <DataTable.Cell style={styles.wideColumn}>
                      {offer.supplier_name}
                      {offer.id === bestOffer?.id && (
                        <Chip mode="flat" style={styles.bestChip} textStyle={{ fontSize: 10, color: '#fff' }}>
                          Meilleur
                        </Chip>
                      )}
                    </DataTable.Cell>
                    <DataTable.Cell numeric style={styles.column}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(offer.total_amount)}
                    </DataTable.Cell>
                    <DataTable.Cell numeric style={styles.column}>
                      {offer.delivery_time || '-'}
                    </DataTable.Cell>
                    <DataTable.Cell style={styles.column}>
                      {offer.quality_score ? `${offer.quality_score}/5` : '-'}
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </ScrollView>
          </Card>

          {bestOffer && (
            <View style={styles.actions}>
              <Button mode="contained" icon="check" onPress={() => {}} style={styles.actionButton}>
                Sélectionner {bestOffer.supplier_name}
              </Button>
            </View>
          )}
        </>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {selectedRfq ? 'Aucune offre reçue pour cette demande' : 'Sélectionnez une demande de devis'}
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  title: { fontWeight: '700', color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginTop: Spacing.xs },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  rfqButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  rfqButton: { marginBottom: Spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryValue: { fontWeight: '700', color: Colors.primary },
  bestOfferValue: { fontWeight: '700', color: Colors.success },
  secondaryText: { color: Colors.textSecondary },
  wideColumn: { flex: 2 },
  column: { flex: 1 },
  bestRow: { backgroundColor: Colors.success + '10' },
  bestChip: { backgroundColor: Colors.success, marginLeft: Spacing.xs },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, padding: Spacing.lg },
  actions: { padding: Spacing.md, paddingBottom: Spacing.xl },
  actionButton: { marginBottom: Spacing.sm },
});
