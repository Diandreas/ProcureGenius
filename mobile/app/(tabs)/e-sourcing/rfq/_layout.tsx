import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../../constants/theme';

export default function RFQLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: Colors.primary },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}>
      <Stack.Screen name="index" options={{ title: 'Demandes de devis' }} />
      <Stack.Screen name="[id]" options={{ title: 'Détail de la demande' }} />
      <Stack.Screen name="create" options={{ title: 'Nouvelle demande', presentation: 'modal' }} />
    </Stack>
  );
}
