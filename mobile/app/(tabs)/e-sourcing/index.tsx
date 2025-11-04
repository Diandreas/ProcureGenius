import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Button, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

const rfqAPI = {
  list: async () => ({ data: [] }),
  getStats: async () => ({ data: { total: 0, open: 0, closed: 0, totalBids: 0 } })
};

export default function ESourcingDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, totalBids: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await rfqAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const StatCard = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity onPress={onPress} style={styles.statCardWrapper}>
      <Card style={styles.statCard}>
        <Card.Content>
          <View style={styles.statCardContent}>
            <Avatar.Icon size={48} icon={icon} style={{ backgroundColor: color }} />
            <View style={styles.statCardText}>
              <Text variant="headlineMedium" style={[styles.statValue, { color }]}>{value}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{title}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Tableau de bord E-Sourcing</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Gérez vos appels d'offres et comparez les propositions</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard title="Demandes de devis" value={stats.total} icon="file-document" color={Colors.primary} onPress={() => router.push('/e-sourcing/rfq')} />
        <StatCard title="En cours" value={stats.open} icon="clock" color={Colors.info} />
        <StatCard title="Clôturées" value={stats.closed} icon="check-circle" color={Colors.success} />
        <StatCard title="Offres reçues" value={stats.totalBids} icon="email" color={Colors.secondary} />
      </View>

      <View style={styles.section}>
        <Text variant="titleLarge" style={styles.sectionTitle}>Actions rapides</Text>
        <Button mode="contained" icon="plus" onPress={() => router.push('/e-sourcing/rfq/create')} style={styles.actionButton}>
          Nouvelle demande de devis
        </Button>
        <Button mode="contained" icon="chart-bar" onPress={() => router.push('/e-sourcing/analysis')} style={styles.actionButton}>
          Analyser les offres
        </Button>
        <Button mode="outlined" icon="history" onPress={() => router.push('/e-sourcing/rfq')} style={styles.actionButton}>
          Voir toutes les demandes
        </Button>
      </View>

      <View style={styles.section}>
        <Text variant="titleLarge" style={styles.sectionTitle}>Comment ça marche ?</Text>
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.step}>
              <Avatar.Text size={32} label="1" style={{ backgroundColor: Colors.primary }} />
              <View style={styles.stepText}>
                <Text variant="titleSmall">Créer une demande de devis</Text>
                <Text variant="bodySmall" style={styles.stepDesc}>Définissez vos besoins et sélectionnez les fournisseurs</Text>
              </View>
            </View>
            <View style={styles.step}>
              <Avatar.Text size={32} label="2" style={{ backgroundColor: Colors.primary }} />
              <View style={styles.stepText}>
                <Text variant="titleSmall">Recevoir les offres</Text>
                <Text variant="bodySmall" style={styles.stepDesc}>Les fournisseurs soumettent leurs propositions</Text>
              </View>
            </View>
            <View style={styles.step}>
              <Avatar.Text size={32} label="3" style={{ backgroundColor: Colors.primary }} />
              <View style={styles.stepText}>
                <Text variant="titleSmall">Comparer et décider</Text>
                <Text variant="bodySmall" style={styles.stepDesc}>Analysez les offres et choisissez le meilleur fournisseur</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  title: { fontWeight: '700', color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginTop: Spacing.xs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  statCardWrapper: { flex: 1, minWidth: '45%' },
  statCard: { backgroundColor: Colors.surface, ...Shadows.sm },
  statCardContent: { flexDirection: 'row', alignItems: 'center' },
  statCardText: { marginLeft: Spacing.md, flex: 1 },
  statValue: { fontWeight: '700' },
  statLabel: { color: Colors.textSecondary, marginTop: Spacing.xs },
  section: { padding: Spacing.md },
  sectionTitle: { fontWeight: '700', marginBottom: Spacing.md },
  actionButton: { marginBottom: Spacing.sm },
  infoCard: { backgroundColor: Colors.surface, ...Shadows.sm },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  stepText: { marginLeft: Spacing.md, flex: 1 },
  stepDesc: { color: Colors.textSecondary, marginTop: Spacing.xs },
});
