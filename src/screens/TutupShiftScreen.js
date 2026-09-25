import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StorageService } from '../services/storage';

export default function TutupShiftScreen() {
  const [activeShift, setActiveShift] = useState(null);
  const [closedShifts, setClosedShifts] = useState([]);
  const [cashierName, setCashierName] = useState('Budi');
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
    if (!cashierName || isNaN(initialCash)) {
      Alert.alert('Error', 'Masukkan nama kasir dan modal awal yang valid.');
      return;
    }

    const shift = await StorageService.startShift(cashierName, initialCash);
    setActiveShift(shift);
    calculateLiveSummary(shift);
    Alert.alert('Shift Dimulai', `Shift untuk ${cashierName} berhasil dibuka.`);
  };

  const handleCloseShift = async () => {
    if (!physicalCashInput || isNaN(physicalCashInput)) {
      Alert.alert('Error', 'Masukkan jumlah uang fisik di laci saat ini.');
      return;
    }

    const closed = await StorageService.closeShift(physicalCashInput);
    if (closed) {
      Alert.alert(
        'Shift Ditutup',
        `Tutup Shift Berhasil!\nSelisih Kas: Rp ${closed.discrepancy.toLocaleString('id-ID')}`
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
        <Text style={styles.headerTitle}>🔒 Tutup Shift Kasir</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {activeShift ? (
          <View style={styles.card}>
            <View style={styles.badgeOpen}>
              <Text style={styles.badgeTextOpen}>● SHIFT AKTIF</Text>
            </View>

            <Text style={styles.shiftCashier}>Kasir: {activeShift.cashierName}</Text>
            <Text style={styles.shiftMeta}>ID: {activeShift.id}</Text>
            <Text style={styles.shiftMeta}>
              Mulai: {formatDate(activeShift.startTime)}
            </Text>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Modal Awal Kas</Text>
              <Text style={styles.rowVal}>Rp {activeShift.initialCash.toLocaleString('id-ID')}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total Penjualan Tunai</Text>
              <Text style={styles.rowVal}>Rp {(shiftSummary?.cashSales || 0).toLocaleString('id-ID')}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total Penjualan QRIS</Text>
              <Text style={styles.rowVal}>Rp {(shiftSummary?.qrisSales || 0).toLocaleString('id-ID')}</Text>
            </View>

            <View style={[styles.row, { marginTop: 6 }]}>
              <Text style={styles.rowLabelBold}>Ekspektasi Uang Fisik Laci</Text>
              <Text style={styles.rowValHighlight}>
                Rp {(shiftSummary?.expectedPhysicalCash || 0).toLocaleString('id-ID')}
              </Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.inputLabel}>Jumlah Uang Fisik Aktual di Laci:</Text>
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

            <TouchableOpacity style={styles.closeShiftBtn} onPress={handleCloseShift}>
              <Text style={styles.closeShiftText}>SELESAI & TUTUP SHIFT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Buka Shift Baru</Text>
            <Text style={styles.inputLabel}>Nama Kasir</Text>
            <TextInput
              style={styles.input}
              placeholder="Nama Kasir"
              value={cashierName}
              onChangeText={setCashierName}
            />

            <Text style={styles.inputLabel}>Modal Awal Kas (Laci)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nominal Modal Awal (Rp)"
              keyboardType="numeric"
              value={initialCash}
              onChangeText={setInitialCash}
            />

            <TouchableOpacity style={styles.startShiftBtn} onPress={handleStartShift}>
              <Text style={styles.startShiftText}>BUKA SHIFT SEKARANG</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Riwayat Shift */}
        <Text style={styles.historyTitle}>Riwayat Shift Terakhir</Text>
        {closedShifts.map(item => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyCashier}>{item.cashierName} ({item.id})</Text>
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
              Mulai: {formatDate(item.startTime)}
            </Text>
            <Text style={styles.historySub}>
              Penjualan: Tunai Rp {item.totalCashSales.toLocaleString('id-ID')} | QRIS Rp {item.totalQrisSales.toLocaleString('id-ID')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { backgroundColor: '#10ac84', padding: 16, paddingTop: 40 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 3, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2f3542', marginBottom: 12 },
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
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: '#57606f', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: '#f1f2f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  discrepancyBox: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  discrepancyLabel: { fontSize: 14, color: '#2f3542' },
  discrepancyVal: { fontSize: 15, fontWeight: 'bold' },
  closeShiftBtn: { backgroundColor: '#ee5253', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  closeShiftText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  startShiftBtn: { backgroundColor: '#10ac84', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  startShiftText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2f3542', marginBottom: 10 },
  historyCard: { backgroundColor: 'white', padding: 14, borderRadius: 10, marginBottom: 10, elevation: 1 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyCashier: { fontSize: 14, fontWeight: 'bold', color: '#2f3542' },
  historySelisih: { fontSize: 13, fontWeight: 'bold' },
  historySub: { fontSize: 12, color: '#747d8c', marginTop: 2 },
});
