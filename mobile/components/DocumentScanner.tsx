import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Portal,
  Dialog,
  Text,
  Button,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
  IconButton,
  Divider,
  Checkbox,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../constants/theme';
import { useTranslation } from 'react-i18next';

interface DocumentScannerProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: (data: any) => void;
  documentType?: 'invoice' | 'receipt' | 'contract' | 'identity';
}

const DocumentScanner: React.FC<DocumentScannerProps> = ({
  visible,
  onDismiss,
  onSuccess,
  documentType = 'invoice',
}) => {
  const { t } = useTranslation();
  const cameraRef = useRef<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [autoCreate, setAutoCreate] = useState(true);
  const [extractedData, setExtractedData] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      requestPermissions();
    }
  }, [visible]);

  const requestPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        setCapturedImage(photo.uri);
        await processDocument(photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert(t('errors.error'), t('errors.cameraCaptureError'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const image = result.assets[0];
        setCapturedImage(image.uri);
        await processDocument(image.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('errors.error'), t('errors.imagePickError'));
    }
  };

  const processDocument = async (imageUri: string) => {
    setLoading(true);
    try {
      // Simulation du traitement OCR
      // Dans une vraie app, on appellerait une API OCR ici
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simuler les données extraites
      const mockExtractedData = {
        type: documentType,
        confidence: 0.92,
        fields: {
          invoice_number: 'INV-2024-001',
          date: new Date().toISOString(),
          total: '150.00',
          supplier: 'Example Corp',
        },
      };

      setExtractedData(mockExtractedData);

      Alert.alert(
        t('scanner.scanComplete'),
        t('scanner.dataExtracted'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              if (onSuccess && autoCreate) {
                onSuccess(mockExtractedData);
                handleClose();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error processing document:', error);
      Alert.alert(t('errors.error'), t('errors.ocrProcessError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setLoading(false);
    onDismiss();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setExtractedData(null);
  };

  if (hasPermission === null) {
    return null;
  }

  if (hasPermission === false) {
    return (
      <Portal>
        <Dialog visible={visible} onDismiss={handleClose}>
          <Dialog.Title>{t('scanner.noPermission')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('scanner.cameraPermissionRequired')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleClose}>{t('common.close')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleClose} style={styles.dialog}>
        <Dialog.Title>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons
              name="document-scanner"
              size={24}
              color={Colors.primary}
            />
            <Text variant="titleLarge" style={styles.title}>
              {t('scanner.scanDocument')}
            </Text>
          </View>
        </Dialog.Title>

        <Divider />

        <Dialog.Content style={styles.content}>
          <SegmentedButtons
            value={mode}
            onValueChange={(value) => setMode(value as 'camera' | 'upload')}
            buttons={[
              {
                value: 'camera',
                label: t('scanner.camera'),
                icon: 'camera',
              },
              {
                value: 'upload',
                label: t('scanner.upload'),
                icon: 'upload',
              },
            ]}
            style={styles.segmentedButtons}
          />

          {mode === 'camera' && !capturedImage && (
            <View style={styles.cameraContainer}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
              >
                <View style={styles.cameraOverlay}>
                  <View style={styles.scanFrame} />
                </View>
              </CameraView>

              <View style={styles.cameraControls}>
                <Button
                  mode="contained"
                  onPress={handleCapture}
                  icon="camera"
                  loading={loading}
                  disabled={loading}
                >
                  {t('scanner.capture')}
                </Button>
              </View>
            </View>
          )}

          {mode === 'upload' && !capturedImage && (
            <View style={styles.uploadContainer}>
              <MaterialCommunityIcons
                name="cloud-upload"
                size={64}
                color={Colors.disabled}
              />
              <Text variant="titleMedium" style={styles.uploadText}>
                {t('scanner.selectImage')}
              </Text>
              <Button
                mode="contained"
                onPress={handleUpload}
                icon="file-image"
                style={styles.uploadButton}
              >
                {t('scanner.chooseImage')}
              </Button>
            </View>
          )}

          {capturedImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />

              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text variant="bodyMedium" style={styles.loadingText}>
                    {t('scanner.processing')}
                  </Text>
                </View>
              )}

              {extractedData && !loading && (
                <Surface style={styles.resultsCard} elevation={2}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={32}
                    color={Colors.success}
                  />
                  <Text variant="titleMedium" style={styles.resultsTitle}>
                    {t('scanner.scanComplete')}
                  </Text>
                  <Text variant="bodySmall" style={styles.confidence}>
                    {t('scanner.confidence')}: {Math.round(extractedData.confidence * 100)}%
                  </Text>
                </Surface>
              )}

              <View style={styles.previewActions}>
                <Button onPress={handleRetake} icon="refresh">
                  {t('scanner.retake')}
                </Button>
              </View>
            </View>
          )}

          <View style={styles.optionsRow}>
            <Checkbox
              status={autoCreate ? 'checked' : 'unchecked'}
              onPress={() => setAutoCreate(!autoCreate)}
            />
            <Text variant="bodyMedium" style={styles.optionLabel}>
              {t('scanner.autoCreate')}
            </Text>
          </View>
        </Dialog.Content>

        <Divider />

        <Dialog.Actions>
          <Button onPress={handleClose}>{t('common.close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '95%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
    paddingTop: Spacing.md,
  },
  segmentedButtons: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cameraContainer: {
    height: 400,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '80%',
    height: '70%',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
  },
  cameraControls: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  uploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  uploadText: {
    marginVertical: Spacing.md,
    color: Colors.textSecondary,
  },
  uploadButton: {
    marginTop: Spacing.md,
  },
  previewContainer: {
    padding: Spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingText: {
    color: '#fff',
    marginTop: Spacing.md,
  },
  resultsCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  resultsTitle: {
    marginVertical: Spacing.sm,
    fontWeight: '600',
  },
  confidence: {
    color: Colors.textSecondary,
  },
  previewActions: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  optionLabel: {
    flex: 1,
  },
});

export default DocumentScanner;
