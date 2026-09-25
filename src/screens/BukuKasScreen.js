import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StorageService } from '../services/storage';

export default function BukuKasScreen() {
  const [entries, setEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState('out'); // 'in' or 'out'
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadCashEntries();
    }, [])
  );

  const loadCashEntries = async () => {
    const data = await StorageService.getCashEntries();
    setEntries(data);
  };

  const handleSaveEntry = async () => {
    if (!category || !amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert('Input Tidak Valid', 'Silakan isi kategori dan jumlah nominal uang dengan benar.');
      return;
    }

    const newEntry = {
      id: 'CASH-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      type,
      category,
      amount: Number(amount),
      notes: notes || '-',
    };

    const updated = await StorageService.addCashEntry(newEntry);
    setEntries(updated);
    setShowModal(false);
    setCategory('');
    setAmount('');
    setNotes('');
  };

  const totalIn = entries.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0);
  const totalOut = entries.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0);
  const saldoKas = totalIn - totalOut;

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
        <Text style={styles.headerTitle}>📖 Buku Kas Toko</Text>
      </View>

      {/* Ringkasan Saldo Card */}
      <View style={styles.summaryCard}>
        <View style={styles.saldoRow}>
          <Text style={styles.saldoLabel}>Saldo Kas Saat Ini</Text>
          <Text style={[styles.saldoValue, { color: saldoKas >= 0 ? '#10ac84' : '#ee5253' }]}>
            Rp {saldoKas.toLocaleString('id-ID')}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Kas Masuk (+)</Text>
            <Text style={styles.statIn}>Rp {totalIn.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Kas Keluar (-)</Text>
            <Text style={styles.statOut}>Rp {totalOut.toLocaleString('id-ID')}</Text>
          </View>
        </View>
      </View>

      {/* Section Title & Action Button */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Riwayat Kas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Catat Kas Manual</Text>
        </TouchableOpacity>
      </View>

      {/* List Catatan Kas */}
      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.entryCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.categoryRow}>
                <Text style={styles.entryCategory}>{item.category}</Text>
                {item.category.includes('Penjualan Kasir') && (
                  <View style={styles.autoBadge}>
                    <Text style={styles.autoBadgeText}>⚡ Otomatis</Text>
                  </View>
                )}
              </View>
              <Text style={styles.entryNotes}>{item.notes}</Text>
              <Text style={styles.entryTime}>📅 {formatDate(item.timestamp)}</Text>
            </View>
            <Text style={[styles.entryAmount, { color: item.type === 'in' ? '#10ac84' : '#ee5253' }]}>
              {item.type === 'in' ? '+' : '-'} Rp {item.amount.toLocaleString('id-ID')}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Belum ada catatan kas masuk/keluar</Text>
          </View>
        }
      />

      {/* Modal Catat Kas */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Catat Transaksi Kas</Text>

            {/* Toggle Masuk / Keluar */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, type === 'in' && styles.toggleBtnIn]}
                onPress={() => setType('in')}
              >
                <Text style={[styles.toggleText, type === 'in' && styles.toggleTextActive]}>Kas Masuk (+)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, type === 'out' && styles.toggleBtnOut]}
                onPress={() => setType('out')}
              >
                <Text style={[styles.toggleText, type === 'out' && styles.toggleTextActive]}>Kas Keluar (-)</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Kategori (e.g. Listrik, Bayar Supplier, Modal)"
              value={category}
              onChangeText={setCategory}
            />

            <TextInput
              style={styles.input}
              placeholder="Jumlah Nominal (Rp)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <TextInput
              style={styles.input}
              placeholder="Catatan / Keterangan Tambahan"
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEntry}>
                <Text style={styles.saveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { backgroundColor: '#10ac84', padding: 16, paddingTop: 40 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  summaryCard: { margin: 16, backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 3 },
  saldoRow: { alignItems: 'center' },
  saldoLabel: { fontSize: 13, color: '#747d8c', marginBottom: 4 },
  saldoValue: { fontSize: 24, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#f1f2f6', marginVertical: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#747d8c', marginBottom: 2 },
  statIn: { fontSize: 15, fontWeight: 'bold', color: '#10ac84' },
  statOut: { fontSize: 15, fontWeight: 'bold', color: '#ee5253' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2f3542' },
  addBtn: { backgroundColor: '#10ac84', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  entryCard: { backgroundColor: 'white', padding: 14, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  entryCategory: { fontSize: 14, fontWeight: 'bold', color: '#2f3542', marginRight: 6 },
  autoBadge: { backgroundColor: '#e1b12c', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  autoBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  entryNotes: { fontSize: 13, color: '#747d8c', marginTop: 3 },
  entryTime: { fontSize: 11, color: '#a4b0be', marginTop: 4 },
  entryAmount: { fontSize: 15, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#a4b0be', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', borderRadius: 14, padding: 20, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#2f3542' },
  toggleRow: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, backgroundColor: '#f1f2f6', padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  toggleBtnIn: { backgroundColor: '#10ac84' },
  toggleBtnOut: { backgroundColor: '#ee5253' },
  toggleText: { fontSize: 13, fontWeight: 'bold', color: '#747d8c' },
  toggleTextActive: { color: 'white' },
  input: { backgroundColor: '#f1f2f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  cancelText: { color: '#747d8c', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#10ac84', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveText: { color: 'white', fontWeight: 'bold' },
});
