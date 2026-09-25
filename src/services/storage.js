import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TRANSACTIONS: '@kasir_transactions',
  CASH_ENTRIES: '@kasir_cash_entries',
  SHIFTS: '@kasir_shifts',
  PRODUCTS: '@kasir_products',
  ACTIVE_SHIFT: '@kasir_active_shift',
};

export const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Kopi Susu', price: 15000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=300' },
  { id: '2', name: 'Roti Bakar', price: 12000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=300' },
  { id: '3', name: 'Indomie Goreng', price: 10000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300' },
  { id: '4', name: 'Kopi Komikat', price: 15000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=300' },
  { id: '5', name: 'Roti Bans', price: 12000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300' },
  { id: '6', name: 'Es Teh Manis', price: 5000, category: 'Minuman', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300' },
  { id: '7', name: 'Pisang Goreng', price: 8000, category: 'Makanan', image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=300' },
];

export const StorageService = {
  // --- TRANSACTIONS ---
  async getTransactions() {
    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
      return jsonStr ? JSON.parse(jsonStr) : [];
    } catch (e) {
      console.error('Error reading transactions', e);
      return [];
    }
  },

  async addTransaction(transaction) {
    try {
      const existing = await this.getTransactions();
      const updated = [transaction, ...existing];
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving transaction', e);
    }
  },

  async cancelTransaction(transactionId, reason = '') {
    try {
      const transactions = await this.getTransactions();
      const targetTrx = transactions.find(t => t.id === transactionId);
      if (!targetTrx || targetTrx.status === 'CANCELLED') return null;

      // 1. Update status transaksi menjadi CANCELLED di daftar transaksi (Laporan)
      const updatedTrxList = transactions.map(t =>
        t.id === transactionId ? { ...t, status: 'CANCELLED', cancelReason: reason || 'Dibatalkan' } : t
      );
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updatedTrxList));

      // 2. Hapus entri kas terkait dari Buku Kas (tidak menambah Kas Keluar)
      const cashEntries = await this.getCashEntries();
      const cleanedCashEntries = cashEntries.filter(c => {
        // Hapus entri penjualan asli untuk transaksi ini dan entri void terdahulu
        const isOriginalTrxEntry = c.notes && c.notes.includes(transactionId);
        const isVoidEntry = c.id && c.id.startsWith('CASH-VOID-') && c.notes && c.notes.includes(transactionId);
        return !isOriginalTrxEntry && !isVoidEntry;
      });
      await AsyncStorage.setItem(KEYS.CASH_ENTRIES, JSON.stringify(cleanedCashEntries));

      return { updatedTrxList, cleanedCashEntries };
    } catch (e) {
      console.error('Error cancelling transaction', e);
      return null;
    }
  },

  // --- CASH FLOW (BUKU KAS) ---
  async getCashEntries() {
    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.CASH_ENTRIES);
      const data = jsonStr ? JSON.parse(jsonStr) : [];
      // Filter keluar entri pembatalan transaksi dari Buku Kas (supaya tidak masuk Kas Keluar)
      return data.filter(e => !e.id?.startsWith('CASH-VOID-') && !e.category?.includes('Pembatalan'));
    } catch (e) {
      console.error('Error reading cash entries', e);
      return [];
    }
  },

  async addCashEntry(entry) {
    try {
      const existing = await this.getCashEntries();
      const updated = [entry, ...existing];
      await AsyncStorage.setItem(KEYS.CASH_ENTRIES, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving cash entry', e);
    }
  },

  // --- SHIFTS ---
  async getShifts() {
    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.SHIFTS);
      return jsonStr ? JSON.parse(jsonStr) : [];
    } catch (e) {
      console.error('Error reading shifts', e);
      return [];
    }
  },

  async getActiveShift() {
    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.ACTIVE_SHIFT);
      return jsonStr ? JSON.parse(jsonStr) : null;
    } catch (e) {
      return null;
    }
  },

  async startShift(cashierName, initialCash) {
    const shift = {
      id: 'SHIFT-' + Date.now().toString().slice(-4),
      cashierName: cashierName || 'Kasir 1',
      initialCash: Number(initialCash) || 0,
      startTime: new Date().toISOString(),
      status: 'OPEN',
    };
    await AsyncStorage.setItem(KEYS.ACTIVE_SHIFT, JSON.stringify(shift));
    return shift;
  },

  async closeShift(actualPhysicalCash) {
    try {
      const activeShift = await this.getActiveShift();
      if (!activeShift) return null;

      const transactions = await this.getTransactions();
      // Filter transactions made during this active shift
      const shiftTrx = transactions.filter(
        t => new Date(t.timestamp) >= new Date(activeShift.startTime)
      );

      const totalCashSales = shiftTrx
        .filter(t => t.paymentMethod === 'Tunai')
        .reduce((sum, t) => sum + t.total, 0);

      const totalQrisSales = shiftTrx
        .filter(t => t.paymentMethod === 'QRIS')
        .reduce((sum, t) => sum + t.total, 0);

      const expectedPhysicalCash = activeShift.initialCash + totalCashSales;
      const discrepancy = Number(actualPhysicalCash) - expectedPhysicalCash;

      const closedShift = {
        ...activeShift,
        endTime: new Date().toISOString(),
        status: 'CLOSED',
        totalCashSales,
        totalQrisSales,
        totalSales: totalCashSales + totalQrisSales,
        expectedPhysicalCash,
        actualPhysicalCash: Number(actualPhysicalCash),
        discrepancy,
      };

      const shifts = await this.getShifts();
      await AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify([closedShift, ...shifts]));
      await AsyncStorage.removeItem(KEYS.ACTIVE_SHIFT);
      return closedShift;
    } catch (e) {
      console.error('Error closing shift', e);
    }
  },

  // --- PRODUCTS ---
  async getProducts() {
    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.PRODUCTS);
      if (jsonStr) return JSON.parse(jsonStr);
      await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    } catch (e) {
      return DEFAULT_PRODUCTS;
    }
  },

  async addProduct(product) {
    try {
      const existing = await this.getProducts();
      const updated = [...existing, { ...product, id: Date.now().toString() }];
      await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error adding product', e);
    }
  },
};
