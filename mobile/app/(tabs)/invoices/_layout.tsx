import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';
import { useTranslation } from 'react-i18next';

export default function InvoicesLayout() {
  const { t } = useTranslation();

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
          title: t('invoices.title'),
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('invoices.invoiceDetail'),
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t('invoices.newInvoice'),
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
