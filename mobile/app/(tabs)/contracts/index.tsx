import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, FAB, Avatar, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

// Mock API - replace with actual contractsAPI
const contractsAPI = {
  list: async () => ({ data: [] })
};

export default function ContractsListScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'expired' | 'upcoming'>('all');

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    filterContracts();
  }, [searchQuery, activeFilter, contracts]);

  const fetchContracts = async () => {
    try {
      const response = await contractsAPI.list();
      const data = response.data.results || response.data;
      setContracts(data);
      setFilteredContracts(data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContracts();
  }, []);

  const filterContracts = () => {
    let filtered = contracts;

    if (searchQuery) {
      filtered = filtered.filter(
        (contract) =>
          contract.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contract.contract_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contract.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter((contract) => {
        const now = new Date();
        const endDate = new Date(contract.end_date);
        const startDate = new Date(contract.start_date);

        if (activeFilter === 'active') {
          return now >= startDate && now <= endDate;
        } else if (activeFilter === 'expired') {
          return now > endDate;
        } else if (activeFilter === 'upcoming') {
          return now < startDate;
        }
        return true;
      });
    }

    setFilteredContracts(filtered);
  };

  const getContractStatus = (contract: any) => {
    const now = new Date();
    const endDate = new Date(contract.end_date);
    const startDate = new Date(contract.start_date);

    if (now < startDate) return { label: 'À venir', color: Colors.info };
    if (now > endDate) return { label: 'Expiré', color: Colors.error };
    return { label: 'Actif', color: Colors.success };
  };

  const renderContractCard = ({ item }: { item: any }) => {
    const status = getContractStatus(item);

    return (
      <TouchableOpacity onPress={() => router.push(`/contracts/${item.id}`)}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.contractInfo}>
                <Avatar.Icon size={48} icon="file-document" style={{ backgroundColor: Colors.primary }} />
                <View style={styles.contractDetails}>
                  <Text variant="titleMedium" style={styles.contractName}>{item.name}</Text>
                  <Text variant="bodySmall" style={styles.secondaryText}>{item.contract_number}</Text>
                  {item.supplier_name && <Text variant="bodySmall" style={styles.secondaryText}>{item.supplier_name}</Text>}
                </View>
              </View>
              <View style={styles.cardRight}>
                <Chip mode="flat" style={{ backgroundColor: status.color }} textStyle={{ color: '#fff', fontSize: 10 }}>
                  {status.label}
                </Chip>
                {item.auto_renew && (
                  <MaterialCommunityIcons name="autorenew" size={16} color={Colors.success} style={{ marginTop: 4 }} />
                )}
              </View>
            </View>
            {item.value && (
              <View style={styles.valueRow}>
                <Text variant="bodySmall" style={styles.valueLabel}>Valeur:</Text>
                <Text variant="titleSmall" style={styles.valueAmount}>
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(item.value)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => {
      const now = new Date();
      return now >= new Date(c.start_date) && now <= new Date(c.end_date);
    }).length,
    expired: contracts.filter(c => new Date() > new Date(c.end_date)).length,
    upcoming: contracts.filter(c => new Date() < new Date(c.start_date)).length,
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.statValue}>{stats.total}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Total contrats</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.success }]}>{stats.active}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Actifs</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.error }]}>{stats.expired}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Expirés</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.info }]}>{stats.upcoming}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>À venir</Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <Searchbar placeholder="Rechercher par nom, numéro ou fournisseur" onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />

      <View style={styles.filtersContainer}>
        {['all', 'active', 'expired', 'upcoming'].map((filter) => (
          <Button key={filter} mode={activeFilter === filter ? 'contained' : 'outlined'} onPress={() => setActiveFilter(filter as any)} style={styles.filterButton} compact>
            {filter === 'all' ? 'Tous' : filter === 'active' ? 'Actifs' : filter === 'expired' ? 'Expirés' : 'À venir'}
          </Button>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredContracts}
        renderItem={renderContractCard}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/contracts/create')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  statsScroll: { marginBottom: Spacing.md },
  statCard: { width: 120, marginRight: Spacing.sm, backgroundColor: Colors.surface, ...Shadows.sm },
  statValue: { fontWeight: '700', color: Colors.primary },
  statLabel: { color: Colors.textSecondary, marginTop: Spacing.xs },
  searchBar: { backgroundColor: Colors.surface, marginBottom: Spacing.md },
  filtersContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterButton: { borderRadius: 20 },
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  contractInfo: { flexDirection: 'row', flex: 1 },
  contractDetails: { marginLeft: Spacing.md, flex: 1 },
  contractName: { fontWeight: '600', color: Colors.text },
  secondaryText: { color: Colors.textSecondary, marginTop: Spacing.xs },
  cardRight: { alignItems: 'flex-end' },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  valueLabel: { color: Colors.textSecondary },
  valueAmount: { fontWeight: '600', color: Colors.primary },
  fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.md, backgroundColor: Colors.primary },
});
