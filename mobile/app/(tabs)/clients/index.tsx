import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, FAB, Avatar, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { clientsAPI } from '../../../services/api';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function ClientsListScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchQuery, activeFilter, clients]);

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.list();
      const data = response.data.results || response.data;
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClients();
  }, []);

  const filterClients = () => {
    let filtered = clients;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (client) =>
          client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.company?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((client) => {
        if (activeFilter === 'active') {
          return client.is_active !== false;
        } else if (activeFilter === 'inactive') {
          return client.is_active === false;
        }
        return true;
      });
    }

    setFilteredClients(filtered);
  };

  const renderClientCard = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity onPress={() => router.push(`/clients/${item.id}`)}>
        <Card style={styles.clientCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.clientInfo}>
                <Avatar.Icon
                  size={48}
                  icon="account"
                  style={{ backgroundColor: Colors.primary }}
                />
                <View style={styles.clientDetails}>
                  <Text variant="titleMedium" style={styles.clientName}>
                    {item.name}
                  </Text>
                  {item.company && (
                    <Text variant="bodySmall" style={styles.secondaryText}>
                      {item.company}
                    </Text>
                  )}
                  {item.email && (
                    <Text variant="bodySmall" style={styles.secondaryText}>
                      {item.email}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                {item.is_active !== false ? (
                  <Chip
                    mode="flat"
                    style={{ backgroundColor: Colors.success }}
                    textStyle={{ color: '#fff', fontSize: 10 }}
                  >
                    Actif
                  </Chip>
                ) : (
                  <Chip
                    mode="flat"
                    style={{ backgroundColor: Colors.disabled }}
                    textStyle={{ color: '#fff', fontSize: 10 }}
                  >
                    Inactif
                  </Chip>
                )}
              </View>
            </View>

            {(item.phone || item.address) && (
              <View style={styles.contactInfo}>
                {item.phone && (
                  <View style={styles.contactRow}>
                    <MaterialCommunityIcons name="phone" size={16} color={Colors.textSecondary} />
                    <Text variant="bodySmall" style={styles.contactText}>
                      {item.phone}
                    </Text>
                  </View>
                )}
                {item.address && (
                  <View style={styles.contactRow}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={Colors.textSecondary} />
                    <Text variant="bodySmall" style={styles.contactText}>
                      {item.address}
                    </Text>
                  </View>
                )}
              </View>
            )}
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
              {clients.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Total clients
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.success }]}>
              {clients.filter((c) => c.is_active !== false).length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Actifs
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text variant="titleLarge" style={[styles.statValue, { color: Colors.disabled }]}>
              {clients.filter((c) => c.is_active === false).length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Inactifs
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Search */}
      <Searchbar
        placeholder="Rechercher par nom, email, téléphone ou société"
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
          Tous
        </Button>
        <Button
          mode={activeFilter === 'active' ? 'contained' : 'outlined'}
          onPress={() => setActiveFilter('active')}
          style={styles.filterButton}
          compact
        >
          Actifs
        </Button>
        <Button
          mode={activeFilter === 'inactive' ? 'contained' : 'outlined'}
          onPress={() => setActiveFilter('inactive')}
          style={styles.filterButton}
          compact
        >
          Inactifs
        </Button>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="account-group" size={64} color={Colors.disabled} />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        Aucun client trouvé
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        {searchQuery || activeFilter !== 'all'
          ? 'Essayez de modifier vos critères de recherche'
          : 'Créez votre premier client pour commencer'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredClients}
        renderItem={renderClientCard}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmptyList : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={filteredClients.length === 0 ? styles.emptyList : undefined}
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/clients/create')}
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
    minWidth: '30%',
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
  clientCard: {
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
  clientInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  clientDetails: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  clientName: {
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
  contactInfo: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  contactText: {
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
