import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StorageService } from '../services/storage';
import SwipeButton from '../components/SwipeButton';

export default function TutupShiftScreen() {
  const [activeShift, setActiveShift] = useState(null);
  const [closedShifts, setClosedShifts] = useState([]);
  const [initialCash, setInitialCash] = useState('100000');
  const [physicalCashInput, setPhysicalCashInput] = useState('');
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

  const handleStartShift = async () => {
    if (isNaN(initialCash)) {
      Alert.alert('Error', 'Masukkan modal awal kas yang valid.');
      return;
    }

    const shift = await StorageService.startShift('Karyawan', initialCash);
    setActiveShift(shift);
    calculateLiveSummary(shift);
    Alert.alert('Shift Dimulai', 'Selamat bekerja! Shift hari ini berhasil dibuka.');
  };

  const handleCloseShift = async () => {
    if (physicalCashInput === '' || isNaN(physicalCashInput)) {
      Alert.alert('Perhatian', 'Silakan ketik jumlah uang fisik aktual di laci sebelum menggeser slider.');
      return;
    }

    const closed = await StorageService.closeShift(physicalCashInput);
    if (closed) {
      Alert.alert(
        'Tutup Shift Selesai',
        `Pekerjaan Hari Ini Selesai!\nSelisih Kas: Rp ${closed.discrepancy.toLocaleString('id-ID')}`
      );
      setActiveShift(null);
      setPhysicalCashInput('');
      setShiftSummary(null);
      const history = await StorageService.getShifts();
      setClosedShifts(history);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔒 Shift & Jam Kerja</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {activeShift ? (
          <View style={styles.card}>
            <View style={styles.badgeOpen}>
              <Text style={styles.badgeTextOpen}>● SEDANG BEKERJA</Text>
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

            <View style={styles.divider} />

            <Text style={styles.inputLabel}>Jumlah Uang Fisik Aktual di Laci (Rp):</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan Uang Fisik Laci (Rp)"
              keyboardType="numeric"
              value={physicalCashInput}
              onChangeText={setPhysicalCashInput}
            />

            {physicalCashInput !== '' && !isNaN(physicalCashInput) && (
              <View style={styles.discrepancyBox}>
                <Text style={styles.discrepancyLabel}>Estimasi Selisih Kas:</Text>
                <Text
                  style={[
                    styles.discrepancyVal,
                    {
                      color:
                        Number(physicalCashInput) - (shiftSummary?.expectedPhysicalCash || 0) === 0
                          ? '#10ac84'
                          : '#ee5253',
                    },
                  ]}
                >
                  Rp {(Number(physicalCashInput) - (shiftSummary?.expectedPhysicalCash || 0)).toLocaleString('id-ID')}
                </Text>
              </View>
            )}

            {/* Slider Slider Tutup Shift / Selesai Kerja */}
            <Text style={styles.sliderInstruction}>Geser slider di bawah ke kanan untuk menyelesaikan pekerjaan:</Text>
            <SwipeButton
              title="GESER UNTUK TUTUP SHIFT"
              color="#ee5253"
              onSwipeSuccess={handleCloseShift}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚀 Mulai Shift Kerja Baru</Text>
            <Text style={styles.cardSub}>Geser slider di bawah untuk membuka toko & memulai shift harian.</Text>

            <Text style={styles.inputLabel}>Modal Awal Kas di Laci (Rp):</Text>
            <TextInput
              style={styles.input}
              placeholder="Nominal Modal Awal (Rp)"
              keyboardType="numeric"
              value={initialCash}
              onChangeText={setInitialCash}
            />

            {/* Slider Mulai Kerja */}
            <SwipeButton
              title="GESER UNTUK MULAI KERJA"
              color="#10ac84"
              onSwipeSuccess={handleStartShift}
            />
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
  cardSub: { fontSize: 13, color: '#747d8c', marginBottom: 14 },
  badgeOpen: { alignSelf: 'flex-start', backgroundColor: '#e1b12c', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  badgeTextOpen: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  shiftCashier: { fontSize: 18, fontWeight: 'bold', color: '#2f3542' },
  shiftMeta: { fontSize: 12, color: '#747d8c', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  rowLabel: { fontSize: 14, color: '#57606f' },
  rowVal: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  rowLabelBold: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  rowValHighlight: { fontSize: 16, fontWeight: 'bold', color: '#10ac84' },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#57606f', marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: '#f1f2f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  discrepancyBox: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  discrepancyLabel: { fontSize: 14, color: '#2f3542' },
  discrepancyVal: { fontSize: 15, fontWeight: 'bold' },
  sliderInstruction: { fontSize: 12, color: '#747d8c', textAlign: 'center', marginTop: 10 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2f3542', marginBottom: 10 },
  historyCard: { backgroundColor: 'white', padding: 14, borderRadius: 10, marginBottom: 10, elevation: 1 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyCashier: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  historySelisih: { fontSize: 13, fontWeight: 'bold' },
  historySub: { fontSize: 12, color: '#747d8c', marginTop: 2 },
  emptyText: { color: '#a4b0be', fontSize: 13, textAlign: 'center', marginTop: 10 },
});
