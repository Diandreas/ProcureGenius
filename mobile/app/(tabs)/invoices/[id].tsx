import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider, List, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { invoicesAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await invoicesAPI.get(Number(id));
      setInvoice(response.data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      Alert.alert('Erreur', 'Impossible de charger la facture');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    Alert.alert(
      'Envoyer la facture',
      'Voulez-vous envoyer cette facture au client ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            try {
              await invoicesAPI.send(Number(id));
              Alert.alert('Succès', 'Facture envoyée');
              fetchInvoice();
            } catch (error) {
              Alert.alert('Erreur', "Impossible d'envoyer la facture");
            }
          },
        },
      ]
    );
  };

  const handleMarkPaid = async () => {
    Alert.alert(
      'Marquer comme payée',
      'Confirmer le paiement de cette facture ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await invoicesAPI.markPaid(Number(id), { payment_date: new Date().toISOString() });
              Alert.alert('Succès', 'Facture marquée comme payée');
              fetchInvoice();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de marquer la facture comme payée');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: Colors.disabled,
      sent: Colors.info,
      paid: Colors.success,
      overdue: Colors.error,
    };
    return colors[status] || Colors.disabled;
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      draft: 'Brouillon',
      sent: 'Envoyée',
      paid: 'Payée',
      overdue: 'En retard',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Text>Facture introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="headlineSmall" style={styles.invoiceNumber}>
                {invoice.invoice_number}
              </Text>
              <Chip
                mode="flat"
                style={{ backgroundColor: getStatusColor(invoice.status), marginTop: Spacing.sm }}
                textStyle={{ color: '#fff' }}
              >
                {getStatusLabel(invoice.status)}
              </Chip>
            </View>
            <IconButton
              icon="pencil"
              size={24}
              onPress={() => router.push(`/invoices/${id}/edit`)}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Client Info */}
      <Card style={styles.card}>
        <Card.Title
          title="Client"
          left={(props) => <List.Icon {...props} icon="account" />}
        />
        <Card.Content>
          <Text variant="titleMedium">{invoice.client_name}</Text>
          {invoice.client_email && (
            <Text variant="bodySmall" style={styles.secondaryText}>
              {invoice.client_email}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Amount Info */}
      <Card style={styles.card}>
        <Card.Title
          title="Montant"
          left={(props) => <List.Icon {...props} icon="currency-eur" />}
        />
        <Card.Content>
          <Text variant="headlineMedium" style={styles.amount}>
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            }).format(invoice.total_amount)}
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.row}>
            <Text variant="bodySmall">Sous-total:</Text>
            <Text variant="bodySmall">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(invoice.subtotal || invoice.total_amount)}
            </Text>
          </View>
          {invoice.tax_amount > 0 && (
            <View style={styles.row}>
              <Text variant="bodySmall">TVA:</Text>
              <Text variant="bodySmall">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(invoice.tax_amount)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Dates */}
      <Card style={styles.card}>
        <Card.Title
          title="Dates"
          left={(props) => <List.Icon {...props} icon="calendar" />}
        />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium">Date d'émission:</Text>
            <Text variant="bodyMedium">
              {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          <View style={[styles.row, { marginTop: Spacing.sm }]}>
            <Text variant="bodyMedium">Date d'échéance:</Text>
            <Text variant="bodyMedium">
              {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Items */}
      {invoice.items && invoice.items.length > 0 && (
        <Card style={styles.card}>
          <Card.Title
            title="Articles"
            left={(props) => <List.Icon {...props} icon="format-list-bulleted" />}
          />
          <Card.Content>
            {invoice.items.map((item: any, index: number) => (
              <View key={index}>
                {index > 0 && <Divider style={styles.divider} />}
                <View style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text variant="bodyMedium">{item.product_name || item.description}</Text>
                    <Text variant="bodySmall" style={styles.secondaryText}>
                      Qté: {item.quantity} × {item.unit_price}€
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.itemPrice}>
                    {(item.quantity * item.unit_price).toFixed(2)}€
                  </Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {invoice.status === 'draft' && (
          <Button
            mode="contained"
            onPress={handleSend}
            icon="send"
            style={styles.actionButton}
          >
            Envoyer au client
          </Button>
        )}
        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
          <Button
            mode="contained"
            onPress={handleMarkPaid}
            icon="check"
            style={styles.actionButton}
          >
            Marquer comme payée
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontWeight: '700',
    color: Colors.text,
  },
  secondaryText: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  amount: {
    color: Colors.primary,
    fontWeight: '700',
  },
  divider: {
    marginVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  itemLeft: {
    flex: 1,
  },
  itemPrice: {
    fontWeight: '600',
  },
  actions: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
});
