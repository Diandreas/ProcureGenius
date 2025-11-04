import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as ReduxProvider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';
import '../i18n/config';

import { store } from '../store/store';
import { lightTheme, darkTheme } from '../constants/theme';
import { loadAuth } from '../store/slices/authSlice';

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </PaperProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Load auth state on app start
    store.dispatch(loadAuth());
  }, []);

  return (
    <ReduxProvider store={store}>
      <RootLayoutNav />
    </ReduxProvider>
  );
}
