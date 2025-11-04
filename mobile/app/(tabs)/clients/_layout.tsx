import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function ClientsLayout() {
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
          title: 'Clients',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détail du client',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Nouveau client',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
