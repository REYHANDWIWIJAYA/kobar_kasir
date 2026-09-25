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

export default function TutupShiftScreen() {
  const [activeShift, setActiveShift] = useState(null);
  const [closedShifts, setClosedShifts] = useState([]);
  const [shiftSummary, setShiftSummary] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadShiftData();
    }, [])
  );

  const loadShiftData = async () => {
    const shift = await StorageService.getActiveShift();
    const history = await StorageService.getShifts();
    setActiveShift(shift);
    setClosedShifts(history);

    if (shift) {
      calculateLiveSummary(shift);
    }
  };

  const calculateLiveSummary = async (shift) => {
    const transactions = await StorageService.getTransactions();
    const shiftTrx = transactions.filter(
      t => new Date(t.timestamp) >= new Date(shift.startTime)
    );

    const cashSales = shiftTrx
      .filter(t => t.paymentMethod === 'Tunai')
      .reduce((sum, t) => sum + t.total, 0);

    const qrisSales = shiftTrx
      .filter(t => t.paymentMethod === 'QRIS')
      .reduce((sum, t) => sum + t.total, 0);

    const expectedPhysicalCash = shift.initialCash + cashSales;

    setShiftSummary({
      trxCount: shiftTrx.length,
      cashSales,
      qrisSales,
      totalSales: cashSales + qrisSales,
      expectedPhysicalCash,
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
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
        <Text style={styles.headerTitle}>🔒 Status Shift & Jam Kerja</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {activeShift ? (
          <View style={styles.card}>
            <View style={styles.badgeOpen}>
              <Text style={styles.badgeTextOpen}>● SHIFT AKTIF (ON)</Text>
            </View>

            <Text style={styles.shiftCashier}>Status Toko: Buka</Text>
            <Text style={styles.shiftMeta}>
              Mulai Kerja: {formatDate(activeShift.startTime)}
            </Text>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Modal Awal Laci</Text>
              <Text style={styles.rowVal}>Rp {activeShift.initialCash.toLocaleString('id-ID')}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Penjualan Tunai</Text>
              <Text style={styles.rowVal}>Rp {(shiftSummary?.cashSales || 0).toLocaleString('id-ID')}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Penjualan QRIS</Text>
              <Text style={styles.rowVal}>Rp {(shiftSummary?.qrisSales || 0).toLocaleString('id-ID')}</Text>
            </View>

            <View style={[styles.row, { marginTop: 6 }]}>
              <Text style={styles.rowLabelBold}>Ekspektasi Uang Fisik Laci</Text>
              <Text style={styles.rowValHighlight}>
                Rp {(shiftSummary?.expectedPhysicalCash || 0).toLocaleString('id-ID')}
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Untuk menutup shift kerja, gunakan **Switch Toggle (ON / OFF)** di pojok kanan atas **Halaman Kasir**.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.badgeClosed}>
              <Text style={styles.badgeTextClosed}>● SHIFT MATI (OFF)</Text>
            </View>
            <Text style={styles.cardTitle}>Status Toko: Tutup</Text>
            <Text style={styles.cardSub}>
              Belum ada shift kerja yang aktif.
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Untuk memulai shift kerja baru, gunakan **Switch Toggle (ON / OFF)** di pojok kanan atas **Halaman Kasir**.
              </Text>
            </View>
          </View>
        )}

        {/* Riwayat Shift */}
        <Text style={styles.historyTitle}>Riwayat Shift Terakhir</Text>
        {closedShifts.length > 0 ? (
          closedShifts.map(item => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyCashier}>Shift Selesai ({item.id})</Text>
                <Text
                  style={[
                    styles.historySelisih,
                    { color: item.discrepancy === 0 ? '#10ac84' : '#ee5253' },
                  ]}
                >
                  Selisih: Rp {item.discrepancy.toLocaleString('id-ID')}
                </Text>
              </View>
              <Text style={styles.historySub}>
                Waktu: {formatDate(item.startTime)} - {formatDate(item.endTime)}
              </Text>
              <Text style={styles.historySub}>
                Total Penjualan: Rp {(item.totalSales || 0).toLocaleString('id-ID')} (Tunai Rp {(item.totalCashSales || 0).toLocaleString('id-ID')} | QRIS Rp {(item.totalQrisSales || 0).toLocaleString('id-ID')})
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Belum ada riwayat shift yang ditutup</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { backgroundColor: '#10ac84', padding: 16, paddingTop: 40 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 18, elevation: 3, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2f3542', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#747d8c', marginBottom: 10 },
  badgeOpen: { alignSelf: 'flex-start', backgroundColor: '#2ed573', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  badgeTextOpen: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  badgeClosed: { alignSelf: 'flex-start', backgroundColor: '#ff4757', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  badgeTextClosed: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  shiftCashier: { fontSize: 18, fontWeight: 'bold', color: '#2f3542' },
  shiftMeta: { fontSize: 12, color: '#747d8c', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  rowLabel: { fontSize: 14, color: '#57606f' },
  rowVal: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  rowLabelBold: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  rowValHighlight: { fontSize: 16, fontWeight: 'bold', color: '#10ac84' },
  infoBox: { backgroundColor: '#f1f2f6', padding: 12, borderRadius: 10, marginTop: 14 },
  infoText: { fontSize: 12, color: '#57606f', lineHeight: 18 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2f3542', marginBottom: 10 },
  historyCard: { backgroundColor: 'white', padding: 14, borderRadius: 10, marginBottom: 10, elevation: 1 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyCashier: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  historySelisih: { fontSize: 13, fontWeight: 'bold' },
  historySub: { fontSize: 12, color: '#747d8c', marginTop: 2 },
  emptyText: { color: '#a4b0be', fontSize: 13, textAlign: 'center', marginTop: 10 },
});
