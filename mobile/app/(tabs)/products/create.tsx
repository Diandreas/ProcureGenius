import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, TextInput, List } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { productsAPI, suppliersAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';
import { useTranslation } from 'react-i18next';

export default function CreateProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const categories = [
    t('products.categories.electronics'),
    t('products.categories.furniture'),
    t('products.categories.supplies'),
    t('products.categories.equipment'),
    t('products.categories.software'),
    t('products.categories.services'),
    t('products.categories.other'),
  ];
  const { id } = useLocalSearchParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    supplier: null as number | null,
    unit_price: '',
    tax_rate: '20',
    discount_percentage: '',
    stock_quantity: '',
    minimum_stock: '10',
    reorder_quantity: '',
    barcode: '',
    location: '',
    weight: '',
    length: '',
    width: '',
    height: '',
  });

  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchSuppliers();
    if (isEdit) {
      fetchProduct();
    }
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list();
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.get(Number(id));
      const product = response.data;
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category: product.category || '',
        supplier: product.supplier || null,
        unit_price: product.unit_price?.toString() || '',
        tax_rate: product.tax_rate?.toString() || '20',
        discount_percentage: product.discount_percentage?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        minimum_stock: product.minimum_stock?.toString() || '10',
        reorder_quantity: product.reorder_quantity?.toString() || '',
        barcode: product.barcode || '',
        location: product.location || '',
        weight: product.weight?.toString() || '',
        length: product.length?.toString() || '',
        width: product.width?.toString() || '',
        height: product.height?.toString() || '',
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert(t('common.error'), t('products.errorLoading'));
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
      newErrors.name = t('products.nameRequired');
    }

    if (!formData.unit_price || parseFloat(formData.unit_price) < 0) {
      newErrors.unit_price = t('products.pricePositive');
    }

    if (formData.stock_quantity && parseFloat(formData.stock_quantity) < 0) {
      newErrors.stock_quantity = t('products.stockNonNegative');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert(t('common.error'), t('products.form.correctErrors'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category || null,
        supplier: formData.supplier,
        unit_price: parseFloat(formData.unit_price),
        tax_rate: parseFloat(formData.tax_rate) || 0,
        discount_percentage: parseFloat(formData.discount_percentage) || 0,
        stock_quantity: parseFloat(formData.stock_quantity) || 0,
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
        reorder_quantity: parseFloat(formData.reorder_quantity) || 0,
        barcode: formData.barcode.trim() || null,
        location: formData.location.trim() || null,
        weight: parseFloat(formData.weight) || null,
        length: parseFloat(formData.length) || null,
        width: parseFloat(formData.width) || null,
        height: parseFloat(formData.height) || null,
      };

      if (isEdit) {
        await productsAPI.update(Number(id), payload);
        Alert.alert(t('common.success'), t('products.productUpdated'), [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]);
      } else {
        await productsAPI.create(payload);
        Alert.alert(t('common.success'), t('products.productCreated'), [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      Alert.alert(t('common.error'), error.response?.data?.message || t('products.errorCreating'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Basic Information */}
      <Card style={styles.card}>
        <Card.Title
          title={t('products.basicInfo')}
          left={(props) => <List.Icon {...props} icon="information" />}
        />
        <Card.Content>
          <TextInput
            label={t('products.form.nameLabel')}
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            mode="outlined"
            error={!!errors.name}
            style={styles.input}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <TextInput
            label={t('products.form.skuLabel')}
            value={formData.sku}
            onChangeText={(value) => updateField('sku', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label={t('products.form.descriptionLabel')}
            value={formData.description}
            onChangeText={(value) => updateField('description', value)}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <View style={styles.pickerContainer}>
            <Text variant="bodySmall" style={styles.label}>
              {t('products.form.categoryLabel')}
            </Text>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => updateField('category', value)}
              style={styles.picker}
            >
              <Picker.Item label={t('products.selectCategory')} value="" />
              {categories.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Text variant="bodySmall" style={styles.label}>
              {t('products.form.supplierLabel')}
            </Text>
            <Picker
              selectedValue={formData.supplier}
              onValueChange={(value) => updateField('supplier', value)}
              style={styles.picker}
            >
              <Picker.Item label={t('products.selectSupplier')} value={null} />
              {suppliers.map((supplier) => (
                <Picker.Item key={supplier.id} label={supplier.name} value={supplier.id} />
              ))}
            </Picker>
          </View>
        </Card.Content>
      </Card>

      {/* Pricing */}
      <Card style={styles.card}>
        <Card.Title
          title={t('products.pricing')}
          left={(props) => <List.Icon {...props} icon="currency-eur" />}
        />
        <Card.Content>
          <TextInput
            label={t('products.form.unitPriceLabel')}
            value={formData.unit_price}
            onChangeText={(value) => updateField('unit_price', value)}
            keyboardType="decimal-pad"
            mode="outlined"
            error={!!errors.unit_price}
            style={styles.input}
          />
          {errors.unit_price && <Text style={styles.errorText}>{errors.unit_price}</Text>}

          <View style={styles.row}>
            <TextInput
              label={t('products.form.taxRateLabel')}
              value={formData.tax_rate}
              onChangeText={(value) => updateField('tax_rate', value)}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              label={t('products.form.discountLabel')}
              value={formData.discount_percentage}
              onChangeText={(value) => updateField('discount_percentage', value)}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.input, styles.halfInput]}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Stock */}
      <Card style={styles.card}>
        <Card.Title
          title={t('products.stockManagement')}
          left={(props) => <List.Icon {...props} icon="package-variant" />}
        />
        <Card.Content>
          <TextInput
            label={t('products.form.stockQuantityLabel')}
            value={formData.stock_quantity}
            onChangeText={(value) => updateField('stock_quantity', value)}
            keyboardType="numeric"
            mode="outlined"
            error={!!errors.stock_quantity}
            style={styles.input}
          />
          {errors.stock_quantity && <Text style={styles.errorText}>{errors.stock_quantity}</Text>}

          <View style={styles.row}>
            <TextInput
              label={t('products.form.minimumStockLabel')}
              value={formData.minimum_stock}
              onChangeText={(value) => updateField('minimum_stock', value)}
              keyboardType="numeric"
              mode="outlined"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              label={t('products.form.reorderQuantityLabel')}
              value={formData.reorder_quantity}
              onChangeText={(value) => updateField('reorder_quantity', value)}
              keyboardType="numeric"
              mode="outlined"
              style={[styles.input, styles.halfInput]}
            />
          </View>

          <TextInput
            label={t('products.form.barcodeLabel')}
            value={formData.barcode}
            onChangeText={(value) => updateField('barcode', value)}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label={t('products.form.locationLabel')}
            value={formData.location}
            onChangeText={(value) => updateField('location', value)}
            mode="outlined"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      {/* Dimensions */}
      <Card style={styles.card}>
        <Card.Title
          title={t('products.dimensionsWeight')}
          left={(props) => <List.Icon {...props} icon="package" />}
        />
        <Card.Content>
          <TextInput
            label={t('products.form.weightLabel')}
            value={formData.weight}
            onChangeText={(value) => updateField('weight', value)}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.row}>
            <TextInput
              label={t('products.form.lengthLabel')}
              value={formData.length}
              onChangeText={(value) => updateField('length', value)}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.input, styles.thirdInput]}
            />
            <TextInput
              label={t('products.form.widthLabel')}
              value={formData.width}
              onChangeText={(value) => updateField('width', value)}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.input, styles.thirdInput]}
            />
            <TextInput
              label={t('products.form.heightLabel')}
              value={formData.height}
              onChangeText={(value) => updateField('height', value)}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.input, styles.thirdInput]}
            />
          </View>
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
          {t('common.cancel')}
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={loading}
          loading={loading}
          style={styles.actionButton}
        >
          {isEdit ? t('products.form.updateButton') : t('products.form.createButton')}
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
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
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
