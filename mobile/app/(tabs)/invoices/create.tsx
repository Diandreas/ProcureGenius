import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, TextInput, List, Divider, IconButton, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { invoicesAPI, clientsAPI, productsAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

interface InvoiceItem {
  product_id: number;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Form state
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [issueDate, setIssueDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchClients();
    fetchProducts();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.list();
      setClients(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      Alert.alert('Erreur', 'Impossible de charger les clients');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.list();
      setProducts(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Erreur', 'Impossible de charger les produits');
    }
  };

  const addItem = () => {
    if (products.length === 0) {
      Alert.alert('Erreur', 'Aucun produit disponible');
      return;
    }

    const firstProduct = products[0];
    setItems([
      ...items,
      {
        product_id: firstProduct.id,
        product_name: firstProduct.name,
        description: firstProduct.description || '',
        quantity: 1,
        unit_price: parseFloat(firstProduct.unit_price || 0),
        tax_rate: parseFloat(firstProduct.tax_rate || 20),
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items];
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      if (product) {
        updatedItems[index] = {
          ...updatedItems[index],
          product_id: product.id,
          product_name: product.name,
          description: product.description || '',
          unit_price: parseFloat(product.unit_price || 0),
          tax_rate: parseFloat(product.tax_rate || 20),
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxAmount = items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate) / 100,
      0
    );
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!selectedClient) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Erreur', 'Veuillez ajouter au moins un article');
      return;
    }

    setLoading(true);
    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      const payload = {
        client: selectedClient,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        notes,
        items: items.map((item) => ({
          product: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
        })),
      };

      await invoicesAPI.create(payload);
      Alert.alert(
        'Succès',
        status === 'draft' ? 'Facture enregistrée en brouillon' : 'Facture créée et envoyée',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible de créer la facture');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <ScrollView style={styles.container}>
      {/* Client Selection */}
      <Card style={styles.card}>
        <Card.Title
          title="Client"
          left={(props) => <List.Icon {...props} icon="account" />}
        />
        <Card.Content>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedClient}
              onValueChange={(value) => setSelectedClient(value)}
              style={styles.picker}
            >
              <Picker.Item label="Sélectionner un client" value={null} />
              {clients.map((client) => (
                <Picker.Item key={client.id} label={client.name} value={client.id} />
              ))}
            </Picker>
          </View>
        </Card.Content>
      </Card>

      {/* Dates */}
      <Card style={styles.card}>
        <Card.Title
          title="Dates"
          left={(props) => <List.Icon {...props} icon="calendar" />}
        />
        <Card.Content>
          <View style={styles.dateRow}>
            <Text variant="bodyMedium" style={styles.dateLabel}>
              Date d'émission:
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowIssueDatePicker(true)}
              style={styles.dateButton}
            >
              {issueDate.toLocaleDateString('fr-FR')}
            </Button>
          </View>
          {showIssueDatePicker && (
            <DateTimePicker
              value={issueDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowIssueDatePicker(false);
                if (date) setIssueDate(date);
              }}
            />
          )}
          <View style={[styles.dateRow, { marginTop: Spacing.md }]}>
            <Text variant="bodyMedium" style={styles.dateLabel}>
              Date d'échéance:
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowDueDatePicker(true)}
              style={styles.dateButton}
            >
              {dueDate.toLocaleDateString('fr-FR')}
            </Button>
          </View>
          {showDueDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDueDatePicker(false);
                if (date) setDueDate(date);
              }}
            />
          )}
        </Card.Content>
      </Card>

      {/* Items */}
      <Card style={styles.card}>
        <Card.Title
          title="Articles"
          left={(props) => <List.Icon {...props} icon="format-list-bulleted" />}
          right={(props) => (
            <IconButton {...props} icon="plus" onPress={addItem} />
          )}
        />
        <Card.Content>
          {items.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              Aucun article ajouté
            </Text>
          ) : (
            items.map((item, index) => (
              <View key={index}>
                {index > 0 && <Divider style={styles.divider} />}
                <View style={styles.itemContainer}>
                  <View style={styles.itemHeader}>
                    <Text variant="titleSmall">Article {index + 1}</Text>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => removeItem(index)}
                    />
                  </View>

                  <View style={styles.pickerContainer}>
                    <Text variant="bodySmall" style={styles.label}>
                      Produit:
                    </Text>
                    <Picker
                      selectedValue={item.product_id}
                      onValueChange={(value) => updateItem(index, 'product_id', value)}
                      style={styles.picker}
                    >
                      {products.map((product) => (
                        <Picker.Item key={product.id} label={product.name} value={product.id} />
                      ))}
                    </Picker>
                  </View>

                  <TextInput
                    label="Description"
                    value={item.description}
                    onChangeText={(value) => updateItem(index, 'description', value)}
                    mode="outlined"
                    multiline
                    style={styles.input}
                  />

                  <View style={styles.row}>
                    <TextInput
                      label="Quantité"
                      value={item.quantity.toString()}
                      onChangeText={(value) =>
                        updateItem(index, 'quantity', parseFloat(value) || 0)
                      }
                      keyboardType="numeric"
                      mode="outlined"
                      style={[styles.input, styles.halfInput]}
                    />
                    <TextInput
                      label="Prix unitaire"
                      value={item.unit_price.toString()}
                      onChangeText={(value) =>
                        updateItem(index, 'unit_price', parseFloat(value) || 0)
                      }
                      keyboardType="decimal-pad"
                      mode="outlined"
                      style={[styles.input, styles.halfInput]}
                    />
                  </View>

                  <TextInput
                    label="TVA (%)"
                    value={item.tax_rate.toString()}
                    onChangeText={(value) =>
                      updateItem(index, 'tax_rate', parseFloat(value) || 0)
                    }
                    keyboardType="decimal-pad"
                    mode="outlined"
                    style={styles.input}
                  />

                  <View style={styles.itemTotal}>
                    <Text variant="bodyMedium">Total:</Text>
                    <Text variant="titleMedium" style={styles.itemTotalAmount}>
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(item.quantity * item.unit_price)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Notes */}
      <Card style={styles.card}>
        <Card.Title
          title="Notes"
          left={(props) => <List.Icon {...props} icon="text" />}
        />
        <Card.Content>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="Notes additionnelles..."
          />
        </Card.Content>
      </Card>

      {/* Totals */}
      <Card style={styles.card}>
        <Card.Title
          title="Total"
          left={(props) => <List.Icon {...props} icon="calculator" />}
        />
        <Card.Content>
          <View style={styles.totalRow}>
            <Text variant="bodyMedium">Sous-total:</Text>
            <Text variant="bodyMedium">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text variant="bodyMedium">TVA:</Text>
            <Text variant="bodyMedium">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(taxAmount)}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text variant="titleLarge" style={styles.totalLabel}>
              Total:
            </Text>
            <Text variant="titleLarge" style={styles.totalAmount}>
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(total)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => handleSave('draft')}
          disabled={loading}
          style={styles.actionButton}
        >
          Enregistrer en brouillon
        </Button>
        <Button
          mode="contained"
          onPress={() => handleSave('sent')}
          disabled={loading}
          loading={loading}
          style={styles.actionButton}
        >
          Créer et envoyer
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    flex: 1,
  },
  dateButton: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    paddingVertical: Spacing.lg,
  },
  itemContainer: {
    paddingVertical: Spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    marginBottom: Spacing.xs,
    color: Colors.textSecondary,
  },
  input: {
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  itemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemTotalAmount: {
    fontWeight: '600',
    color: Colors.primary,
  },
  divider: {
    marginVertical: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  totalLabel: {
    fontWeight: '700',
  },
  totalAmount: {
    fontWeight: '700',
    color: Colors.primary,
  },
  actions: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
});
