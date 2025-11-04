import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Chip, List, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { purchaseOrdersAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await purchaseOrdersAPI.get(Number(id));
      setOrder(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le bon de commande');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await purchaseOrdersAPI.updateStatus(Number(id), { status: newStatus });
      Alert.alert('Succès', 'Statut mis à jour');
      fetchOrder();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  if (loading || !order) return <View style={styles.container}><Text>Chargement...</Text></View>;

  const statusColor: any = { draft: Colors.disabled, sent: Colors.info, received: Colors.success, cancelled: Colors.error };
  const statusLabel: any = { draft: 'Brouillon', sent: 'Envoyé', received: 'Reçu', cancelled: 'Annulé' };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="headlineSmall" style={styles.orderNumber}>{order.po_number}</Text>
              <Chip mode="flat" style={{ backgroundColor: statusColor[order.status], marginTop: Spacing.sm }} textStyle={{ color: '#fff' }}>
                {statusLabel[order.status]}
              </Chip>
            </View>
            <IconButton icon="pencil" size={24} onPress={() => router.push(`/purchase-orders/${id}/edit`)} />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Fournisseur" left={(props) => <List.Icon {...props} icon="truck" />} />
        <Card.Content>
          <Text variant="titleMedium">{order.supplier_name}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Montant" left={(props) => <List.Icon {...props} icon="currency-eur" />} />
        <Card.Content>
          <Text variant="headlineMedium" style={styles.amount}>
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(order.total_amount)}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Dates" left={(props) => <List.Icon {...props} icon="calendar" />} />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium">Date de commande:</Text>
            <Text variant="bodyMedium">{new Date(order.order_date).toLocaleDateString('fr-FR')}</Text>
          </View>
          <View style={[styles.row, { marginTop: Spacing.sm }]}>
            <Text variant="bodyMedium">Date de livraison prévue:</Text>
            <Text variant="bodyMedium">{new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')}</Text>
          </View>
        </Card.Content>
      </Card>

      {order.items && order.items.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Articles" left={(props) => <List.Icon {...props} icon="format-list-bulleted" />} />
          <Card.Content>
            {order.items.map((item: any, index: number) => (
              <View key={index} style={index > 0 ? { marginTop: Spacing.md } : {}}>
                <Text variant="bodyMedium">{item.product_name}</Text>
                <Text variant="bodySmall" style={styles.secondaryText}>
                  Qté: {item.quantity} × {item.unit_price}€ = {(item.quantity * item.unit_price).toFixed(2)}€
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <View style={styles.actions}>
        {order.status === 'draft' && (
          <Button mode="contained" onPress={() => handleStatusChange('sent')} icon="send" style={styles.actionButton}>
            Envoyer au fournisseur
          </Button>
        )}
        {order.status === 'sent' && (
          <Button mode="contained" onPress={() => handleStatusChange('received')} icon="check" style={styles.actionButton}>
            Marquer comme reçu
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  orderNumber: { fontWeight: '700', color: Colors.text },
  amount: { color: Colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secondaryText: { color: Colors.textSecondary, marginTop: Spacing.xs },
  actions: { padding: Spacing.md, paddingBottom: Spacing.xl },
  actionButton: { marginBottom: Spacing.sm },
});
