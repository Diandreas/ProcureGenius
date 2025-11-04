import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, FAB, Avatar, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { purchaseOrdersAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function PurchaseOrdersListScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'draft' | 'sent' | 'received' | 'cancelled'>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, activeFilter, orders]);

  const fetchOrders = async () => {
    try {
      const response = await purchaseOrdersAPI.list();
      const data = response.data.results || response.data;
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const filterOrders = () => {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === activeFilter);
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: Colors.disabled,
      sent: Colors.info,
      received: Colors.success,
      cancelled: Colors.error,
    };
    return colors[status] || Colors.disabled;
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      draft: 'Brouillon',
      sent: 'Envoyé',
      received: 'Reçu',
      cancelled: 'Annulé',
    };
    return labels[status] || status;
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity onPress={() => router.push(`/purchase-orders/${item.id}`)}>
        <Card style={styles.orderCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.orderInfo}>
                <Avatar.Icon
                  size={48}
                  icon="cart"
                  style={{ backgroundColor: Colors.secondary }}
                />
                <View style={styles.orderDetails}>
                  <Text variant="titleMedium" style={styles.orderNumber}>
                    {item.po_number}
                  </Text>
                  <Text variant="bodySmall" style={styles.secondaryText}>
                    {item.supplier_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.secondaryText}>
                    {new Date(item.order_date).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text variant="titleMedium" style={styles.amount}>
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(item.total_amount)}
                </Text>
                <Chip
                  mode="flat"
                  style={{ backgroundColor: getStatusColor(item.status), marginTop: Spacing.xs }}
                  textStyle={{ color: '#fff', fontSize: 10 }}
                >
                  {getStatusLabel(item.status)}
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const stats = {
    total: orders.length,
    draft: orders.filter((o) => o.status === 'draft').length,
    sent: orders.filter((o) => o.status === 'sent').length,
    received: orders.filter((o) => o.status === 'received').length,
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.statValue}>{stats.total}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Total commandes</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.disabled }]}>{stats.draft}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Brouillons</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.info }]}>{stats.sent}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Envoyés</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.success }]}>{stats.received}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Reçus</Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <Searchbar
        placeholder="Rechercher par numéro ou fournisseur"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <View style={styles.filtersContainer}>
        <Button mode={activeFilter === 'all' ? 'contained' : 'outlined'} onPress={() => setActiveFilter('all')} style={styles.filterButton} compact>
          Tous
        </Button>
        <Button mode={activeFilter === 'draft' ? 'contained' : 'outlined'} onPress={() => setActiveFilter('draft')} style={styles.filterButton} compact>
          Brouillons
        </Button>
        <Button mode={activeFilter === 'sent' ? 'contained' : 'outlined'} onPress={() => setActiveFilter('sent')} style={styles.filterButton} compact>
          Envoyés
        </Button>
        <Button mode={activeFilter === 'received' ? 'contained' : 'outlined'} onPress={() => setActiveFilter('received')} style={styles.filterButton} compact>
          Reçus
        </Button>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/purchase-orders/create')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  statsScroll: { marginBottom: Spacing.md },
  statCard: { width: 140, marginRight: Spacing.sm, backgroundColor: Colors.surface, ...Shadows.sm },
  statValue: { fontWeight: '700', color: Colors.primary },
  statLabel: { color: Colors.textSecondary, marginTop: Spacing.xs },
  searchBar: { backgroundColor: Colors.surface, marginBottom: Spacing.md },
  filtersContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterButton: { borderRadius: 20 },
  orderCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderInfo: { flexDirection: 'row', flex: 1 },
  orderDetails: { marginLeft: Spacing.md, flex: 1 },
  orderNumber: { fontWeight: '600', color: Colors.text },
  secondaryText: { color: Colors.textSecondary, marginTop: Spacing.xs },
  cardRight: { alignItems: 'flex-end' },
  amount: { fontWeight: '700', color: Colors.primary },
  fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.md, backgroundColor: Colors.secondary },
});
