import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, TextInput, List, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { purchaseOrdersAPI, suppliersAPI, productsAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function CreatePurchaseOrderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [orderDate, setOrderDate] = useState(new Date());
  const [deliveryDate, setDeliveryDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list();
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.list();
      setProducts(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addItem = () => {
    if (products.length === 0) return;
    const firstProduct = products[0];
    setItems([...items, { product_id: firstProduct.id, product_name: firstProduct.name, quantity: 1, unit_price: parseFloat(firstProduct.unit_price || 0) }]);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      if (product) {
        updatedItems[index] = { ...updatedItems[index], product_id: product.id, product_name: product.name, unit_price: parseFloat(product.unit_price || 0) };
      }
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }
    setItems(updatedItems);
  };

  const calculateTotal = () => items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!selectedSupplier || items.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner un fournisseur et ajouter des articles');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        supplier: selectedSupplier,
        order_date: orderDate.toISOString().split('T')[0],
        expected_delivery_date: deliveryDate.toISOString().split('T')[0],
        status,
        total_amount: calculateTotal(),
        notes,
        items: items.map((item) => ({ product: item.product_id, quantity: item.quantity, unit_price: item.unit_price })),
      };

      await purchaseOrdersAPI.create(payload);
      Alert.alert('Succès', status === 'draft' ? 'Bon de commande enregistré' : 'Bon de commande créé et envoyé', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de créer le bon de commande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Fournisseur" left={(props) => <List.Icon {...props} icon="truck" />} />
        <Card.Content>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedSupplier} onValueChange={setSelectedSupplier} style={styles.picker}>
              <Picker.Item label="Sélectionner un fournisseur" value={null} />
              {suppliers.map((s) => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
            </Picker>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Dates" left={(props) => <List.Icon {...props} icon="calendar" />} />
        <Card.Content>
          <View style={styles.dateRow}>
            <Text variant="bodyMedium" style={styles.dateLabel}>Date de commande:</Text>
            <Button mode="outlined" onPress={() => setShowOrderDatePicker(true)} style={styles.dateButton}>{orderDate.toLocaleDateString('fr-FR')}</Button>
          </View>
          {showOrderDatePicker && <DateTimePicker value={orderDate} mode="date" onChange={(e, d) => { setShowOrderDatePicker(false); if (d) setOrderDate(d); }} />}
          <View style={[styles.dateRow, { marginTop: Spacing.md }]}>
            <Text variant="bodyMedium" style={styles.dateLabel}>Livraison prévue:</Text>
            <Button mode="outlined" onPress={() => setShowDeliveryDatePicker(true)} style={styles.dateButton}>{deliveryDate.toLocaleDateString('fr-FR')}</Button>
          </View>
          {showDeliveryDatePicker && <DateTimePicker value={deliveryDate} mode="date" onChange={(e, d) => { setShowDeliveryDatePicker(false); if (d) setDeliveryDate(d); }} />}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Articles" left={(props) => <List.Icon {...props} icon="format-list-bulleted" />} right={(props) => <IconButton {...props} icon="plus" onPress={addItem} />} />
        <Card.Content>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>Aucun article ajouté</Text>
          ) : (
            items.map((item, index) => (
              <View key={index} style={index > 0 ? { marginTop: Spacing.md } : {}}>
                <View style={styles.itemHeader}>
                  <Text variant="titleSmall">Article {index + 1}</Text>
                  <IconButton icon="delete" size={20} onPress={() => removeItem(index)} />
                </View>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={item.product_id} onValueChange={(v) => updateItem(index, 'product_id', v)} style={styles.picker}>
                    {products.map((p) => <Picker.Item key={p.id} label={p.name} value={p.id} />)}
                  </Picker>
                </View>
                <View style={styles.row}>
                  <TextInput label="Quantité" value={item.quantity.toString()} onChangeText={(v) => updateItem(index, 'quantity', parseFloat(v) || 0)} keyboardType="numeric" mode="outlined" style={[styles.input, styles.halfInput]} />
                  <TextInput label="Prix unitaire" value={item.unit_price.toString()} onChangeText={(v) => updateItem(index, 'unit_price', parseFloat(v) || 0)} keyboardType="decimal-pad" mode="outlined" style={[styles.input, styles.halfInput]} />
                </View>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Total" left={(props) => <List.Icon {...props} icon="calculator" />} />
        <Card.Content>
          <Text variant="headlineMedium" style={styles.total}>
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(calculateTotal())}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="outlined" onPress={() => handleSave('draft')} disabled={loading} style={styles.actionButton}>Enregistrer en brouillon</Button>
        <Button mode="contained" onPress={() => handleSave('sent')} disabled={loading} loading={loading} style={styles.actionButton}>Créer et envoyer</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  pickerContainer: { borderWidth: 1, borderColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  picker: { height: 50 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { flex: 1 },
  dateButton: { flex: 1 },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, paddingVertical: Spacing.lg },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  input: { marginTop: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  halfInput: { flex: 1 },
  total: { color: Colors.primary, fontWeight: '700' },
  actions: { padding: Spacing.md, paddingBottom: Spacing.xl },
  actionButton: { marginBottom: Spacing.sm },
});
