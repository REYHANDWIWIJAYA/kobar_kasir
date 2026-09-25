import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10ac84',
        tabBarInactiveTintColor: '#a4b0be',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f2f6',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kasir',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>🛒</Text>,
        }}
      />
      <Tabs.Screen
        name="buku-kas"
        options={{
          title: 'Buku Kas',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>📖</Text>,
        }}
      />
      <Tabs.Screen
        name="tutup-shift"
        options={{
          title: 'Tutup Shift',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>🔒</Text>,
        }}
      />
      <Tabs.Screen
        name="laporan"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>📊</Text>,
        }}
      />
    </Tabs>
  );
}
