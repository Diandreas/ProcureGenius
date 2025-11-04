import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function ContractsLayout() {
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
          title: 'Contrats',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détail du contrat',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Nouveau contrat',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
