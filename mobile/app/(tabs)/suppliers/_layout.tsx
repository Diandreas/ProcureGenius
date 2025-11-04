import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function SuppliersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Fournisseurs',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détail du fournisseur',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Nouveau fournisseur',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
