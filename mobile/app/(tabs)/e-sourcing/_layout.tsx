import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function ESourcingLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: Colors.primary },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}>
      <Stack.Screen name="index" options={{ title: 'E-Sourcing' }} />
      <Stack.Screen name="rfq" options={{ headerShown: false }} />
      <Stack.Screen name="analysis" options={{ title: 'Analyse des offres' }} />
    </Stack>
  );
}
