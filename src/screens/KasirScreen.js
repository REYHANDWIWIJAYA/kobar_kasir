import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const DUMMY_PRODUCTS = [
  { id: '1', name: 'Kopi Susu', price: 15000, category: 'Minuman' },
  { id: '2', name: 'Roti Bakar', price: 12000, category: 'Makanan' },
  { id: '3', name: 'Indomie Goreng', price: 10000, category: 'Makanan' },
  { id: '4', name: 'Kopi Komikat', price: 15000, category: 'Minuman' },
  { id: '5', name: 'Roti Bans', price: 12000, category: 'Makanan' },
];

export default function KasirScreen() {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  const addToCart = (product) => {
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

  if (showCart) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowCart(false)}>
            <Text style={styles.headerTitle}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Keranjang</Text>
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
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50 }}>Keranjang masih kosong</Text>}
        />
        <View style={styles.checkoutSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total Harga</Text>
            <Text style={styles.totalAmount}>Rp {totalHarga.toLocaleString('id-ID')}</Text>
          </View>
          <TouchableOpacity style={styles.payBtnCash}>
            <Text style={styles.payBtnText}>Tunai</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.payBtnQris}>
            <Text style={styles.payBtnTextQris}>QRIS</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kasir: Budi</Text>
          <Text style={styles.headerSub}>Trx: #1234</Text>
        </View>
        <TouchableOpacity style={styles.cartButtonHeader} onPress={() => setShowCart(true)}>
          <Text style={styles.cartButtonText}>🛒 Cart ({totalItem})</Text>
        </TouchableOpacity>
      </View>

      {/* Produk List */}
      <FlatList
        key="product-grid-2"
        data={DUMMY_PRODUCTS}
        numColumns={2}
        contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
            <View style={styles.productImagePlaceholder} />
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>Rp {item.price.toLocaleString('id-ID')}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <View style={styles.bottomCartBar}>
          <View>
            <Text style={styles.bottomCartItems}>{totalItem} Item</Text>
            <Text style={styles.bottomCartTotal}>Rp {totalHarga.toLocaleString('id-ID')}</Text>
          </View>
          <TouchableOpacity style={styles.bottomCartBtn} onPress={() => setShowCart(true)}>
            <Text style={styles.bottomCartBtnText}>Bayar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { backgroundColor: '#10ac84', padding: 16, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: 'white', fontSize: 14 },
  cartButtonHeader: { backgroundColor: '#019069', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  cartButtonText: { color: 'white', fontWeight: 'bold' },
  productCard: { width: (width / 2) - 20, margin: 10, backgroundColor: 'white', borderRadius: 8, padding: 15, alignItems: 'center', elevation: 2 },
  productImagePlaceholder: { width: 80, height: 80, backgroundColor: '#dfe6e9', borderRadius: 8, marginBottom: 10 },
  productName: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  productPrice: { fontSize: 13, color: '#10ac84', marginTop: 4, fontWeight: 'bold' },
  cartItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f2f6', alignItems: 'center' },
  cartItemName: { fontSize: 16, fontWeight: 'bold' },
  cartItemPrice: { fontSize: 14, color: '#10ac84', marginTop: 4 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 32, height: 32, backgroundColor: '#dfe6e9', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold' },
  qtyText: { marginHorizontal: 15, fontSize: 16, fontWeight: 'bold' },
  checkoutSection: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalText: { fontSize: 16, fontWeight: 'bold' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#10ac84' },
  payBtnCash: { backgroundColor: '#10ac84', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  payBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  payBtnQris: { backgroundColor: 'white', borderWidth: 1, borderColor: '#10ac84', padding: 14, borderRadius: 8, alignItems: 'center' },
  payBtnTextQris: { color: '#10ac84', fontWeight: 'bold', fontSize: 16 },
  bottomCartBar: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'white', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  bottomCartItems: { fontSize: 14, color: '#636e72' },
  bottomCartTotal: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  bottomCartBtn: { backgroundColor: '#10ac84', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  bottomCartBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
