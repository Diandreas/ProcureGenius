import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, List, ProgressBar } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, Spacing, Shadows } from '../../../constants/theme';

export default function DataMigrationScreen() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      setImporting(true);
      setProgress(0);

      // Simulation d'import
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i / 100);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setImporting(false);
      Alert.alert('Succès', 'Données importées avec succès');
    } catch (error) {
      setImporting(false);
      Alert.alert('Erreur', 'Impossible d\'importer le fichier');
    }
  };

  const handleExportData = async () => {
    Alert.alert('Succès', 'Vos données seront exportées et envoyées par email');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Migration de données</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Importez ou exportez vos données facilement</Text>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Importer des données" left={(props) => <List.Icon {...props} icon="upload" />} />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.description}>
            Importez vos données depuis un fichier CSV ou Excel. Les formats supportés: clients, produits, fournisseurs, factures.
          </Text>

          {importing && (
            <View style={styles.progressContainer}>
              <Text variant="bodySmall" style={styles.progressText}>Import en cours... {Math.round(progress * 100)}%</Text>
              <ProgressBar progress={progress} color={Colors.primary} style={styles.progressBar} />
            </View>
          )}

          <Button mode="contained" onPress={handleImportCSV} icon="file-upload" disabled={importing} loading={importing} style={styles.button}>
            Importer un fichier CSV
          </Button>

          <List.Section>
            <List.Subheader>Modèles disponibles</List.Subheader>
            <List.Item
              title="Modèle Clients"
              right={(props) => <List.Icon {...props} icon="download" />}
              onPress={() => {}}
            />
            <List.Item
              title="Modèle Produits"
              right={(props) => <List.Icon {...props} icon="download" />}
              onPress={() => {}}
            />
            <List.Item
              title="Modèle Fournisseurs"
              right={(props) => <List.Icon {...props} icon="download" />}
              onPress={() => {}}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Exporter des données" left={(props) => <List.Icon {...props} icon="download" />} />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.description}>
            Exportez toutes vos données au format CSV pour une sauvegarde ou une utilisation dans d'autres outils.
          </Text>

          <Button mode="outlined" onPress={handleExportData} icon="export" style={styles.button}>
            Exporter toutes les données
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Synchronisation" left={(props) => <List.Icon {...props} icon="sync" />} />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.description}>
            Synchronisez vos données avec d'autres plateformes (ERP, comptabilité, etc.)
          </Text>
          <Button mode="outlined" onPress={() => {}} icon="link" style={styles.button}>
            Configurer la synchronisation
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md },
  title: { fontWeight: '700', color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginTop: Spacing.xs },
  card: { margin: Spacing.md, backgroundColor: Colors.surface, ...Shadows.sm },
  description: { marginBottom: Spacing.md, color: Colors.textSecondary },
  progressContainer: { marginVertical: Spacing.md },
  progressText: { color: Colors.textSecondary, marginBottom: Spacing.sm },
  progressBar: { height: 8, borderRadius: 4 },
  button: { marginTop: Spacing.sm },
});
