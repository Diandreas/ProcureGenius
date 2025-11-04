import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, TextInput, List, Switch } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { suppliersAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

const categories = [
  'Électronique',
  'Mobilier',
  'Fournitures',
  'Équipement',
  'Logiciel',
  'Services',
  'Matières premières',
  'Autre',
];

export default function CreateSupplierScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    category: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    tax_id: '',
    vat_number: '',
    payment_terms: '30',
    notes: '',
    is_active: true,
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (isEdit) {
      fetchSupplier();
    }
  }, []);

  const fetchSupplier = async () => {
    try {
      const response = await suppliersAPI.get(Number(id));
      const supplier = response.data;
      setFormData({
        name: supplier.name || '',
        company: supplier.company || '',
        category: supplier.category || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        website: supplier.website || '',
        address: supplier.address || '',
        city: supplier.city || '',
        postal_code: supplier.postal_code || '',
        country: supplier.country || 'France',
        tax_id: supplier.tax_id || '',
        vat_number: supplier.vat_number || '',
        payment_terms: supplier.payment_terms?.toString() || '30',
        notes: supplier.notes || '',
        is_active: supplier.is_active !== false,
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      Alert.alert('Erreur', 'Impossible de charger le fournisseur');
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validate = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

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
        company: formData.company.trim() || null,
        category: formData.category || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        website: formData.website.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        country: formData.country.trim() || null,
        tax_id: formData.tax_id.trim() || null,
        vat_number: formData.vat_number.trim() || null,
        payment_terms: parseInt(formData.payment_terms) || 30,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
      };

      if (isEdit) {
        await suppliersAPI.update(Number(id), payload);
        Alert.alert('Succès', 'Fournisseur mis à jour', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        await suppliersAPI.create(payload);
        Alert.alert('Succès', 'Fournisseur créé', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      Alert.alert('Erreur', error.response?.data?.message || 'Impossible de sauvegarder le fournisseur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Basic Information */}
      <Card style={styles.card}>
        <Card.Title
          title="Informations de base"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
        <Card.Content>
          <TextInput
            label="Nom du fournisseur *"
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            mode="outlined"
            error={!!errors.name}
            style={styles.input}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TextInput
            label="Société"
            value={formData.company}
            onChangeText={(value) => updateField('company', value)}
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.pickerContainer}>
            <Text variant="bodySmall" style={styles.label}>
              Catégorie:
            </Text>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => updateField('category', value)}
              style={styles.picker}
            >
              <Picker.Item label="Sélectionner une catégorie" value="" />
              {categories.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          <View style={styles.switchRow}>
            <Text variant="bodyMedium">Fournisseur actif</Text>
            <Switch
              value={formData.is_active}
              onValueChange={(value) => updateField('is_active', value)}
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
          <TextInput
            label="Email"
            value={formData.email}
            onChangeText={(value) => updateField('email', value)}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            error={!!errors.email}
            style={styles.input}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <TextInput
            label="Téléphone"
            value={formData.phone}
            onChangeText={(value) => updateField('phone', value)}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />

          <TextInput
            label="Site web"
            value={formData.website}
            onChangeText={(value) => updateField('website', value)}
            mode="outlined"
            keyboardType="url"
            autoCapitalize="none"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Address */}
      <Card style={styles.card}>
        <Card.Title
          title="Adresse"
          left={(props) => <List.Icon {...props} icon="map-marker" />}
        />
        <Card.Content>
          <TextInput
            label="Adresse"
            value={formData.address}
            onChangeText={(value) => updateField('address', value)}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
          />

          <View style={styles.row}>
            <TextInput
              label="Code postal"
              value={formData.postal_code}
              onChangeText={(value) => updateField('postal_code', value)}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, styles.thirdInput]}
            />
            <TextInput
              label="Ville"
              value={formData.city}
              onChangeText={(value) => updateField('city', value)}
              mode="outlined"
              style={[styles.input, styles.twoThirdsInput]}
            />
          </View>

          <TextInput
            label="Pays"
            value={formData.country}
            onChangeText={(value) => updateField('country', value)}
            mode="outlined"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Tax Information */}
      <Card style={styles.card}>
        <Card.Title
          title="Informations fiscales"
          left={(props) => <List.Icon {...props} icon="file-document" />}
        />
        <Card.Content>
          <TextInput
            label="Numéro fiscal"
            value={formData.tax_id}
            onChangeText={(value) => updateField('tax_id', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Numéro de TVA"
            value={formData.vat_number}
            onChangeText={(value) => updateField('vat_number', value)}
            mode="outlined"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Payment Terms */}
      <Card style={styles.card}>
        <Card.Title
          title="Conditions de paiement"
          left={(props) => <List.Icon {...props} icon="credit-card" />}
        />
        <Card.Content>
          <TextInput
            label="Délai de paiement (jours)"
            value={formData.payment_terms}
            onChangeText={(value) => updateField('payment_terms', value)}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
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
            value={formData.notes}
            onChangeText={(value) => updateField('notes', value)}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="Notes additionnelles..."
          />
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          disabled={loading}
          style={styles.actionButton}
        >
          Annuler
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={loading}
          loading={loading}
          style={styles.actionButton}
        >
          {isEdit ? 'Mettre à jour' : 'Créer le fournisseur'}
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
  input: {
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  thirdInput: {
    flex: 1,
  },
  twoThirdsInput: {
    flex: 2,
  },
  pickerContainer: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  label: {
    marginTop: Spacing.sm,
    marginLeft: Spacing.sm,
    color: Colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  actions: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
});
