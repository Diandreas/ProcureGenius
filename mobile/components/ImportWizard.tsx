import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Portal,
  Dialog,
  Text,
  Button,
  ProgressBar,
  Chip,
  List,
  Divider,
  DataTable,
  Surface,
  IconButton,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Shadows } from '../constants/theme';
import { useTranslation } from 'react-i18next';

interface ImportConfig {
  title: string;
  icon: string;
  color: string;
  requiredFields: string[];
  optionalFields: string[];
  sampleData: any[];
}

interface ImportWizardProps {
  visible: boolean;
  onDismiss: () => void;
  importType?: 'clients' | 'products' | 'contacts' | 'suppliers';
  onImportComplete?: (results: any) => void;
}

const ImportWizard: React.FC<ImportWizardProps> = ({
  visible,
  onDismiss,
  importType = 'clients',
  onImportComplete,
}) => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    t('import.uploadFile'),
    t('import.columnMapping'),
    t('import.preview'),
    t('import.importing'),
  ];

  const importConfigs: Record<string, ImportConfig> = {
    clients: {
      title: t('import.importClients'),
      icon: 'account-group',
      color: Colors.primary,
      requiredFields: ['name', 'email'],
      optionalFields: ['phone', 'address', 'city', 'postal_code', 'country'],
      sampleData: [
        { name: 'Jean Dupont', email: 'jean@example.com', phone: '0123456789' },
        { name: 'Marie Martin', email: 'marie@example.com', phone: '0987654321' },
      ],
    },
    products: {
      title: t('import.importProducts'),
      icon: 'package-variant',
      color: Colors.success,
      requiredFields: ['name', 'reference'],
      optionalFields: ['description', 'price', 'category', 'stock', 'unit'],
      sampleData: [
        { name: 'Produit A', reference: 'PRD-001', price: '29.99' },
        { name: 'Produit B', reference: 'PRD-002', price: '15.50' },
      ],
    },
    suppliers: {
      title: t('import.importSuppliers'),
      icon: 'truck',
      color: Colors.secondary,
      requiredFields: ['name', 'email'],
      optionalFields: ['phone', 'address', 'city', 'contact_name'],
      sampleData: [
        { name: 'Supplier A', email: 'supplier@example.com', phone: '0123456789' },
      ],
    },
    contacts: {
      title: t('import.importContacts'),
      icon: 'phone',
      color: Colors.info,
      requiredFields: ['name', 'phone'],
      optionalFields: ['email', 'company', 'notes'],
      sampleData: [
        { name: 'Contact 1', phone: '+33123456789', email: 'contact1@example.com' },
      ],
    },
  };

  const config = importConfigs[importType];

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setUploadedFile(file);
        await parseCSV(file);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert(t('errors.error'), t('errors.filePickError'));
    }
  };

  const parseCSV = async (file: any) => {
    try {
      setLoading(true);
      const content = await FileSystem.readAsStringAsync(file.uri);
      const lines = content.split('\n');
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const data: any[] = [];

      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }
      }

      setCsvData(data);
      setActiveStep(1);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      Alert.alert(t('errors.error'), t('errors.csvParseError'));
    } finally {
      setLoading(false);
    }
  };

  const handleColumnMapping = (csvColumn: string, targetField: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [csvColumn]: targetField,
    }));
  };

  const handleImport = async () => {
    setLoading(true);
    setActiveStep(3);

    // Simulate import progress
    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i / 100);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const results = {
      success: csvData.length,
      failed: 0,
      total: csvData.length,
    };

    setImportResults(results);
    setLoading(false);

    if (onImportComplete) {
      onImportComplete(results);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setUploadedFile(null);
    setCsvData([]);
    setColumnMapping({});
    setImportProgress(0);
    setImportResults(null);
    setLoading(false);
    onDismiss();
  };

  const handleNext = () => {
    if (activeStep === 2) {
      handleImport();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <MaterialCommunityIcons
              name={config.icon}
              size={64}
              color={config.color}
              style={styles.icon}
            />
            <Text variant="headlineSmall" style={styles.title}>
              {config.title}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {t('import.uploadDescription')}
            </Text>

            <Button
              mode="contained"
              onPress={handlePickFile}
              icon="file-upload"
              style={styles.uploadButton}
              loading={loading}
            >
              {t('import.selectFile')}
            </Button>

            {uploadedFile && (
              <Chip icon="file" style={styles.fileChip}>
                {uploadedFile.name}
              </Chip>
            )}

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('import.requiredFields')}
            </Text>
            <View style={styles.chipContainer}>
              {config.requiredFields.map((field) => (
                <Chip key={field} mode="flat" style={styles.chip}>
                  {field}
                </Chip>
              ))}
            </View>

            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('import.optionalFields')}
            </Text>
            <View style={styles.chipContainer}>
              {config.optionalFields.map((field) => (
                <Chip key={field} mode="outlined" style={styles.chip}>
                  {field}
                </Chip>
              ))}
            </View>
          </View>
        );

      case 1:
        const csvColumns = csvData.length > 0 ? Object.keys(csvData[0]) : [];
        return (
          <ScrollView style={styles.stepContent}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('import.mapColumns')}
            </Text>
            {csvColumns.map((column) => (
              <View key={column} style={styles.mappingRow}>
                <Text variant="bodyMedium" style={styles.mappingLabel}>
                  {column}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.textSecondary} />
                <View style={styles.mappingTarget}>
                  {[...config.requiredFields, ...config.optionalFields].map((field) => (
                    <Chip
                      key={field}
                      selected={columnMapping[column] === field}
                      onPress={() => handleColumnMapping(column, field)}
                      style={styles.mappingChip}
                    >
                      {field}
                    </Chip>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        );

      case 2:
        return (
          <ScrollView horizontal style={styles.stepContent}>
            <DataTable>
              <DataTable.Header>
                {csvData.length > 0 &&
                  Object.keys(csvData[0]).map((key) => (
                    <DataTable.Title key={key}>{key}</DataTable.Title>
                  ))}
              </DataTable.Header>

              {csvData.slice(0, 5).map((row, index) => (
                <DataTable.Row key={index}>
                  {Object.values(row).map((value, idx) => (
                    <DataTable.Cell key={idx}>{String(value)}</DataTable.Cell>
                  ))}
                </DataTable.Row>
              ))}
            </DataTable>
          </ScrollView>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <MaterialCommunityIcons
              name={importResults ? 'check-circle' : 'cloud-upload'}
              size={64}
              color={importResults ? Colors.success : Colors.primary}
              style={styles.icon}
            />
            <Text variant="headlineSmall" style={styles.title}>
              {importResults ? t('import.complete') : t('import.inProgress')}
            </Text>

            {!importResults && (
              <>
                <ProgressBar progress={importProgress} color={Colors.primary} style={styles.progress} />
                <Text variant="bodyMedium" style={styles.progressText}>
                  {Math.round(importProgress * 100)}%
                </Text>
              </>
            )}

            {importResults && (
              <View style={styles.results}>
                <Text variant="bodyLarge" style={styles.resultText}>
                  {t('import.successCount', { count: importResults.success })}
                </Text>
                {importResults.failed > 0 && (
                  <Text variant="bodyMedium" style={styles.errorText}>
                    {t('import.failedCount', { count: importResults.failed })}
                  </Text>
                )}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose} style={styles.dialog}>
        <Dialog.Title>{steps[activeStep]}</Dialog.Title>
        <Divider />
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>{renderStepContent()}</ScrollView>
        </Dialog.ScrollArea>
        <Divider />
        <Dialog.Actions>
          {activeStep > 0 && activeStep < 3 && (
            <Button onPress={handleBack} disabled={loading}>
              {t('common.back')}
            </Button>
          )}
          {activeStep < 3 && (
            <Button
              onPress={handleNext}
              mode="contained"
              disabled={loading || (activeStep === 0 && !uploadedFile)}
            >
              {activeStep === 2 ? t('import.startImport') : t('common.next')}
            </Button>
          )}
          {importResults && (
            <Button onPress={handleClose} mode="contained">
              {t('common.close')}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  scrollArea: {
    maxHeight: 500,
  },
  stepContent: {
    padding: Spacing.lg,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: '700',
  },
  description: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  uploadButton: {
    marginVertical: Spacing.md,
  },
  fileChip: {
    alignSelf: 'center',
    marginVertical: Spacing.sm,
  },
  divider: {
    marginVertical: Spacing.lg,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  chip: {
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  mappingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  mappingLabel: {
    fontWeight: '600',
    minWidth: 100,
  },
  mappingTarget: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  mappingChip: {
    marginBottom: Spacing.xs,
  },
  progress: {
    marginVertical: Spacing.lg,
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  results: {
    marginTop: Spacing.lg,
  },
  resultText: {
    textAlign: 'center',
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  errorText: {
    textAlign: 'center',
    color: Colors.error,
  },
});

export default ImportWizard;
