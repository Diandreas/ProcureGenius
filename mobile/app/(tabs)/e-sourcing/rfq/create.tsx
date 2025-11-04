import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, TextInput, List, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { suppliersAPI } from '../../../../services/api';
import { Colors, Spacing, Shadows } from '../../../../constants/theme';

const rfqAPI = { create: async (data: any) => {} };

export default function CreateRFQScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    rfq_number: `RFQ-${Date.now()}`,
    description: '',
    published_date: new Date(),
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    requirements: '',
  });
  const [showPublishDatePicker, setShowPublishDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list();
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleSupplier = (id: number) => {
    setSelectedSuppliers(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSave = async (status: 'draft' | 'open') => {
    if (!formData.title.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    if (status === 'open' && selectedSuppliers.length === 0) {
      Alert.alert('Erreur', 'Sélectionnez au moins un fournisseur');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        published_date: formData.published_date.toISOString().split('T')[0],
        deadline: formData.deadline.toISOString().split('T')[0],
        suppliers: selectedSuppliers,
        status,
      };

      await rfqAPI.create(payload);
      Alert.alert('Succès', status === 'draft' ? 'Demande sauvegardée' : 'Demande publiée', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Informations de base" left={(props) => <List.Icon {...props} icon="information" />} />
        <Card.Content>
          <TextInput label="Titre *" value={formData.title} onChangeText={v => setFormData({ ...formData, title: v })} mode="outlined" style={styles.input} />
          <TextInput label="Numéro RFQ" value={formData.rfq_number} onChangeText={v => setFormData({ ...formData, rfq_number: v })} mode="outlined" style={styles.input} />
          <TextInput label="Description" value={formData.description} onChangeText={v => setFormData({ ...formData, description: v })} mode="outlined" multiline numberOfLines={4} style={styles.input} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Dates" left={(props) => <List.Icon {...props} icon="calendar" />} />
        <Card.Content>
          <View style={styles.dateRow}>
            <Text variant="bodyMedium" style={styles.dateLabel}>Date de publication:</Text>
            <Button mode="outlined" onPress={() => setShowPublishDatePicker(true)} style={styles.dateButton}>
              {formData.published_date.toLocaleDateString('fr-FR')}
            </Button>
          </View>
          {showPublishDatePicker && <DateTimePicker value={formData.published_date} mode="date" onChange={(e, d) => { setShowPublishDatePicker(false); if (d) setFormData({ ...formData, published_date: d }); }} />}

          <View style={[styles.dateRow, { marginTop: Spacing.md }]}>
            <Text variant="bodyMedium" style={styles.dateLabel}>Date limite:</Text>
            <Button mode="outlined" onPress={() => setShowDeadlinePicker(true)} style={styles.dateButton}>
              {formData.deadline.toLocaleDateString('fr-FR')}
            </Button>
          </View>
          {showDeadlinePicker && <DateTimePicker value={formData.deadline} mode="date" onChange={(e, d) => { setShowDeadlinePicker(false); if (d) setFormData({ ...formData, deadline: d }); }} />}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Exigences" left={(props) => <List.Icon {...props} icon="clipboard-text" />} />
        <Card.Content>
          <TextInput label="Spécifications et exigences" value={formData.requirements} onChangeText={v => setFormData({ ...formData, requirements: v })} mode="outlined" multiline numberOfLines={6} style={styles.input} placeholder="Décrivez vos exigences techniques, quantités, délais..." />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title={`Fournisseurs (${selectedSuppliers.length} sélectionnés)`} left={(props) => <List.Icon {...props} icon="account-group" />} />
        <Card.Content>
          {suppliers.map(supplier => (
            <View key={supplier.id} style={styles.supplierRow}>
              <Checkbox.Item
                label={supplier.name}
                status={selectedSuppliers.includes(supplier.id) ? 'checked' : 'unchecked'}
                onPress={() => toggleSupplier(supplier.id)}
              />
            </View>
          ))}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="outlined" onPress={() => handleSave('draft')} disabled={loading} style={styles.actionButton}>
          Sauvegarder en brouillon
        </Button>
        <Button mode="contained" onPress={() => handleSave('open')} disabled={loading} loading={loading} style={styles.actionButton}>
          Publier la demande
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  input: { marginTop: Spacing.sm },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { flex: 1 },
  dateButton: { flex: 1 },
  supplierRow: { marginBottom: Spacing.xs },
  actions: { padding: Spacing.md, paddingBottom: Spacing.xl },
  actionButton: { marginBottom: Spacing.sm },
});
