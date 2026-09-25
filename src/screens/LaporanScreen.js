import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StorageService } from '../services/storage';
import { supabase } from '../services/supabaseClient';
import { useRole } from '../context/RoleContext';

export default function LaporanScreen() {
  const { isOwner, updatePin } = useRole();
  const [transactions, setTransactions] = useState([]);
  const [cashEntries, setCashEntries] = useState([]);

  // Change PIN State
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  useEffect(() => {
    loadReportData();

    // 1. Timer Auto-Sync 3 Detik
    const timer = setInterval(() => {
      loadReportData();
    }, 3000);

    // 2. Realtime WebSocket listener untuk Laporan Penjualan & Cash
    const channel = supabase
      .channel('laporan-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => loadReportData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_entries' },
        () => loadReportData()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

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
    const itemsList = Array.isArray(t.items)
      ? t.items
      : (typeof t.items === 'string' ? (JSON.parse(t.items || '[]')) : []);
    itemsList.forEach(item => {
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

  const handleExportCSV = async () => {
    if (transactions.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Tidak ada data transaksi untuk diexport.');
      } else {
        Alert.alert('Info', 'Tidak ada data transaksi untuk diexport.');
      }
      return;
    }

    let csv = 'ID Transaksi,Waktu,Metode Pembayaran,Status,Total (Rp),Item Penjualan\n';

    transactions.forEach(t => {
      const itemDetails = t.items
        ? t.items.map(i => `${i.name} (${i.qty}x)`).join('; ')
        : '';
      const formattedDate = formatDate(t.timestamp).replace(/,/g, '');
      const cleanItems = `"${itemDetails.replace(/"/g, '""')}"`;
      csv += `${t.id},${formattedDate},${t.paymentMethod || 'Tunai'},${t.status || 'SUCCESS'},${t.total},${cleanItems}\n`;
    });

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `Laporan_Penjualan_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      try {
        await Share.share({
          title: 'Export Laporan Penjualan',
          message: csv,
        });
      } catch (e) {
        Alert.alert('Error', 'Gagal membagikan laporan CSV');
      }
    }
  };

  const handleClearHistory = () => {
    const executeClear = async () => {
      const success = await StorageService.clearAllHistory();
      if (success) {
        await loadReportData();
        if (Platform.OS === 'web') {
          window.alert('Riwayat transaksi, buku kas, dan shift berhasil dibersihkan!');
        } else {
          Alert.alert('Sukses', 'Riwayat transaksi, buku kas, dan shift berhasil dibersihkan!');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Apakah Anda yakin ingin menghapus SELURUH riwayat transaksi, buku kas, dan shift? Data yang dihapus tidak dapat dikembalikan.')) {
        executeClear();
      }
    } else {
      Alert.alert(
        'Bersihkan Riwayat Lama',
        'Apakah Anda yakin ingin menghapus SELURUH riwayat transaksi, buku kas, dan shift? Data yang dihapus tidak dapat dikembalikan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Hapus Semua', style: 'destructive', onPress: executeClear },
        ]
      );
    }
  };

  const handleSaveNewPin = async () => {
    if (!newPinInput || newPinInput.length < 4) {
      if (Platform.OS === 'web') {
        window.alert('PIN baru harus berupa angka minimal 4 digit.');
      } else {
        Alert.alert('PIN Tidak Valid', 'PIN baru harus berupa angka minimal 4 digit.');
      }
      return;
    }

    const pinToSave = newPinInput;
    await updatePin(pinToSave);
    setShowChangePinModal(false);
    setNewPinInput('');

    if (Platform.OS === 'web') {
      window.alert(`PIN Owner berhasil diubah! PIN baru Anda: ${pinToSave}`);
    } else {
      Alert.alert('Berhasil', `PIN Owner berhasil diubah! PIN baru Anda: ${pinToSave}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Laporan Penjualan & Laba</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Fitur Khusus Owner: Export, Maintenance & PIN */}
        {isOwner && (
          <View style={[styles.card, styles.ownerCard]}>
            <View style={styles.ownerHeaderRow}>
              <Text style={styles.ownerCardTitle}>👑 Manajemen & Pemeliharaan Owner</Text>
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerBadgeText}>MODE OWNER</Text>
              </View>
            </View>

            <Text style={styles.ownerDesc}>
              Export laporan ke Excel (CSV), bersihkan riwayat lama, atau ubah PIN keamanan Owner.
            </Text>

            <View style={styles.ownerActionGrid}>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={handleExportCSV}
                activeOpacity={0.8}
              >
                <Text style={styles.exportBtnText}>📥 Export Laporan Excel (CSV)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changePinBtn}
                onPress={() => setShowChangePinModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.changePinBtnText}>🔑 Ubah PIN Owner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearHistory}
                activeOpacity={0.8}
              >
                <Text style={styles.clearBtnText}>🗑️ Bersihkan Riwayat Lama</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            transactions.slice(0, 15).map(trx => {
              const isCancelled = trx.status === 'CANCELLED';
              return (
                <View key={trx.id} style={styles.trxRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.trxId, isCancelled && styles.trxCancelledText]}>
                        {trx.id} ({trx.paymentMethod})
                      </Text>
                      {isCancelled && (
                        <View style={styles.cancelledBadge}>
                          <Text style={styles.cancelledBadgeText}>DIBATALKAN</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.trxMeta}>
                      {formatDate(trx.timestamp)} - {Array.isArray(trx.items) ? trx.items.length : (typeof trx.items === 'string' ? JSON.parse(trx.items || '[]').length : 0)} item
                    </Text>
                  </View>
                  <Text style={[styles.trxTotal, isCancelled && styles.trxCancelledText]}>
                    Rp {trx.total.toLocaleString('id-ID')}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Belum ada transaksi terjadi</Text>
          )}
        </View>
      </ScrollView>

      {/* Modal Ubah PIN Owner */}
      <Modal visible={showChangePinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔑 Ubah PIN Owner</Text>
            <Text style={styles.modalSub}>
              Masukkan 4 digit angka PIN baru untuk keamanan Mode Owner.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Masukkan PIN Baru (e.g. 5678)"
              keyboardType="numeric"
              maxLength={8}
              secureTextEntry
              value={newPinInput}
              onChangeText={setNewPinInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => {
                  setShowChangePinModal(false);
                  setNewPinInput('');
                }}
              >
                <Text style={styles.cancelModalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.savePinBtn} onPress={handleSaveNewPin}>
                <Text style={styles.savePinText}>Simpan PIN Baru</Text>
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
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 3, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2f3542', marginBottom: 12 },
  ownerCard: { backgroundColor: '#2f3542', borderColor: '#10ac84', borderWidth: 1 },
  ownerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ownerCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  ownerBadge: { backgroundColor: '#10ac84', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ownerBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  ownerDesc: { fontSize: 12, color: '#c8d6e5', marginBottom: 14, lineHeight: 18 },
  ownerActionGrid: { gap: 10 },
  exportBtn: { backgroundColor: '#10ac84', padding: 12, borderRadius: 8, alignItems: 'center' },
  exportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  changePinBtn: { backgroundColor: '#0984e3', padding: 12, borderRadius: 8, alignItems: 'center' },
  changePinBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  clearBtn: { backgroundColor: '#ff4757', padding: 12, borderRadius: 8, alignItems: 'center' },
  clearBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
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
  trxId: { fontSize: 14, fontWeight: 'bold', color: '#2f3542', marginRight: 6 },
  trxMeta: { fontSize: 11, color: '#747d8c', marginTop: 2 },
  trxTotal: { fontSize: 14, fontWeight: 'bold', color: '#10ac84' },
  trxCancelledText: { textDecorationLine: 'line-through', color: '#a4b0be' },
  cancelledBadge: { backgroundColor: '#ff4757', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cancelledBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: 'white', borderRadius: 14, padding: 20, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2f3542', textAlign: 'center', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#747d8c', textAlign: 'center', marginBottom: 16 },
  modalInput: { backgroundColor: '#f1f2f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  cancelModalBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  cancelModalText: { color: '#747d8c', fontWeight: 'bold' },
  savePinBtn: { backgroundColor: '#10ac84', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  savePinText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
});

