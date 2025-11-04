import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Card, Button, Chip, Divider, List, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { suppliersAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const response = await suppliersAPI.get(Number(id));
      setSupplier(response.data);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      Alert.alert('Erreur', 'Impossible de charger le fournisseur');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Supprimer le fournisseur',
      'Êtes-vous sûr de vouloir supprimer ce fournisseur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await suppliersAPI.delete(Number(id));
              Alert.alert('Succès', 'Fournisseur supprimé', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le fournisseur');
            }
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (supplier?.phone) {
      Linking.openURL(`tel:${supplier.phone}`);
    }
  };

  const handleEmail = () => {
    if (supplier?.email) {
      Linking.openURL(`mailto:${supplier.email}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (!supplier) {
    return (
      <View style={styles.container}>
        <Text>Fournisseur introuvable</Text>
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
              <Text variant="headlineSmall" style={styles.supplierName}>
                {supplier.name}
              </Text>
              {supplier.company && (
                <Text variant="bodyMedium" style={styles.secondaryText}>
                  {supplier.company}
                </Text>
              )}
              <Chip
                mode="flat"
                style={{
                  backgroundColor: supplier.is_active !== false ? Colors.success : Colors.disabled,
                  marginTop: Spacing.sm,
                }}
                textStyle={{ color: '#fff' }}
              >
                {supplier.is_active !== false ? 'Actif' : 'Inactif'}
              </Chip>
            </View>
            <IconButton
              icon="pencil"
              size={24}
              onPress={() => router.push(`/suppliers/${id}/edit`)}
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
          {supplier.email && (
            <View style={styles.contactRow}>
              <MaterialCommunityIcons name="email" size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text variant="bodyMedium">{supplier.email}</Text>
                <Button mode="text" onPress={handleEmail} compact>
                  Envoyer un email
                </Button>
              </View>
            </View>
          )}

          {supplier.phone && (
            <View style={[styles.contactRow, { marginTop: Spacing.md }]}>
              <MaterialCommunityIcons name="phone" size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text variant="bodyMedium">{supplier.phone}</Text>
                <Button mode="text" onPress={handleCall} compact>
                  Appeler
                </Button>
              </View>
            </View>
          )}

          {supplier.website && (
            <View style={[styles.contactRow, { marginTop: Spacing.md }]}>
              <MaterialCommunityIcons name="web" size={20} color={Colors.primary} />
              <View style={styles.contactInfo}>
                <Text variant="bodyMedium">{supplier.website}</Text>
                <Button
                  mode="text"
                  onPress={() => Linking.openURL(supplier.website)}
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
      {(supplier.address || supplier.city || supplier.postal_code || supplier.country) && (
        <Card style={styles.card}>
          <Card.Title
            title="Adresse"
            left={(props) => <List.Icon {...props} icon="map-marker" />}
          />
          <Card.Content>
            {supplier.address && (
              <Text variant="bodyMedium">{supplier.address}</Text>
            )}
            {(supplier.city || supplier.postal_code) && (
              <Text variant="bodyMedium" style={{ marginTop: Spacing.xs }}>
                {supplier.postal_code} {supplier.city}
              </Text>
            )}
            {supplier.country && (
              <Text variant="bodyMedium" style={{ marginTop: Spacing.xs }}>
                {supplier.country}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Category & Details */}
      {(supplier.category || supplier.tax_id || supplier.vat_number) && (
        <Card style={styles.card}>
          <Card.Title
            title="Informations complémentaires"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <Card.Content>
            {supplier.category && (
              <View style={styles.row}>
                <Text variant="bodyMedium">Catégorie:</Text>
                <Text variant="bodyMedium">{supplier.category}</Text>
              </View>
            )}
            {supplier.tax_id && (
              <View style={[styles.row, { marginTop: Spacing.sm }]}>
                <Text variant="bodyMedium">Numéro fiscal:</Text>
                <Text variant="bodyMedium">{supplier.tax_id}</Text>
              </View>
            )}
            {supplier.vat_number && (
              <View style={[styles.row, { marginTop: Spacing.sm }]}>
                <Text variant="bodyMedium">Numéro de TVA:</Text>
                <Text variant="bodyMedium">{supplier.vat_number}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Payment Terms */}
      {supplier.payment_terms && (
        <Card style={styles.card}>
          <Card.Title
            title="Conditions de paiement"
            left={(props) => <List.Icon {...props} icon="credit-card" />}
          />
          <Card.Content>
            <View style={styles.row}>
              <Text variant="bodyMedium">Délai de paiement:</Text>
              <Text variant="bodyMedium">{supplier.payment_terms} jours</Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Notes */}
      {supplier.notes && (
        <Card style={styles.card}>
          <Card.Title
            title="Notes"
            left={(props) => <List.Icon {...props} icon="text" />}
          />
          <Card.Content>
            <Text variant="bodyMedium">{supplier.notes}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Statistics */}
      {(supplier.total_products > 0 || supplier.total_purchases > 0) && (
        <Card style={styles.card}>
          <Card.Title
            title="Statistiques"
            left={(props) => <List.Icon {...props} icon="chart-bar" />}
          />
          <Card.Content>
            {supplier.total_products > 0 && (
              <View style={styles.row}>
                <Text variant="bodyMedium">Nombre de produits:</Text>
                <Text variant="bodyMedium">{supplier.total_products}</Text>
              </View>
            )}
            {supplier.total_purchases > 0 && (
              <View style={[styles.row, { marginTop: Spacing.sm }]}>
                <Text variant="bodyMedium">Nombre d'achats:</Text>
                <Text variant="bodyMedium">{supplier.total_purchases}</Text>
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
          {supplier.created_at && (
            <View style={styles.row}>
              <Text variant="bodyMedium">Date de création:</Text>
              <Text variant="bodyMedium">
                {new Date(supplier.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
          {supplier.updated_at && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">Dernière modification:</Text>
              <Text variant="bodyMedium">
                {new Date(supplier.updated_at).toLocaleDateString('fr-FR')}
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
          Supprimer le fournisseur
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
  supplierName: {
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
