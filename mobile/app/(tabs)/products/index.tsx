import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, FAB, Avatar, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { productsAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';
import { useTranslation } from 'react-i18next';

export default function ProductsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, activeFilter, products]);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.list();
      const data = response.data.results || response.data;
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  const filterProducts = () => {
    let filtered = products;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply stock filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((product) => {
        const stock = product.stock_quantity || 0;
        const minStock = product.minimum_stock || 10;

        if (activeFilter === 'in_stock') {
          return stock > minStock;
        } else if (activeFilter === 'low_stock') {
          return stock > 0 && stock <= minStock;
        } else if (activeFilter === 'out_of_stock') {
          return stock === 0;
        }
        return true;
      });
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (product: any) => {
    const stock = product.stock_quantity || 0;
    const minStock = product.minimum_stock || 10;

    if (stock === 0) return { label: t('products.stockOf'), color: Colors.error };
    if (stock <= minStock) return { label: t('products.lowStock'), color: Colors.warning };
    return { label: t('products.inStock'), color: Colors.success };
  };

  const renderProductCard = ({ item }: { item: any }) => {
    const stockStatus = getStockStatus(item);

    return (
      <TouchableOpacity onPress={() => router.push(`/products/${item.id}`)}>
        <Card style={styles.productCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.productInfo}>
                <Avatar.Icon
                  size={48}
                  icon="package-variant"
                  style={{ backgroundColor: Colors.primary }}
                />
                <View style={styles.productDetails}>
                  <Text variant="titleMedium" style={styles.productName}>
                    {item.name}
                  </Text>
                  {item.sku && (
                    <Text variant="bodySmall" style={styles.secondaryText}>
                      SKU: {item.sku}
                    </Text>
                  )}
                  {item.category && (
                    <Text variant="bodySmall" style={styles.secondaryText}>
                      {item.category}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text variant="titleMedium" style={styles.price}>
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(item.unit_price || 0)}
                </Text>
                <Chip
                  mode="flat"
                  style={{ backgroundColor: stockStatus.color, marginTop: Spacing.xs }}
                  textStyle={{ color: '#fff', fontSize: 10 }}
                >
                  {stockStatus.label}
                </Chip>
              </View>
            </View>

            <View style={styles.stockInfo}>
              <View style={styles.stockRow}>
                <MaterialCommunityIcons name="package-variant" size={16} color={Colors.textSecondary} />
                <Text variant="bodySmall" style={styles.stockText}>
                  {t('products.stockUnits', { count: item.stock_quantity || 0 })}
                </Text>
              </View>
              {item.supplier_name && (
                <View style={styles.stockRow}>
                  <MaterialCommunityIcons name="truck" size={16} color={Colors.textSecondary} />
                  <Text variant="bodySmall" style={styles.stockText}>
                    {item.supplier_name}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.statValue}>
              {products.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('products.totalProducts')}
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.success }]}>
              {products.filter((p) => (p.stock_quantity || 0) > (p.minimum_stock || 10)).length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('products.inStock')}
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.warning }]}>
              {products.filter((p) => {
                const stock = p.stock_quantity || 0;
                const min = p.minimum_stock || 10;
                return stock > 0 && stock <= min;
              }).length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('products.lowStock')}
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.error }]}>
              {products.filter((p) => (p.stock_quantity || 0) === 0).length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('products.stockOf')}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Search */}
      <Searchbar
        placeholder={t('products.searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Quick Filters */}
      <View style={styles.filtersContainer}>
        <Button
          mode={activeFilter === 'all' ? 'contained' : 'outlined'}
          onPress={() => setActiveFilter('all')}
          style={styles.filterButton}
          compact
        >
          {t('products.filters.all')}
        </Button>
        <Button
          mode={activeFilter === 'in_stock' ? 'contained' : 'outlined'}
          onPress={() => setActiveFilter('in_stock')}
          style={styles.filterButton}
          compact
        >
          {t('products.filters.inStock')}
        </Button>
        <Button
          mode={activeFilter === 'low_stock' ? 'contained' : 'outlined'}
          onPress={() => setActiveFilter('low_stock')}
          style={styles.filterButton}
          compact
        >
          {t('products.filters.lowStock')}
        </Button>
        <Button
          mode={activeFilter === 'out_of_stock' ? 'contained' : 'outlined'}
          onPress={() => setActiveFilter('out_of_stock')}
          style={styles.filterButton}
          compact
        >
          {t('products.filters.outOfStock')}
        </Button>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="package-variant-closed" size={64} color={Colors.disabled} />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        {t('products.noProductsFound')}
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {searchQuery || activeFilter !== 'all'
          ? t('products.tryModifyingSearch')
          : t('products.createFirstProduct')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyList : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={filteredProducts.length === 0 ? styles.emptyList : undefined}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/products/create')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  statValue: {
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  searchBar: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterButton: {
    borderRadius: 20,
  },
  productCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  productDetails: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  productName: {
    fontWeight: '600',
    color: Colors.text,
  },
  secondaryText: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  price: {
    fontWeight: '700',
    color: Colors.primary,
  },
  stockInfo: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stockText: {
    marginLeft: Spacing.xs,
    color: Colors.textSecondary,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.md,
    color: Colors.text,
  },
  emptyText: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
});
