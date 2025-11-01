import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function InvoicesLayout() {
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
          title: 'Factures',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détail de la facture',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Nouvelle facture',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
