import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, TextInput, List, Switch } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { suppliersAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

const contractsAPI = {
  get: async (id: number) => ({ data: null }),
  create: async (data: any) => {},
  update: async (id: number, data: any) => {}
};

export default function CreateContractScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    contract_number: '',
    supplier: null as number | null,
    value: '',
    start_date: new Date(),
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    renewal_date: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
    description: '',
    auto_renew: false,
    notification_days: '30',
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showRenewalDatePicker, setShowRenewalDatePicker] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchSuppliers();
    if (isEdit) fetchContract();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list();
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchContract = async () => {
    try {
      const response = await contractsAPI.get(Number(id));
      const contract = response.data;
      setFormData({
        name: contract.name || '',
        contract_number: contract.contract_number || '',
        supplier: contract.supplier || null,
        value: contract.value?.toString() || '',
        start_date: new Date(contract.start_date),
        end_date: new Date(contract.end_date),
        renewal_date: contract.renewal_date ? new Date(contract.renewal_date) : new Date(),
        description: contract.description || '',
        auto_renew: contract.auto_renew || false,
        notification_days: contract.notification_days?.toString() || '30',
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le contrat');
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const validate = () => {
    const newErrors: any = {};
    if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
    if (!formData.contract_number.trim()) newErrors.contract_number = 'Le numéro de contrat est requis';
    if (formData.start_date >= formData.end_date) newErrors.end_date = 'La date de fin doit être après la date de début';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        contract_number: formData.contract_number.trim(),
        supplier: formData.supplier,
        value: parseFloat(formData.value) || 0,
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date.toISOString().split('T')[0],
        renewal_date: formData.auto_renew ? formData.renewal_date.toISOString().split('T')[0] : null,
        description: formData.description.trim() || null,
        auto_renew: formData.auto_renew,
        notification_days: parseInt(formData.notification_days) || 30,
      };

      if (isEdit) {
        await contractsAPI.update(Number(id), payload);
        Alert.alert('Succès', 'Contrat mis à jour', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        await contractsAPI.create(payload);
        Alert.alert('Succès', 'Contrat créé', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le contrat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Informations de base" left={(props) => <List.Icon {...props} icon="information" />} />
        <Card.Content>
          <TextInput label="Nom du contrat *" value={formData.name} onChangeText={(v) => updateField('name', v)} mode="outlined" error={!!errors.name} style={styles.input} />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TextInput label="Numéro de contrat *" value={formData.contract_number} onChangeText={(v) => updateField('contract_number', v)} mode="outlined" error={!!errors.contract_number} style={styles.input} />
          {errors.contract_number && <Text style={styles.errorText}>{errors.contract_number}</Text>}

          <View style={styles.pickerContainer}>
            <Text variant="bodySmall" style={styles.label}>Fournisseur:</Text>
            <Picker selectedValue={formData.supplier} onValueChange={(v) => updateField('supplier', v)} style={styles.picker}>
              <Picker.Item label="Sélectionner un fournisseur" value={null} />
              {suppliers.map((s) => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
            </Picker>
          </View>

          <TextInput label="Valeur du contrat (€)" value={formData.value} onChangeText={(v) => updateField('value', v)} keyboardType="decimal-pad" mode="outlined" style={styles.input} />

          <TextInput label="Description" value={formData.description} onChangeText={(v) => updateField('description', v)} mode="outlined" multiline numberOfLines={4} style={styles.input} />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Dates" left={(props) => <List.Icon {...props} icon="calendar" />} />
        <Card.Content>
          <View style={styles.dateRow}>
            <Text variant="bodyMedium" style={styles.dateLabel}>Date de début:</Text>
            <Button mode="outlined" onPress={() => setShowStartDatePicker(true)} style={styles.dateButton}>{formData.start_date.toLocaleDateString('fr-FR')}</Button>
          </View>
          {showStartDatePicker && <DateTimePicker value={formData.start_date} mode="date" onChange={(e, d) => { setShowStartDatePicker(false); if (d) updateField('start_date', d); }} />}

          <View style={[styles.dateRow, { marginTop: Spacing.md }]}>
            <Text variant="bodyMedium" style={styles.dateLabel}>Date de fin:</Text>
            <Button mode="outlined" onPress={() => setShowEndDatePicker(true)} style={styles.dateButton}>{formData.end_date.toLocaleDateString('fr-FR')}</Button>
          </View>
          {showEndDatePicker && <DateTimePicker value={formData.end_date} mode="date" onChange={(e, d) => { setShowEndDatePicker(false); if (d) updateField('end_date', d); }} />}
          {errors.end_date && <Text style={styles.errorText}>{errors.end_date}</Text>}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Options de renouvellement" left={(props) => <List.Icon {...props} icon="autorenew" />} />
        <Card.Content>
          <View style={styles.switchRow}>
            <Text variant="bodyMedium">Renouvellement automatique</Text>
            <Switch value={formData.auto_renew} onValueChange={(v) => updateField('auto_renew', v)} />
          </View>

          {formData.auto_renew && (
            <>
              <View style={[styles.dateRow, { marginTop: Spacing.md }]}>
                <Text variant="bodyMedium" style={styles.dateLabel}>Date de renouvellement:</Text>
                <Button mode="outlined" onPress={() => setShowRenewalDatePicker(true)} style={styles.dateButton}>{formData.renewal_date.toLocaleDateString('fr-FR')}</Button>
              </View>
              {showRenewalDatePicker && <DateTimePicker value={formData.renewal_date} mode="date" onChange={(e, d) => { setShowRenewalDatePicker(false); if (d) updateField('renewal_date', d); }} />}
            </>
          )}

          <TextInput label="Notification avant expiration (jours)" value={formData.notification_days} onChangeText={(v) => updateField('notification_days', v)} keyboardType="numeric" mode="outlined" style={styles.input} />
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button mode="outlined" onPress={() => router.back()} disabled={loading} style={styles.actionButton}>Annuler</Button>
        <Button mode="contained" onPress={handleSave} disabled={loading} loading={loading} style={styles.actionButton}>
          {isEdit ? 'Mettre à jour' : 'Créer le contrat'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  input: { marginTop: Spacing.sm },
  pickerContainer: { marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  picker: { height: 50 },
  label: { marginTop: Spacing.sm, marginLeft: Spacing.sm, color: Colors.textSecondary },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { flex: 1 },
  dateButton: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  errorText: { color: Colors.error, fontSize: 12, marginTop: Spacing.xs, marginLeft: Spacing.sm },
  actions: { padding: Spacing.md, paddingBottom: Spacing.xl },
  actionButton: { marginBottom: Spacing.sm },
});
