import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import KasirScreen from './src/screens/KasirScreen';
import BukuKasScreen from './src/screens/BukuKasScreen';
import TutupShiftScreen from './src/screens/TutupShiftScreen';
import LaporanScreen from './src/screens/LaporanScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#10ac84' }}>
        <Tab.Screen name="Kasir" component={KasirScreen} />
        <Tab.Screen name="Buku Kas" component={BukuKasScreen} />
        <Tab.Screen name="Tutup Shift" component={TutupShiftScreen} />
        <Tab.Screen name="Laporan" component={LaporanScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
