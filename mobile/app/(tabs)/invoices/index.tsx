import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Searchbar,
  FAB,
  Avatar,
  Divider,
  Menu,
  Button,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { invoicesAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { setInvoices, setLoading, setError } from '../../../store/slices/invoicesSlice';
import { useTranslation } from 'react-i18next';

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
}

export default function InvoicesListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { invoices, loading } = useAppSelector((state) => state.invoices);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      dispatch(setLoading(true));
      const response = await invoicesAPI.list();
      dispatch(setInvoices(response.data.results || response.data));
      dispatch(setError(null));
    } catch (err: any) {
      dispatch(setError(t('errors.loadingFailed')));
      console.error('Error fetching invoices:', err);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const filteredInvoices = invoices.filter((invoice: Invoice) => {
    const matchesSearch =
      !searchQuery ||
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || invoice.status === statusFilter;

    const matchesQuick =
      !quickFilter ||
      (quickFilter === 'paid' && invoice.status === 'paid') ||
      (quickFilter === 'unpaid' && invoice.status === 'sent') ||
      (quickFilter === 'overdue' && invoice.status === 'overdue') ||
      (quickFilter === 'draft' && invoice.status === 'draft');

    return matchesSearch && matchesStatus && matchesQuick;
  });

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: Colors.disabled,
      sent: Colors.info,
      paid: Colors.success,
      overdue: Colors.error,
      cancelled: Colors.error,
    };
    return colors[status] || Colors.disabled;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      draft: t('invoices.draft'),
      sent: t('invoices.sent'),
      paid: t('invoices.paid'),
      overdue: t('invoices.overdue'),
      cancelled: t('invoices.cancelled'),
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Statistics
  const stats = {
    total: invoices.length,
    paid: invoices.filter((i: Invoice) => i.status === 'paid').length,
    unpaid: invoices.filter((i: Invoice) => i.status === 'sent').length,
    overdue: invoices.filter((i: Invoice) => i.status === 'overdue').length,
    draft: invoices.filter((i: Invoice) => i.status === 'draft').length,
    totalAmount: invoices.reduce(
      (sum: number, i: Invoice) => sum + (parseFloat(String(i.total_amount)) || 0),
      0
    ),
  };

  const renderInvoiceCard = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      onPress={() => router.push(`/invoices/${item.id}`)}
      activeOpacity={0.7}
    >
      <Card style={styles.invoiceCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Avatar.Icon
              size={48}
              icon="receipt"
              style={{ backgroundColor: Colors.primaryLight }}
            />
            <View style={styles.cardHeaderText}>
              <Text variant="titleMedium" style={styles.invoiceNumber}>
                {item.invoice_number}
              </Text>
              <Text variant="bodySmall" style={styles.clientName}>
                {item.client_name}
              </Text>
            </View>
            <Chip
              mode="flat"
              style={{ backgroundColor: getStatusColor(item.status) }}
              textStyle={{ color: '#fff', fontSize: 11 }}
            >
              {getStatusLabel(item.status)}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <MaterialCommunityIcons
                name="currency-eur"
                size={16}
                color={Colors.textSecondary}
              />
              <Text variant="bodyMedium" style={styles.amount}>
                {formatCurrency(item.total_amount)}
              </Text>
            </View>
            <View style={styles.footerItem}>
              <MaterialCommunityIcons
                name="calendar"
                size={16}
                color={Colors.textSecondary}
              />
              <Text variant="bodySmall" style={styles.date}>
                {formatDate(item.due_date)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      {/* Statistics */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
      >
        <Card style={styles.statCard}>
          <Card.Content style={styles.statCardContent}>
            <MaterialCommunityIcons name="receipt" size={24} color={Colors.primary} />
            <Text variant="headlineSmall" style={styles.statValue}>
              {stats.total}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('common.total')}
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.statCard}
          onPress={() => setQuickFilter(quickFilter === 'paid' ? '' : 'paid')}
        >
          <Card.Content style={styles.statCardContent}>
            <MaterialCommunityIcons name="check-circle" size={24} color={Colors.success} />
            <Text variant="headlineSmall" style={styles.statValue}>
              {stats.paid}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('invoices.paid')}
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.statCard}
          onPress={() => setQuickFilter(quickFilter === 'unpaid' ? '' : 'unpaid')}
        >
          <Card.Content style={styles.statCardContent}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={Colors.info} />
            <Text variant="headlineSmall" style={styles.statValue}>
              {stats.unpaid}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('invoices.sent')}
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.statCard}
          onPress={() => setQuickFilter(quickFilter === 'overdue' ? '' : 'overdue')}
        >
          <Card.Content style={styles.statCardContent}>
            <MaterialCommunityIcons name="alert-circle" size={24} color={Colors.error} />
            <Text variant="headlineSmall" style={styles.statValue}>
              {stats.overdue}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('invoices.overdue')}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Search bar */}
      <Searchbar
        placeholder={t('invoices.searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        icon="magnify"
      />

      {/* Active filters */}
      {(quickFilter || statusFilter) && (
        <View style={styles.activeFilters}>
          {quickFilter && (
            <Chip
              mode="flat"
              onClose={() => setQuickFilter('')}
              style={styles.filterChip}
            >
              {getStatusLabel(quickFilter)}
            </Chip>
          )}
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceCard}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={64}
              color={Colors.disabled}
            />
            <Text variant="titleMedium" style={styles.emptyText}>
              {t('invoices.noInvoicesFound')}
            </Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              {t('invoices.createFirstInvoice')}
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        label={t('invoices.newInvoice')}
        style={styles.fab}
        onPress={() => router.push('/invoices/create')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },
  statsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  statCard: {
    marginRight: Spacing.sm,
    minWidth: 100,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  statCardContent: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statValue: {
    fontWeight: '700',
    marginTop: Spacing.xs,
    color: Colors.text,
  },
  statLabel: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  searchBar: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  activeFilters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    backgroundColor: Colors.primaryLight,
  },
  invoiceCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  invoiceNumber: {
    fontWeight: '600',
    color: Colors.text,
  },
  clientName: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  divider: {
    marginVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  amount: {
    fontWeight: '600',
    color: Colors.primary,
  },
  date: {
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    color: Colors.text,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
});
