import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BukuKasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buku Kas Masuk & Keluar</Text>
      <Text>Fitur ini akan segera hadir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
});
