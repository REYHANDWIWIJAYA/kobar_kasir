import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { StorageService } from '../services/storage';
import { supabase } from '../services/supabaseClient';
import ShiftToggleSwitch from '../components/ShiftToggleSwitch';
import { useRole } from '../context/RoleContext';

const { width } = Dimensions.get('window');

export default function KasirScreen() {
  const { role, isOwner, switchToOwner, switchToKasir } = useRole();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeShift, setActiveShift] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  // Shift Toggle Modals
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [initialCashInput, setInitialCashInput] = useState('100.000');
  const [physicalCashInput, setPhysicalCashInput] = useState('');
  const [closeShiftSummary, setCloseShiftSummary] = useState(null);

  // Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCat, setNewProdCat] = useState('Makanan');
  const [newProdImage, setNewProdImage] = useState('');

  useEffect(() => {
    loadData();

    // Listener Realtime Supabase agar status shift otomatis sinkron di semua HP saat ON/OFF
    const channel = supabase
      .channel('shift-sync-kasir')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const prods = await StorageService.getProducts();
    const shift = await StorageService.getActiveShift();
    setProducts(prods);
    setActiveShift(shift);
  };

  const handleRoleToggle = () => {
    if (isOwner) {
      switchToKasir();
      Alert.alert('Mode Kasir', 'Kembali ke Mode Kasir. Akses Buku Kas & Laporan dikunci.');
    } else {
      setShowPinModal(true);
    }
  };

  const handleConfirmPin = async () => {
    const success = await switchToOwner(pinInput);
    if (success) {
      setShowPinModal(false);
      setPinInput('');
      Alert.alert('Mode Owner Aktif', 'Selamat datang Owner! Seluruh menu (Buku Kas, Shift, Laporan) telah dibuka.');
    } else {
      Alert.alert('PIN Salah', 'PIN Owner tidak cocok. (Default PIN: 1234)');
    }
  };

  const handleToggleShift = async () => {
    if (activeShift) {
      const transactions = await StorageService.getTransactions();
      const shiftTrx = transactions.filter(
        t => new Date(t.timestamp) >= new Date(activeShift.startTime)
      );

      const cashSales = shiftTrx
        .filter(t => t.paymentMethod === 'Tunai')
        .reduce((sum, t) => sum + t.total, 0);

      const qrisSales = shiftTrx
        .filter(t => t.paymentMethod === 'QRIS')
        .reduce((sum, t) => sum + t.total, 0);

      const expectedPhysicalCash = activeShift.initialCash + cashSales;

      setCloseShiftSummary({
        cashSales,
        qrisSales,
        expectedPhysicalCash,
      });
      setShowCloseShiftModal(true);
    } else {
      setShowStartShiftModal(true);
    }
  };

  const formatNumberInput = (text) => {
    if (!text) return '';
    const raw = text.toString().replace(/\D/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('id-ID');
  };

  const parseNumberInput = (text) => {
    if (!text) return 0;
    const raw = text.toString().replace(/\D/g, '');
    return Number(raw) || 0;
  };

  const confirmStartShift = async () => {
    const numericCash = parseNumberInput(initialCashInput);
    const shift = await StorageService.startShift('Kasir', numericCash);
    setActiveShift(shift);
    setShowStartShiftModal(false);
    Alert.alert('Shift Aktif', 'Selamat bekerja! Status shift sekarang ON.');
  };

  const confirmCloseShift = async () => {
    if (!physicalCashInput) {
      Alert.alert('Perhatian', 'Masukkan jumlah uang fisik aktual di laci.');
      return;
    }

    const numericPhysical = parseNumberInput(physicalCashInput);
    const closed = await StorageService.closeShift(numericPhysical);
    if (closed) {
      Alert.alert(
        'Shift Ditutup (OFF)',
        `Pekerjaan Selesai!\nSelisih Kas: Rp ${closed.discrepancy.toLocaleString('id-ID')}`
      );
      setActiveShift(null);
      setPhysicalCashInput('');
      setShowCloseShiftModal(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProdName || !newProdPrice) {
      Alert.alert('Form Belum Lengkap', 'Masukkan nama menu dan harga produk.');
      return;
    }

    const numericPrice = parseNumberInput(newProdPrice);
    const newProduct = {
      name: newProdName,
      price: numericPrice,
      category: newProdCat || 'Makanan',
      image: newProdImage || '',
    };

    await StorageService.addProduct(newProduct);
    await loadData();
    setShowAddProductModal(false);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdCat('Makanan');
    setNewProdImage('');
    Alert.alert('Berhasil', `Menu "${newProdName}" berhasil ditambahkan!`);
  };

  const categories = ['Semua', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (product) => {
    if (!activeShift) {
      Alert.alert(
        'Shift Belum Aktif (OFF)',
        'Status shift saat ini OFF. Silakan aktifkan (ON) shift kerja terlebih dahulu untuk mulai memasukkan pesanan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Mulai Shift (ON)', onPress: () => setShowStartShiftModal(true) },
        ]
      );
      return;
    }

    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const existing = cart.find(item => item.id === productId);
    if (existing.qty === 1) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item => item.id === productId ? { ...item, qty: item.qty - 1 } : item));
    }
  };

  const totalHarga = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalItem = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleOpenCart = () => {
    if (!activeShift) {
      Alert.alert(
        'Shift Belum Aktif (OFF)',
        'Status shift saat ini OFF. Silakan aktifkan (ON) shift kerja terlebih dahulu.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Mulai Shift (ON)', onPress: () => setShowStartShiftModal(true) },
        ]
      );
      return;
    }
    setShowCart(true);
  };

  const handleCheckout = async (paymentMethod) => {
    if (cart.length === 0) {
      Alert.alert('Keranjang Kosong', 'Pilih minimal 1 produk terlebih dahulu.');
      return;
    }

    const transaction = {
      id: 'TRX-' + Date.now().toString().slice(-6),
      timestamp: new Date().toISOString(),
      items: cart,
      total: totalHarga,
      paymentMethod,
      cashier: activeShift ? activeShift.cashierName : 'Kasir',
    };

    await StorageService.addTransaction(transaction);

    // Otomatis catat Kas Masuk ke Buku Kas
    const itemSummary = cart.map(i => `${i.name} (${i.qty})`).join(', ');
    await StorageService.addCashEntry({
      id: 'CASH-' + Date.now().toString().slice(-6),
      timestamp: transaction.timestamp,
      type: 'in',
      category: `Penjualan Kasir (${paymentMethod})`,
      amount: totalHarga,
      notes: `No: ${transaction.id} - ${itemSummary}`,
    });

    setLastTransaction(transaction);
    setCart([]);
    setShowCart(false);
    setShowReceipt(true);
  };

  const handleCancelCompletedTransaction = async () => {
    if (!lastTransaction) return;

    const currentTrx = lastTransaction;

    // 1. LANGSUNG TUTUP MODAL & RESET STATE INSTAN
    setShowReceipt(false);
    setShowCart(false);
    setCart([]);
    setLastTransaction(null);

    // 2. Simpan pembatalan & catat pengembalian ke Buku Kas di background
    await StorageService.cancelTransaction(currentTrx.id, 'Dibatalkan langsung dari Struk Kasir');
  };

  if (showCart) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowCart(false)}>
            <Text style={styles.headerTitle}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Keranjang ({totalItem})</Text>
        </View>

        <FlatList
          key="cart-list"
          data={cart}
          contentContainerStyle={{ padding: 16 }}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>Rp {item.price.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Keranjang masih kosong</Text>
            </View>
          }
        />

        {cart.length > 0 && (
          <View style={styles.checkoutSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Total Harga</Text>
              <Text style={styles.totalAmount}>Rp {totalHarga.toLocaleString('id-ID')}</Text>
            </View>
            <TouchableOpacity style={styles.payBtnCash} onPress={() => handleCheckout('Tunai')}>
              <Text style={styles.payBtnText}>💵 Bayar Tunai</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.payBtnQris} onPress={() => handleCheckout('QRIS')}>
              <Text style={styles.payBtnTextQris}>📱 Bayar QRIS</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header dengan Switch Role & Toggle ON/OFF */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Kasir Toko</Text>
            <TouchableOpacity style={styles.roleBadge} onPress={handleRoleToggle}>
              <Text style={styles.roleBadgeText}>
                {isOwner ? '👑 Owner' : '👤 Mode Kasir'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSub}>
            Status: {activeShift ? '🟢 SHIFT ON' : '🔴 SHIFT OFF'} | Role: {isOwner ? 'Owner' : 'Kasir'}
          </Text>
        </View>

        <View style={styles.headerRightControls}>
          <TouchableOpacity style={styles.cartButtonHeader} onPress={() => setShowCart(true)}>
            <Text style={styles.cartButtonText}>🛒 ({totalItem})</Text>
          </TouchableOpacity>

          {/* Toggle Switch ON / OFF di Pojok Atas Kanan */}
          <View style={{ marginLeft: 8 }}>
            <ShiftToggleSwitch
              isOn={!!activeShift}
              onToggle={handleToggleShift}
            />
          </View>
        </View>
      </View>

      {/* Search Bar & Button Tambah Produk */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama produk..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {isOwner && (
          <TouchableOpacity style={styles.addMenuBtn} onPress={() => setShowAddProductModal(true)}>
            <Text style={styles.addMenuBtnText}>+ Menu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Warning Banner Jika Shift Belum ON */}
      {!activeShift && (
        <TouchableOpacity
          style={styles.shiftWarningBanner}
          activeOpacity={0.8}
          onPress={() => setShowStartShiftModal(true)}
        >
          <Text style={styles.shiftWarningText}>
            🔒 Shift belum ON! Tekan di sini untuk Mulai Shift & Berjualan.
          </Text>
        </TouchableOpacity>
      )}

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Produk List */}
      <FlatList
        key="product-grid-2"
        data={filteredProducts}
        numColumns={2}
        contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.productInitial}>{item.name.charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productPrice}>Rp {item.price.toLocaleString('id-ID')}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <View style={styles.bottomCartBar}>
          <View>
            <Text style={styles.bottomCartItems}>{totalItem} Item terpilih</Text>
            <Text style={styles.bottomCartTotal}>Rp {totalHarga.toLocaleString('id-ID')}</Text>
          </View>
          <TouchableOpacity style={styles.bottomCartBtn} onPress={() => setShowCart(true)}>
            <Text style={styles.bottomCartBtnText}>Lihat Keranjang →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal PIN Owner */}
      <Modal visible={showPinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.shiftModalCard}>
            <Text style={[styles.shiftModalTitle, { color: '#10ac84' }]}>🔑 Masukkan PIN Owner</Text>
            <Text style={styles.shiftModalSub}>Masukkan PIN Owner untuk membuka fitur Buku Kas, Shift & Laporan (Default: 1234):</Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              secureTextEntry
              placeholder="PIN Owner (Default: 1234)"
              value={pinInput}
              onChangeText={setPinInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => { setShowPinModal(false); setPinInput(''); }}
              >
                <Text style={styles.cancelModalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmStartBtn}
                onPress={handleConfirmPin}
              >
                <Text style={styles.confirmBtnText}>MASUK OWNER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Tambah Menu / Produk Baru */}
      <Modal visible={showAddProductModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.shiftModalCard}>
            <Text style={[styles.shiftModalTitle, { color: '#10ac84' }]}>➕ Tambah Menu Baru</Text>
            <Text style={styles.shiftModalSub}>Masukkan rincian menu makanan/minuman baru toko Anda:</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Nama Menu (e.g. Es Jeruk)"
              value={newProdName}
              onChangeText={setNewProdName}
            />

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Harga Jual (Rp)"
              value={newProdPrice}
              onChangeText={(text) => setNewProdPrice(formatNumberInput(text))}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Kategori (e.g. Makanan / Minuman)"
              value={newProdCat}
              onChangeText={setNewProdCat}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="URL Gambar Produk (opsional)"
              value={newProdImage}
              onChangeText={setNewProdImage}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowAddProductModal(false)}
              >
                <Text style={styles.cancelModalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmStartBtn}
                onPress={handleSaveProduct}
              >
                <Text style={styles.confirmBtnText}>SIMPAN MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Buka Shift (Turn ON) */}
      <Modal visible={showStartShiftModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.shiftModalCard}>
            <Text style={styles.shiftModalTitle}>🚀 Buka Shift (Turn ON)</Text>
            <Text style={styles.shiftModalSub}>Masukkan modal awal kas di laci meja Anda:</Text>
            
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={initialCashInput}
              onChangeText={(text) => setInitialCashInput(formatNumberInput(text))}
              placeholder="Modal Awal Kas (Rp)"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowStartShiftModal(false)}
              >
                <Text style={styles.cancelModalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmStartBtn}
                onPress={confirmStartShift}
              >
                <Text style={styles.confirmBtnText}>MULAI SHIFT (ON)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Tutup Shift (Turn OFF) */}
      <Modal visible={showCloseShiftModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.shiftModalCard}>
            <Text style={[styles.shiftModalTitle, { color: '#ff4757' }]}>🔒 Tutup Shift (Turn OFF)</Text>

            <Text style={styles.shiftModalSub}>Ketik jumlah uang fisik nyata di laci saat ini:</Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={physicalCashInput}
              onChangeText={(text) => setPhysicalCashInput(formatNumberInput(text))}
              placeholder="Uang Fisik Aktual (Rp)"
            />

            {physicalCashInput !== '' && (
              <Text style={styles.discrepancyText}>
                Selisih Kas: Rp {(parseNumberInput(physicalCashInput) - (closeShiftSummary?.expectedPhysicalCash || 0)).toLocaleString('id-ID')}
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowCloseShiftModal(false)}
              >
                <Text style={styles.cancelModalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCloseBtn}
                onPress={confirmCloseShift}
              >
                <Text style={styles.confirmBtnText}>SELESAI (OFF)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Struk Transaksi */}
      <Modal visible={showReceipt} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptTitle}>🎉 Transaksi Berhasil!</Text>
            <Text style={styles.receiptSubtitle}>No: {lastTransaction?.id}</Text>
            <Text style={styles.receiptMeta}>Metode: {lastTransaction?.paymentMethod}</Text>
            <Text style={styles.receiptMeta}>
              Waktu: {lastTransaction ? new Date(lastTransaction.timestamp).toLocaleTimeString('id-ID') : ''}
            </Text>

            <View style={styles.divider} />

            {lastTransaction?.items.map(item => (
              <View key={item.id} style={styles.receiptRow}>
                <Text style={{ flex: 1 }}>{item.name} x{item.qty}</Text>
                <Text>Rp {(item.price * item.qty).toLocaleString('id-ID')}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>TOTAL</Text>
              <Text style={styles.receiptTotalVal}>
                Rp {lastTransaction?.total.toLocaleString('id-ID')}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeReceiptBtn} onPress={() => setShowReceipt(false)}>
              <Text style={styles.closeReceiptText}>Selesai & Transaksi Baru</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelReceiptBtn} onPress={handleCancelCompletedTransaction}>
              <Text style={styles.cancelReceiptBtnText}>🚫 Batalkan Transaksi Ini</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { backgroundColor: '#10ac84', padding: 16, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#ffffff', fontSize: 12, opacity: 0.9, marginTop: 2 },
  roleBadge: { backgroundColor: '#019069', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 8 },
  roleBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  headerRightControls: { flexDirection: 'row', alignItems: 'center' },
  cartButtonHeader: { backgroundColor: '#019069', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  cartButtonText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  searchRow: { padding: 10, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#f1f2f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, marginRight: 8 },
  addMenuBtn: { backgroundColor: '#10ac84', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  addMenuBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  categoryBar: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'white', maxHeight: 50 },
  categoryPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f2f6', marginRight: 8 },
  categoryPillActive: { backgroundColor: '#10ac84' },
  categoryText: { fontSize: 13, color: '#57606f', fontWeight: '500' },
  categoryTextActive: { color: 'white', fontWeight: 'bold' },
  productCard: { width: (width / 2) - 16, margin: 8, backgroundColor: 'white', borderRadius: 12, padding: 10, alignItems: 'center', elevation: 2 },
  productImage: { width: 75, height: 75, borderRadius: 10, marginBottom: 8 },
  productImagePlaceholder: { width: 75, height: 75, backgroundColor: '#ee5253', borderRadius: 37.5, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  productInitial: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  productName: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', color: '#2f3542' },
  productPrice: { fontSize: 13, color: '#10ac84', marginTop: 4, fontWeight: 'bold' },
  cartItem: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f1f2f6', alignItems: 'center' },
  cartItemName: { fontSize: 15, fontWeight: 'bold', color: '#2f3542' },
  cartItemPrice: { fontSize: 14, color: '#10ac84', marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 32, height: 32, backgroundColor: '#dfe6e9', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: '#2f3542' },
  qtyText: { marginHorizontal: 14, fontSize: 15, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#a4b0be' },
  checkoutSection: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalText: { fontSize: 16, fontWeight: 'bold' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#10ac84' },
  payBtnCash: { backgroundColor: '#10ac84', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  payBtnQris: { backgroundColor: '#0984e3', padding: 14, borderRadius: 10, alignItems: 'center' },
  payBtnTextQris: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  bottomCartBar: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'white', padding: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  bottomCartItems: { fontSize: 13, color: '#747d8c' },
  bottomCartTotal: { fontSize: 17, fontWeight: 'bold', color: '#2f3542' },
  bottomCartBtn: { backgroundColor: '#10ac84', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  bottomCartBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  shiftModalCard: { backgroundColor: 'white', borderRadius: 14, padding: 20, width: '100%' },
  shiftModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2ed573', textAlign: 'center', marginBottom: 8 },
  shiftModalSub: { fontSize: 13, color: '#747d8c', marginBottom: 12 },
  modalInput: { backgroundColor: '#f1f2f6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  discrepancyText: { fontSize: 13, fontWeight: 'bold', color: '#ff4757', marginBottom: 12, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelModalBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  cancelModalText: { color: '#747d8c', fontWeight: 'bold' },
  confirmStartBtn: { backgroundColor: '#2ed573', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  confirmCloseBtn: { backgroundColor: '#ff4757', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  confirmBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  receiptCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, width: '100%', elevation: 10 },
  receiptTitle: { fontSize: 20, fontWeight: 'bold', color: '#10ac84', textAlign: 'center', marginBottom: 4 },
  receiptSubtitle: { fontSize: 14, color: '#747d8c', textAlign: 'center', marginBottom: 2 },
  receiptMeta: { fontSize: 13, color: '#747d8c', textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  receiptTotalLabel: { fontSize: 16, fontWeight: 'bold' },
  receiptTotalVal: { fontSize: 18, fontWeight: 'bold', color: '#10ac84' },
  closeReceiptBtn: { backgroundColor: '#10ac84', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  closeReceiptText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  cancelReceiptBtn: { backgroundColor: '#ffeaa7', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  cancelReceiptBtnText: { color: '#d63031', fontWeight: 'bold', fontSize: 14 },
  shiftWarningBanner: {
    backgroundColor: '#ff4757',
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shiftWarningText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
  },
});
