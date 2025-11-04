import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  Chip,
  IconButton,
  Menu,
  Portal,
  Dialog,
  TextInput as PaperTextInput,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { analyticsAPI } from '../../services/analyticsAPI';
import { formatCurrency } from '../../utils/formatters';
import { Mascot, LoadingState } from '../../components';
import { Colors, Spacing, Shadows } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

const screenWidth = Dimensions.get('window').width;

const PERIOD_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'last_7_days', label: '7 jours' },
  { value: 'last_30_days', label: '30 jours' },
  { value: 'last_90_days', label: '90 jours' },
  { value: 'this_month', label: 'Ce mois' },
  { value: 'this_year', label: 'Cette année' },
];

export default function DashboardEnhancedScreen() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState('last_30_days');
  const [compare, setCompare] = useState(true);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [customDateDialog, setCustomDateDialog] = useState(false);
  const [customDates, setCustomDates] = useState({
    start_date: '',
    end_date: '',
  });

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { greeting: 'Bonjour', message: 'Excellente journée à vous !', pose: 'excited' as const };
    } else if (hour >= 12 && hour < 18) {
      return { greeting: 'Bon après-midi', message: 'Continuez sur cette lancée !', pose: 'reading' as const };
    } else if (hour >= 18 && hour < 22) {
      return { greeting: 'Bonsoir', message: 'Bonne fin de journée !', pose: 'happy' as const };
    } else {
      return { greeting: 'Bonne nuit', message: 'Il se fait tard !', pose: 'thinking' as const };
    }
  };

  const welcome = getWelcomeMessage();

  useEffect(() => {
    fetchDashboardData();
  }, [period, compare]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params: any = {
        period,
        compare: compare.toString(),
      };

      if (period === 'custom' && customDates.start_date && customDates.end_date) {
        params.start_date = customDates.start_date;
        params.end_date = customDates.end_date;
      }

      const response = await analyticsAPI.getStats(params);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Erreur', 'Impossible de charger les statistiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  const handleCustomDateApply = () => {
    setPeriod('custom');
    setCustomDateDialog(false);
    fetchDashboardData();
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(true);
      setExportMenuVisible(false);

      const params: any = {
        period,
        compare: compare.toString(),
      };

      if (period === 'custom' && customDates.start_date && customDates.end_date) {
        params.start_date = customDates.start_date;
        params.end_date = customDates.end_date;
      }

      // Note: File download in React Native requires additional setup
      Alert.alert('Export', `Export ${format.toUpperCase()} sera disponible prochainement`);
    } catch (error) {
      console.error('Error exporting dashboard:', error);
      Alert.alert('Erreur', "Impossible d'exporter les données");
    } finally {
      setExporting(false);
    }
  };

  const formatComparison = (value: number, previousValue?: number) => {
    if (!previousValue || previousValue === 0) return null;
    const change = ((value - previousValue) / previousValue) * 100;
    const isPositive = change > 0;

    return {
      value: Math.abs(change).toFixed(1),
      isPositive,
      color: isPositive ? '#10B981' : '#EF4444',
    };
  };

  if (loading && !stats) {
    return <LoadingState message="Chargement de votre tableau de bord..." fullScreen />;
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text>Impossible de charger les statistiques</Text>
      </View>
    );
  }

  const financialStats = stats.financial || {};
  const invoiceStats = stats.invoices || {};

  const statsCards = [
    {
      title: 'Revenu Total',
      value: formatCurrency(financialStats.total_revenue || 0),
      numericValue: financialStats.total_revenue || 0,
      previous: financialStats.previous_revenue,
      icon: 'currency-eur',
      color: '#10B981',
    },
    {
      title: 'Dépenses',
      value: formatCurrency(financialStats.total_expenses || 0),
      numericValue: financialStats.total_expenses || 0,
      previous: financialStats.previous_expenses,
      icon: 'cart',
      color: '#EF4444',
    },
    {
      title: 'Profit Net',
      value: formatCurrency(financialStats.net_profit || 0),
      numericValue: financialStats.net_profit || 0,
      previous: financialStats.previous_profit,
      icon: 'trending-up',
      color: '#3B82F6',
    },
    {
      title: 'Factures Impayées',
      value: invoiceStats.unpaid_count || 0,
      numericValue: invoiceStats.unpaid_count || 0,
      total: invoiceStats.total_count || 0,
      icon: 'receipt',
      color: '#F59E0B',
    },
  ];

  const prepareLineChartData = () => {
    const trends = stats.daily_trends || { dates: [], invoices: [], purchase_orders: [] };

    return {
      labels: (trends.dates || []).map((d: string) => {
        const date = new Date(d);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }).slice(-7), // Derniers 7 jours pour mobile
      datasets: [
        {
          data: (trends.invoices || []).slice(-7),
          color: () => '#10B981',
          strokeWidth: 2,
        },
        {
          data: (trends.purchase_orders || []).slice(-7),
          color: () => '#3B82F6',
          strokeWidth: 2,
        },
      ],
      legend: ['Factures', 'Bons de commande'],
    };
  };

  const prepareDonutData = () => {
    return [
      {
        name: 'Payées',
        population: invoiceStats.paid_count || 0,
        color: '#10B981',
        legendFontColor: Colors.text,
      },
      {
        name: 'En attente',
        population: invoiceStats.pending_count || 0,
        color: '#F59E0B',
        legendFontColor: Colors.text,
      },
      {
        name: 'En retard',
        population: invoiceStats.overdue_count || 0,
        color: '#EF4444',
        legendFontColor: Colors.text,
      },
    ];
  };

  const lineChartData = prepareLineChartData();
  const donutData = prepareDonutData();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Mascot pose={welcome.pose} animation="wave" size={60} />
            <View style={styles.headerText}>
              <Text style={styles.headerGreeting}>{welcome.greeting} ! 👋</Text>
              <Text style={styles.headerMessage}>
                {welcome.message} Voici un aperçu de votre activité.
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <IconButton
              icon="refresh"
              iconColor="#fff"
              size={24}
              onPress={fetchDashboardData}
              disabled={loading}
            />
            <IconButton
              icon="download"
              iconColor="#fff"
              size={24}
              onPress={() => setExportMenuVisible(true)}
              disabled={exporting}
            />
          </View>
        </View>

        {/* Period Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodFilters}>
          {PERIOD_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              mode={period === option.value ? 'flat' : 'outlined'}
              selected={period === option.value}
              onPress={() => handlePeriodChange(option.value)}
              style={[
                styles.periodChip,
                period === option.value && styles.periodChipSelected,
              ]}
              textStyle={styles.periodChipText}
            >
              {option.label}
            </Chip>
          ))}
          <Chip
            mode="outlined"
            icon="calendar-range"
            onPress={() => setCustomDateDialog(true)}
            style={styles.periodChip}
            textStyle={styles.periodChipText}
          >
            Personnalisé
          </Chip>
        </ScrollView>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {statsCards.map((stat, index) => {
          const comparison = stat.previous !== undefined ? formatComparison(stat.numericValue, stat.previous) : null;

          return (
            <Card key={index} style={styles.statCard}>
              <Card.Content style={styles.statCardContent}>
                <View style={styles.statCardTop}>
                  <Avatar.Icon
                    size={48}
                    icon={stat.icon}
                    style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}
                    color={stat.color}
                  />
                  <View style={styles.statCardText}>
                    <Text style={styles.statTitle}>{stat.title}</Text>
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                    {stat.total !== undefined && (
                      <Text style={styles.statTotal}>sur {stat.total} total</Text>
                    )}
                  </View>
                </View>
                {comparison && compare && (
                  <View style={styles.comparison}>
                    <MaterialCommunityIcons
                      name={comparison.isPositive ? 'trending-up' : 'trending-down'}
                      size={16}
                      color={comparison.color}
                    />
                    <Text style={[styles.comparisonText, { color: comparison.color }]}>
                      {comparison.value}%
                    </Text>
                    <Text style={styles.comparisonLabel}>vs période précédente</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </View>

      {/* Line Chart */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Tendances quotidiennes</Text>
          <LineChart
            data={lineChartData}
            width={screenWidth - 64}
            height={220}
            chartConfig={{
              backgroundColor: Colors.surface,
              backgroundGradientFrom: Colors.surface,
              backgroundGradientTo: Colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
              style: {
                borderRadius: 16,
              },
            }}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>

      {/* Donut Chart */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>État des factures</Text>
          <PieChart
            data={donutData}
            width={screenWidth - 64}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>

      {/* Top 5 Clients */}
      <Card style={styles.listCard}>
        <Card.Content>
          <Text style={styles.listTitle}>Top 5 Clients</Text>
          {(stats.top_clients || []).map((client: any, index: number) => (
            <View key={index} style={styles.listItem}>
              <Avatar.Icon size={40} icon="account" style={styles.listAvatar} />
              <View style={styles.listItemText}>
                <Text style={styles.listItemName}>{client.name}</Text>
                <Text style={styles.listItemSubtitle}>{client.invoice_count} facture(s)</Text>
              </View>
              <Text style={styles.listItemAmount}>{formatCurrency(client.total_revenue)}</Text>
            </View>
          ))}
          {(!stats.top_clients || stats.top_clients.length === 0) && (
            <Text style={styles.emptyText}>Aucun client trouvé</Text>
          )}
        </Card.Content>
      </Card>

      {/* Top 5 Suppliers */}
      <Card style={styles.listCard}>
        <Card.Content>
          <Text style={styles.listTitle}>Top 5 Fournisseurs</Text>
          {(stats.top_suppliers || []).map((supplier: any, index: number) => (
            <View key={index} style={styles.listItem}>
              <Avatar.Icon size={40} icon="office-building" style={[styles.listAvatar, { backgroundColor: '#10B98120' }]} color="#10B981" />
              <View style={styles.listItemText}>
                <Text style={styles.listItemName}>{supplier.name}</Text>
                <Text style={styles.listItemSubtitle}>{supplier.purchase_order_count} BC</Text>
              </View>
              <Text style={[styles.listItemAmount, { color: '#10B981' }]}>{formatCurrency(supplier.total_spent)}</Text>
            </View>
          ))}
          {(!stats.top_suppliers || stats.top_suppliers.length === 0) && (
            <Text style={styles.emptyText}>Aucun fournisseur trouvé</Text>
          )}
        </Card.Content>
      </Card>

      {/* Export Menu */}
      <Portal>
        <Menu
          visible={exportMenuVisible}
          onDismiss={() => setExportMenuVisible(false)}
          anchor={{ x: screenWidth - 50, y: 100 }}
        >
          <Menu.Item
            leadingIcon="file-pdf-box"
            onPress={() => handleExport('pdf')}
            title="Exporter en PDF"
          />
          <Menu.Item
            leadingIcon="file-excel"
            onPress={() => handleExport('excel')}
            title="Exporter en Excel"
          />
        </Menu>

        {/* Custom Date Dialog */}
        <Dialog visible={customDateDialog} onDismiss={() => setCustomDateDialog(false)}>
          <Dialog.Title>Période personnalisée</Dialog.Title>
          <Dialog.Content>
            <PaperTextInput
              label="Date de début"
              value={customDates.start_date}
              onChangeText={(text) => setCustomDates({ ...customDates, start_date: text })}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
            />
            <PaperTextInput
              label="Date de fin"
              value={customDates.end_date}
              onChangeText={(text) => setCustomDates({ ...customDates, end_date: text })}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCustomDateDialog(false)}>Annuler</Button>
            <Button
              onPress={handleCustomDateApply}
              disabled={!customDates.start_date || !customDates.end_date}
            >
              Appliquer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  headerGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
  },
  headerActions: {
    flexDirection: 'row',
  },
  periodFilters: {
    marginTop: Spacing.sm,
  },
  periodChip: {
    marginRight: Spacing.xs,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
  },
  periodChipSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  periodChipText: {
    color: '#fff',
  },
  statsContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statCard: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  statCardContent: {
    padding: Spacing.md,
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  statIcon: {
    borderRadius: 8,
  },
  statCardText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  statTotal: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  comparison: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  comparisonLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  chartCard: {
    margin: Spacing.md,
    marginTop: 0,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  listCard: {
    margin: Spacing.md,
    marginTop: 0,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listAvatar: {
    backgroundColor: '#3B82F620',
  },
  listItemText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  dateInput: {
    marginBottom: Spacing.sm,
  },
});
