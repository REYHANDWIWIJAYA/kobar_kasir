import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#10ac84' }}>
      <Tabs.Screen name="index" options={{ title: 'Kasir' }} />
      <Tabs.Screen name="buku-kas" options={{ title: 'Buku Kas' }} />
      <Tabs.Screen name="tutup-shift" options={{ title: 'Tutup Shift' }} />
      <Tabs.Screen name="laporan" options={{ title: 'Laporan' }} />
    </Tabs>
  );
}
