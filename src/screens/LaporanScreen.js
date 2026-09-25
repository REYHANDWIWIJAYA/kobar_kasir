import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StorageService } from '../services/storage';

export default function LaporanScreen() {
  const [transactions, setTransactions] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadReportData();
    }, [])
  );

  const loadReportData = async () => {
    const trxData = await StorageService.getTransactions();
    const cashData = await StorageService.getCashEntries();
    setTransactions(trxData);
    setCashEntries(cashData);
  };

  const activeTransactions = transactions.filter(t => t.status !== 'CANCELLED');
  const totalOmset = activeTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalPengeluaran = cashEntries.filter(c => c.type === 'out').reduce((sum, c) => sum + c.amount, 0);
  const labaBersih = totalOmset - totalPengeluaran;

  // Hitung Produk Terlaris
  const productStats = {};
  activeTransactions.forEach(t => {
    t.items.forEach(item => {
      if (!productStats[item.name]) {
        productStats[item.name] = { name: item.name, qty: 0, total: 0 };
      }
      productStats[item.name].qty += item.qty;
      productStats[item.name].total += item.price * item.qty;
    });
  });

  const topProducts = Object.values(productStats).sort((a, b) => b.qty - a.qty);

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agus', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Laporan Penjualan & Laba</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Ringkasan Keuangan Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ringkasan Keuangan</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Omset</Text>
              <Text style={styles.statOmset}>Rp {totalOmset.toLocaleString('id-ID')}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Pengeluaran Kas</Text>
              <Text style={styles.statExpense}>Rp {totalPengeluaran.toLocaleString('id-ID')}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.labaRow}>
            <Text style={styles.labaLabel}>Estimasi Laba Bersih</Text>
            <Text style={[styles.labaValue, { color: labaBersih >= 0 ? '#10ac84' : '#ee5253' }]}>
              Rp {labaBersih.toLocaleString('id-ID')}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              Total Transaksi Berhasil: {activeTransactions.length} Trx
            </Text>
          </View>
        </View>

        {/* Produk Terlaris */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏆 Produk Terlaris</Text>
          {topProducts.length > 0 ? (
            topProducts.slice(0, 5).map((prod, index) => (
              <View key={prod.name} style={styles.topProdRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.prodName}>{prod.name}</Text>
                  <Text style={styles.prodSub}>{prod.qty} Terjual</Text>
                </View>
                <Text style={styles.prodTotal}>Rp {prod.total.toLocaleString('id-ID')}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada data penjualan</Text>
          )}
        </View>

        {/* Riwayat Transaksi Terbaru */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📜 Transaksi Terakhir</Text>
          {transactions.length > 0 ? (
            transactions.slice(0, 15).map(trx => (
              <View key={trx.id} style={styles.trxRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trxId}>{trx.id} ({trx.paymentMethod})</Text>
                  <Text style={styles.trxMeta}>
                    {formatDate(trx.timestamp)} - {trx.items.length} item
                  </Text>
                </View>
                <Text style={styles.trxTotal}>Rp {trx.total.toLocaleString('id-ID')}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Belum ada transaksi terjadi</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { backgroundColor: '#10ac84', padding: 16, paddingTop: 40 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 3, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2f3542', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#747d8c', marginBottom: 4 },
  statOmset: { fontSize: 16, fontWeight: 'bold', color: '#10ac84' },
  statExpense: { fontSize: 16, fontWeight: 'bold', color: '#ee5253' },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginVertical: 12 },
  labaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labaLabel: { fontSize: 15, fontWeight: 'bold', color: '#2f3542' },
  labaValue: { fontSize: 18, fontWeight: 'bold' },
  metaRow: { marginTop: 10, alignItems: 'center' },
  metaText: { fontSize: 12, color: '#a4b0be' },
  topProdRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f2f6', justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: 'bold', color: '#10ac84' },
  prodName: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  prodSub: { fontSize: 12, color: '#747d8c' },
  prodTotal: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  emptyText: { color: '#a4b0be', fontSize: 13, textAlign: 'center', marginVertical: 10 },
  trxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f2f6' },
  trxId: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  trxMeta: { fontSize: 11, color: '#747d8c', marginTop: 2 },
  trxTotal: { fontSize: 14, fontWeight: 'bold', color: '#10ac84' },
});
