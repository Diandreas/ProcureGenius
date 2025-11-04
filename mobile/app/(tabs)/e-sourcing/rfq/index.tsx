import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, FAB, Avatar, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Shadows } from '../../../../constants/theme';

const rfqAPI = { list: async () => ({ data: [] }) };

export default function RFQListScreen() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [filteredRfqs, setFilteredRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'draft' | 'open' | 'closed'>('all');

  useEffect(() => { fetchRfqs(); }, []);
  useEffect(() => { filterRfqs(); }, [searchQuery, activeFilter, rfqs]);

  const fetchRfqs = async () => {
    try {
      const response = await rfqAPI.list();
      const data = response.data.results || response.data;
      setRfqs(data);
      setFilteredRfqs(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchRfqs(); }, []);

  const filterRfqs = () => {
    let filtered = rfqs;
    if (searchQuery) {
      filtered = filtered.filter(rfq =>
        rfq.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rfq.rfq_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeFilter !== 'all') {
      filtered = filtered.filter(rfq => rfq.status === activeFilter);
    }
    setFilteredRfqs(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: any = { draft: Colors.disabled, open: Colors.info, closed: Colors.success, cancelled: Colors.error };
    return colors[status] || Colors.disabled;
  };

  const getStatusLabel = (status: string) => {
    const labels: any = { draft: 'Brouillon', open: 'Ouverte', closed: 'Clôturée', cancelled: 'Annulée' };
    return labels[status] || status;
  };

  const renderRfqCard = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/e-sourcing/rfq/${item.id}`)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.rfqInfo}>
              <Avatar.Icon size={48} icon="file-document" style={{ backgroundColor: Colors.primary }} />
              <View style={styles.rfqDetails}>
                <Text variant="titleMedium" style={styles.rfqTitle}>{item.title}</Text>
                <Text variant="bodySmall" style={styles.secondaryText}>{item.rfq_number}</Text>
                <Text variant="bodySmall" style={styles.secondaryText}>
                  Échéance: {new Date(item.deadline).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Chip mode="flat" style={{ backgroundColor: getStatusColor(item.status) }} textStyle={{ color: '#fff', fontSize: 10 }}>
                {getStatusLabel(item.status)}
              </Chip>
              {item.bids_count > 0 && (
                <Text variant="bodySmall" style={styles.bidsCount}>{item.bids_count} offre(s)</Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar placeholder="Rechercher..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />
        <View style={styles.filters}>
          {['all', 'draft', 'open', 'closed'].map(f => (
            <Button key={f} mode={activeFilter === f ? 'contained' : 'outlined'} onPress={() => setActiveFilter(f as any)} style={styles.filterBtn} compact>
              {f === 'all' ? 'Tous' : f === 'draft' ? 'Brouillons' : f === 'open' ? 'Ouvertes' : 'Clôturées'}
            </Button>
          ))}
        </View>
      </View>
      <FlatList data={filteredRfqs} renderItem={renderRfqCard} keyExtractor={i => i.id.toString()} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} />
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/e-sourcing/rfq/create')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  searchBar: { backgroundColor: Colors.surface, marginBottom: Spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterBtn: { borderRadius: 20 },
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rfqInfo: { flexDirection: 'row', flex: 1 },
  rfqDetails: { marginLeft: Spacing.md, flex: 1 },
  rfqTitle: { fontWeight: '600', color: Colors.text },
  secondaryText: { color: Colors.textSecondary, marginTop: Spacing.xs },
  cardRight: { alignItems: 'flex-end' },
  bidsCount: { marginTop: Spacing.xs, color: Colors.primary },
  fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.md, backgroundColor: Colors.primary },
});
