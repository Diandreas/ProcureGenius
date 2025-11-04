import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function PurchaseOrdersLayout() {
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
          title: 'Bons de commande',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détail du bon de commande',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Nouveau bon de commande',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
