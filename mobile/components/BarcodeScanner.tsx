import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { CameraView, Camera } from 'expo-camera';
import { Colors, Spacing } from '../constants/theme';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
    Alert.alert(
      'Code-barres scanné',
      `Type: ${type}\nCode: ${data}`,
      [
        {
          text: 'Scanner à nouveau',
          onPress: () => setScanned(false)
        },
        {
          text: 'Fermer',
          onPress: onClose
        }
      ]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Demande de permission caméra...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.errorTitle}>Permission caméra refusée</Text>
        <Text variant="bodyMedium" style={styles.errorText}>
          Veuillez autoriser l'accès à la caméra dans les paramètres de votre appareil.
        </Text>
        <Button mode="contained" onPress={onClose} style={styles.button}>
          Fermer
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'code93',
            'codabar',
            'itf14',
          ],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <IconButton icon="close" iconColor="#fff" size={28} onPress={onClose} style={styles.closeButton} />
          </View>

          <View style={styles.scanArea}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>

          <View style={styles.instructions}>
            <Text variant="titleMedium" style={styles.instructionText}>
              Positionnez le code-barres dans le cadre
            </Text>
            {scanned && (
              <Button mode="contained" onPress={() => setScanned(false)} style={styles.scanAgainButton}>
                Scanner à nouveau
              </Button>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    paddingTop: Spacing.xl,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
  },
  cornerTopRight: {
    position: 'absolute',
    top: '30%',
    right: '15%',
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: '30%',
    left: '15%',
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: '30%',
    right: '15%',
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  instructions: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Spacing.md,
    borderRadius: 8,
  },
  scanAgainButton: {
    marginTop: Spacing.md,
  },
  errorTitle: {
    color: '#fff',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    margin: Spacing.xl,
  },
  button: {
    margin: Spacing.xl,
  },
});
