import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { RoleProvider, useRole } from '../context/RoleContext';

function TabNavigation() {
  const { isOwner } = useRole();

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
          href: isOwner ? '/buku-kas' : null,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>📖</Text>,
        }}
      />
      <Tabs.Screen
        name="tutup-shift"
        options={{
          title: 'Tutup Shift',
          href: isOwner ? '/tutup-shift' : null,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>🔒</Text>,
        }}
      />
      <Tabs.Screen
        name="laporan"
        options={{
          title: 'Laporan',
          href: isOwner ? '/laporan' : null,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>📊</Text>,
        }}
      />
    </Tabs>
  );
}

export default function Layout() {
  return (
    <RoleProvider>
      <TabNavigation />
    </RoleProvider>
  );
}
