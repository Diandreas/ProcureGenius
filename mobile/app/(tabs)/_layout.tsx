import React from 'react';
import { Tabs } from 'expo-router';
import { Image } from 'react-native';
import { Colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size }) => (
            <Image
              source={require('../../assets/icon/dashboard.png')}
              style={{ width: size, height: size, tintColor: Colors.primary }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Factures',
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={require('../../assets/icon/bill.png')}
              style={{ width: size, height: size, tintColor: Colors.primary }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produits',
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={require('../../assets/icon/product.png')}
              style={{ width: size, height: size, tintColor: Colors.primary }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={require('../../assets/icon/user.png')}
              style={{ width: size, height: size, tintColor: Colors.primary }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: 'Fournisseurs',
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={require('../../assets/icon/supplier.png')}
              style={{ width: size, height: size, tintColor: Colors.primary }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="purchase-orders"
        options={{
          title: 'Commandes',
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image
              source={require('../../assets/icon/purchase-order.png')}
              style={{ width: size, height: size, tintColor: Colors.primary }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: 'Contrats',
          headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="e-sourcing"
        options={{
          title: 'E-Sourcing',
          headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{
          title: 'Assistant IA',
          headerShown: false,
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Plus',
          tabBarIcon: ({ size }) => (
            <Image
              source={require('../../assets/icon/setting.png')}
              style={{ width: size, height: size, tintColor: Colors.primary }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
