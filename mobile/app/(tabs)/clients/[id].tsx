import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Card, Button, Chip, Divider, List, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { clientsAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await clientsAPI.get(Number(id));
      setClient(response.data);
    } catch (error) {
      console.error('Error fetching client:', error);
      Alert.alert('Erreur', 'Impossible de charger le client');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Supprimer le client',
      'Êtes-vous sûr de vouloir supprimer ce client ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await clientsAPI.delete(Number(id));
              Alert.alert('Succès', 'Client supprimé', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le client');
            }
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    }
  };

  const handleEmail = () => {
    if (client?.email) {
      Linking.openURL(`mailto:${client.email}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.container}>
        <Text>Client introuvable</Text>
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
              <Text variant="headlineSmall" style={styles.clientName}>
                {client.name}
              </Text>
              {client.company && (
                <Text variant="bodyMedium" style={styles.secondaryText}>
                  {client.company}
                </Text>
              )}
              <Chip
                mode="flat"
                style={{
                  backgroundColor: client.is_active !== false ? Colors.success : Colors.disabled,
                  marginTop: Spacing.sm,
                }}
                textStyle={{ color: '#fff' }}
              >
                {client.is_active !== false ? 'Actif' : 'Inactif'}
              </Chip>
            </View>
            <IconButton
              icon="pencil"
              size={24}
              onPress={() => router.push(`/clients/${id}/edit`)}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Contact Information */}
      <Card style={styles.card}>
        <Card.Title
          title="Coordonnées"
          left={(props) => <List.Icon {...props} icon="card-account-details" />}
        />
        <Card.Content>
          {client.email && (
            <View style={styles.contactRow}>
              <MaterialCommunityIcons name="email" size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text variant="bodyMedium">{client.email}</Text>
                <Button mode="text" onPress={handleEmail} compact>
                  Envoyer un email
                </Button>
              </View>
            </View>
          )}

          {client.phone && (
            <View style={[styles.contactRow, { marginTop: Spacing.md }]}>
              <MaterialCommunityIcons name="phone" size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text variant="bodyMedium">{client.phone}</Text>
                <Button mode="text" onPress={handleCall} compact>
                  Appeler
                </Button>
              </View>
            </View>
          )}

          {client.website && (
            <View style={[styles.contactRow, { marginTop: Spacing.md }]}>
              <MaterialCommunityIcons name="web" size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text variant="bodyMedium">{client.website}</Text>
                <Button
                  mode="text"
                  onPress={() => Linking.openURL(client.website)}
                  compact
                >
                  Visiter le site
                </Button>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Address */}
      {(client.address || client.city || client.postal_code || client.country) && (
        <Card style={styles.card}>
          <Card.Title
            title="Adresse"
            left={(props) => <List.Icon {...props} icon="map-marker" />}
          />
          <Card.Content>
            {client.address && (
              <Text variant="bodyMedium">{client.address}</Text>
            )}
            {(client.city || client.postal_code) && (
              <Text variant="bodyMedium" style={{ marginTop: Spacing.xs }}>
                {client.postal_code} {client.city}
              </Text>
            )}
            {client.country && (
              <Text variant="bodyMedium" style={{ marginTop: Spacing.xs }}>
                {client.country}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Tax Information */}
      {(client.tax_id || client.vat_number) && (
        <Card style={styles.card}>
          <Card.Title
            title="Informations fiscales"
            left={(props) => <List.Icon {...props} icon="file-document" />}
          />
          <Card.Content>
            {client.tax_id && (
              <View style={styles.row}>
                <Text variant="bodyMedium">Numéro fiscal:</Text>
                <Text variant="bodyMedium">{client.tax_id}</Text>
              </View>
            )}
            {client.vat_number && (
              <View style={[styles.row, { marginTop: Spacing.sm }]}>
                <Text variant="bodyMedium">Numéro de TVA:</Text>
                <Text variant="bodyMedium">{client.vat_number}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Payment Terms */}
      {(client.payment_terms || client.credit_limit) && (
        <Card style={styles.card}>
          <Card.Title
            title="Conditions de paiement"
            left={(props) => <List.Icon {...props} icon="credit-card" />}
          />
          <Card.Content>
            {client.payment_terms && (
              <View style={styles.row}>
                <Text variant="bodyMedium">Délai de paiement:</Text>
                <Text variant="bodyMedium">{client.payment_terms} jours</Text>
              </View>
            )}
            {client.credit_limit > 0 && (
              <View style={[styles.row, { marginTop: Spacing.sm }]}>
                <Text variant="bodyMedium">Limite de crédit:</Text>
                <Text variant="bodyMedium">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(client.credit_limit)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Notes */}
      {client.notes && (
        <Card style={styles.card}>
          <Card.Title
            title="Notes"
            left={(props) => <List.Icon {...props} icon="text" />}
          />
          <Card.Content>
            <Text variant="bodyMedium">{client.notes}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Statistics */}
      {(client.total_invoices > 0 || client.total_amount > 0) && (
        <Card style={styles.card}>
          <Card.Title
            title="Statistiques"
            left={(props) => <List.Icon {...props} icon="chart-bar" />}
          />
          <Card.Content>
            {client.total_invoices > 0 && (
              <View style={styles.row}>
                <Text variant="bodyMedium">Nombre de factures:</Text>
                <Text variant="bodyMedium">{client.total_invoices}</Text>
              </View>
            )}
            {client.total_amount > 0 && (
              <View style={[styles.row, { marginTop: Spacing.sm }]}>
                <Text variant="bodyMedium">Montant total:</Text>
                <Text variant="bodyMedium" style={{ color: Colors.primary, fontWeight: '600' }}>
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(client.total_amount)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Dates */}
      <Card style={styles.card}>
        <Card.Title
          title="Dates"
          left={(props) => <List.Icon {...props} icon="calendar" />}
        />
        <Card.Content>
          {client.created_at && (
            <View style={styles.row}>
              <Text variant="bodyMedium">Date de création:</Text>
              <Text variant="bodyMedium">
                {new Date(client.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
          {client.updated_at && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">Dernière modification:</Text>
              <Text variant="bodyMedium">
                {new Date(client.updated_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleDelete}
          icon="delete"
          style={styles.actionButton}
          textColor={Colors.error}
        >
          Supprimer le client
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
  clientName: {
    fontWeight: '700',
    color: Colors.text,
  },
  secondaryText: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
});
