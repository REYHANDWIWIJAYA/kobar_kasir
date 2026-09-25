import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TRANSACTIONS: '@kasir_transactions',
  CASH_ENTRIES: '@kasir_cash_entries',
  SHIFTS: '@kasir_shifts',
  PRODUCTS: '@kasir_products',
  ACTIVE_SHIFT: '@kasir_active_shift',
};

export const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Kopi Susu', price: 15000, category: 'Minuman' },
  { id: '2', name: 'Roti Bakar', price: 12000, category: 'Makanan' },
  { id: '3', name: 'Indomie Goreng', price: 10000, category: 'Makanan' },
  { id: '4', name: 'Kopi Komikat', price: 15000, category: 'Minuman' },
  { id: '5', name: 'Roti Bans', price: 12000, category: 'Makanan' },
  { id: '6', name: 'Es Teh Manis', price: 5000, category: 'Minuman' },
  { id: '7', name: 'Pisang Goreng', price: 8000, category: 'Makanan' },
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

      // Update status transaksi menjadi CANCELLED
      const updatedTrxList = transactions.map(t =>
        t.id === transactionId ? { ...t, status: 'CANCELLED', cancelReason: reason || 'Dibatalkan' } : t
      );
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updatedTrxList));

      // Otomatis catat Kas Keluar (Pengembalian Uang) di Buku Kas
      const itemSummary = targetTrx.items.map(i => `${i.name} (${i.qty})`).join(', ');
      const cashEntry = {
        id: 'CASH-VOID-' + Date.now().toString().slice(-6),
        timestamp: new Date().toISOString(),
        type: 'out',
        category: `Pembatalan Transaksi (${targetTrx.paymentMethod})`,
        amount: targetTrx.total,
        notes: `Pembatalan No: ${targetTrx.id} - ${itemSummary}${reason ? ` (Alasan: ${reason})` : ''}`,
      };
      await this.addCashEntry(cashEntry);

      return { updatedTrxList, cashEntry };
    } catch (e) {
      console.error('Error cancelling transaction', e);
      return null;
    }
  },

  // --- CASH FLOW (BUKU KAS) ---
  async getCashEntries() {
    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.CASH_ENTRIES);
      return jsonStr ? JSON.parse(jsonStr) : [];
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
