import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider, List, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';
import { useTranslation } from 'react-i18next';

export default function ProductDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.get(Number(id));
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert(t('common.error'), t('products.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      t('products.deleteProduct'),
      t('products.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await productsAPI.delete(Number(id));
              Alert.alert(t('common.success'), t('products.productDeleted'), [
                {
                  text: t('common.ok'),
                  onPress: () => router.back(),
                },
              ]);
            } catch (error) {
              Alert.alert(t('common.error'), t('products.errorDeleting'));
            }
          },
        },
      ]
    );
  };

  const getStockStatus = () => {
    if (!product) return { label: '-', color: Colors.disabled };

    const stock = product.stock_quantity || 0;
    const minStock = product.minimum_stock || 10;

    if (stock === 0) return { label: t('products.outOfStock'), color: Colors.error };
    if (stock <= minStock) return { label: t('products.lowStock'), color: Colors.warning };
    return { label: t('products.inStock'), color: Colors.success };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text>{t('products.notFound')}</Text>
      </View>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text variant="headlineSmall" style={styles.productName}>
                {product.name}
              </Text>
              {product.sku && (
                <Text variant="bodyMedium" style={styles.secondaryText}>
                  SKU: {product.sku}
                </Text>
              )}
              <Chip
                mode="flat"
                style={{ backgroundColor: stockStatus.color, marginTop: Spacing.sm }}
                textStyle={{ color: '#fff' }}
              >
                {stockStatus.label}
              </Chip>
            </View>
            <IconButton
              icon="pencil"
              size={24}
              onPress={() => router.push(`/products/${id}/edit`)}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Description */}
      {product.description && (
        <Card style={styles.card}>
          <Card.Title
            title={t('products.description')}
            left={(props) => <List.Icon {...props} icon="text" />}
          />
          <Card.Content>
            <Text variant="bodyMedium">{product.description}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Pricing */}
      <Card style={styles.card}>
        <Card.Title
          title={t('products.pricing')}
          left={(props) => <List.Icon {...props} icon="currency-eur" />}
        />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium">{t('products.unitPrice')}:</Text>
            <Text variant="titleMedium" style={styles.price}>
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(product.unit_price || 0)}
            </Text>
          </View>
          {product.tax_rate > 0 && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">{t('products.taxRate')}:</Text>
              <Text variant="bodyMedium">{product.tax_rate}%</Text>
            </View>
          )}
          {product.discount_percentage > 0 && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">{t('products.discountPercentage')}:</Text>
              <Text variant="bodyMedium" style={{ color: Colors.success }}>
                -{product.discount_percentage}%
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Stock Information */}
      <Card style={styles.card}>
        <Card.Title
          title={t('products.stockManagement')}
          left={(props) => <List.Icon {...props} icon="package-variant" />}
        />
        <Card.Content>
          <View style={styles.row}>
            <Text variant="bodyMedium">{t('products.stockQuantity')}:</Text>
            <Text variant="titleMedium" style={styles.stockValue}>
              {product.stock_quantity || 0} {t('common.units')}
            </Text>
          </View>
          <View style={[styles.row, { marginTop: Spacing.sm }]}>
            <Text variant="bodyMedium">{t('products.minimumStock')}:</Text>
            <Text variant="bodyMedium">{product.minimum_stock || 0} {t('common.units')}</Text>
          </View>
          {product.reorder_quantity > 0 && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">{t('products.reorderQuantity')}:</Text>
              <Text variant="bodyMedium">{product.reorder_quantity} {t('common.units')}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Category & Supplier */}
      <Card style={styles.card}>
        <Card.Title
          title={t('products.additionalInfo')}
          left={(props) => <List.Icon {...props} icon="information" />}
        />
        <Card.Content>
          {product.category && (
            <View style={styles.row}>
              <Text variant="bodyMedium">{t('products.category')}:</Text>
              <Text variant="bodyMedium">{product.category}</Text>
            </View>
          )}
          {product.supplier_name && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">{t('products.supplier')}:</Text>
              <Text variant="bodyMedium">{product.supplier_name}</Text>
            </View>
          )}
          {product.barcode && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">{t('products.barcode')}:</Text>
              <Text variant="bodyMedium">{product.barcode}</Text>
            </View>
          )}
          {product.location && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">{t('products.location')}:</Text>
              <Text variant="bodyMedium">{product.location}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Dimensions & Weight */}
      {(product.weight || product.length || product.width || product.height) && (
        <Card style={styles.card}>
          <Card.Title
            title={t('products.dimensionsWeight')}
            left={(props) => <List.Icon {...props} icon="package" />}
          />
          <Card.Content>
            {product.weight && (
              <View style={styles.row}>
                <Text variant="bodyMedium">{t('products.weight')}:</Text>
                <Text variant="bodyMedium">{product.weight} kg</Text>
              </View>
            )}
            {(product.length || product.width || product.height) && (
              <View style={[styles.row, { marginTop: Spacing.sm }]}>
                <Text variant="bodyMedium">{t('products.dimensions')}:</Text>
                <Text variant="bodyMedium">
                  {product.length || '-'} × {product.width || '-'} × {product.height || '-'} cm
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Dates */}
      <Card style={styles.card}>
        <Card.Title
          title={t('products.dates')}
          left={(props) => <List.Icon {...props} icon="calendar" />}
        />
        <Card.Content>
          {product.created_at && (
            <View style={styles.row}>
              <Text variant="bodyMedium">{t('products.createdAt')}:</Text>
              <Text variant="bodyMedium">
                {new Date(product.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
          {product.updated_at && (
            <View style={[styles.row, { marginTop: Spacing.sm }]}>
              <Text variant="bodyMedium">{t('products.updatedAt')}:</Text>
              <Text variant="bodyMedium">
                {new Date(product.updated_at).toLocaleDateString('fr-FR')}
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
          {t('products.deleteProduct')}
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
  productName: {
    fontWeight: '700',
    color: Colors.text,
  },
  secondaryText: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: Colors.primary,
    fontWeight: '700',
  },
  stockValue: {
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
