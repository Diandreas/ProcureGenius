import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';
import { useTranslation } from 'react-i18next';

export default function AIAssistantLayout() {
  const { t } = useTranslation();

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: Colors.primary },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    }}>
      <Stack.Screen name="index" options={{ title: t('aiAssistant.title') }} />
    </Stack>
  );
}
