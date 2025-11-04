import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function ProductsLayout() {
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
          title: 'Produits',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détail du produit',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Nouveau produit',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
