import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

const KEYS = {
  TRANSACTIONS: '@kasir_transactions',
  CASH_ENTRIES: '@kasir_cash_entries',
  SHIFTS: '@kasir_shifts',
  PRODUCTS: '@kasir_products',
  ACTIVE_SHIFT: '@kasir_active_shift',
};

export const DEFAULT_PRODUCTS = [
  // --- KOPI ---
  { id: '1', name: 'Es Kopi Aren', price: 15000, category: 'Kopi', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400' },
  { id: '2', name: 'Kopi Susu', price: 12000, category: 'Kopi', image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400' },
  { id: '3', name: 'Ice Americano', price: 10000, category: 'Kopi', image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400' },
  { id: '4', name: 'Kopi Hitam', price: 8000, category: 'Kopi', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400' },

  // --- NON KOPI ---
  { id: '5', name: 'Matcha', price: 13000, category: 'Non Kopi', image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400' },
  { id: '6', name: 'Redvelvet', price: 13000, category: 'Non Kopi', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400' },
  { id: '7', name: 'Thai Tea', price: 13000, category: 'Non Kopi', image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400' },
  { id: '8', name: 'Lemon Tea', price: 13000, category: 'Non Kopi', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400' },
  { id: '9', name: 'Coklat', price: 13000, category: 'Non Kopi', image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400' },
  { id: '10', name: 'Taro', price: 13000, category: 'Non Kopi', image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400' },
  { id: '11', name: 'Teh Susu', price: 10000, category: 'Non Kopi', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400' },
  { id: '12', name: 'Extrajos Susu', price: 7000, category: 'Non Kopi', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400' },

  // --- MAKANAN / CEMILAN ---
  { id: '13', name: 'Pisang Peppe', price: 12000, category: 'Makanan / Cemilan', image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400' },
  { id: '14', name: 'Ubi Ungu (Keju/Coklat)', price: 15000, category: 'Makanan / Cemilan', image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400' },
  { id: '15', name: 'Pop Mie', price: 10000, category: 'Makanan / Cemilan', image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400' },
];

export const StorageService = {
  // --- TRANSACTIONS ---
  async getTransactions() {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('timestamp', { ascending: false });

      if (!error && data) {
        const formatted = data.map(t => ({
          ...t,
          paymentMethod: t.payment_method || t.paymentMethod,
          cancelReason: t.cancel_reason || t.cancelReason,
          items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
        }));
        await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(formatted));
        return formatted;
      }
    } catch (e) {
      console.log('Supabase offline/not configured yet, reading AsyncStorage');
    }

    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
      return jsonStr ? JSON.parse(jsonStr) : [];
    } catch (e) {
      return [];
    }
  },

  async addTransaction(transaction) {
    try {
      const existing = await this.getTransactions();
      const updated = [transaction, ...existing];
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));

      // Sync ke Supabase Database
      await supabase.from('transactions').insert([
        {
          id: transaction.id,
          timestamp: transaction.timestamp,
          items: transaction.items,
          total: transaction.total,
          payment_method: transaction.paymentMethod,
          cashier: transaction.cashier,
          status: transaction.status || 'SUCCESS',
        },
      ]);

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

      const updatedTrxList = transactions.map(t =>
        t.id === transactionId ? { ...t, status: 'CANCELLED', cancelReason: reason || 'Dibatalkan' } : t
      );
      await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updatedTrxList));

      const cashEntries = await this.getCashEntries();
      const cleanedCashEntries = cashEntries.filter(c => {
        const isOriginalTrxEntry = c.notes && c.notes.includes(transactionId);
        const isVoidEntry = c.id && c.id.startsWith('CASH-VOID-') && c.notes && c.notes.includes(transactionId);
        return !isOriginalTrxEntry && !isVoidEntry;
      });
      await AsyncStorage.setItem(KEYS.CASH_ENTRIES, JSON.stringify(cleanedCashEntries));

      // Sync ke Supabase
      await supabase
        .from('transactions')
        .update({ status: 'CANCELLED', cancel_reason: reason || 'Dibatalkan' })
        .eq('id', transactionId);

      await supabase
        .from('cash_entries')
        .delete()
        .like('notes', `%${transactionId}%`);

      return { updatedTrxList, cleanedCashEntries };
    } catch (e) {
      console.error('Error cancelling transaction', e);
      return null;
    }
  },

  // --- CASH FLOW (BUKU KAS) ---
  async getCashEntries() {
    try {
      const { data, error } = await supabase
        .from('cash_entries')
        .select('*')
        .order('timestamp', { ascending: false });

      if (!error && data) {
        const filtered = data.filter(e => !e.id?.startsWith('CASH-VOID-') && !e.category?.includes('Pembatalan'));
        await AsyncStorage.setItem(KEYS.CASH_ENTRIES, JSON.stringify(filtered));
        return filtered;
      }
    } catch (e) {
      console.log('Reading cash entries from local storage');
    }

    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.CASH_ENTRIES);
      const data = jsonStr ? JSON.parse(jsonStr) : [];
      return data.filter(e => !e.id?.startsWith('CASH-VOID-') && !e.category?.includes('Pembatalan'));
    } catch (e) {
      return [];
    }
  },

  async addCashEntry(entry) {
    try {
      const existing = await this.getCashEntries();
      const updated = [entry, ...existing];
      await AsyncStorage.setItem(KEYS.CASH_ENTRIES, JSON.stringify(updated));

      // Sync ke Supabase
      await supabase.from('cash_entries').insert([entry]);

      return updated;
    } catch (e) {
      console.error('Error saving cash entry', e);
    }
  },

  // --- SHIFTS ---
  async getShifts() {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted = data.map(s => ({
          ...s,
          cashierName: s.cashier_name || s.cashierName,
          initialCash: s.initial_cash || s.initialCash,
          startTime: s.start_time || s.startTime,
          endTime: s.end_time || s.endTime,
          totalCashSales: s.total_cash_sales || s.totalCashSales,
          totalQrisSales: s.total_qris_sales || s.totalQrisSales,
          totalSales: s.total_sales || s.totalSales,
          expectedPhysicalCash: s.expected_physical_cash || s.expectedPhysicalCash,
          actualPhysicalCash: s.actual_physical_cash || s.actualPhysicalCash,
        }));
        await AsyncStorage.setItem(KEYS.SHIFTS, JSON.stringify(formatted));
        return formatted;
      }
    } catch (e) {
      console.log('Reading shifts from local storage');
    }

    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.SHIFTS);
      return jsonStr ? JSON.parse(jsonStr) : [];
    } catch (e) {
      return [];
    }
  },

  async getActiveShift() {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('status', 'OPEN')
        .order('start_time', { ascending: false })
        .limit(1);

      if (!error && data) {
        if (data.length > 0) {
          const s = data[0];
          const shiftObj = {
            id: s.id,
            cashierName: s.cashier_name || s.cashierName,
            initialCash: Number(s.initial_cash || s.initialCash || 0),
            startTime: s.start_time || s.startTime,
            status: 'OPEN',
          };
          await AsyncStorage.setItem(KEYS.ACTIVE_SHIFT, JSON.stringify(shiftObj));
          return shiftObj;
        } else {
          await AsyncStorage.removeItem(KEYS.ACTIVE_SHIFT);
          return null;
        }
      }
    } catch (e) {
      console.log('Error fetching active shift from Supabase');
    }

    try {
      const jsonStr = await AsyncStorage.getItem(KEYS.ACTIVE_SHIFT);
      return jsonStr ? JSON.parse(jsonStr) : null;
    } catch (e) {
      return null;
    }
  },

  async clearActiveShift() {
    try {
      await AsyncStorage.removeItem(KEYS.ACTIVE_SHIFT);
    } catch (e) {
      console.error('Error clearing active shift', e);
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

    // Sync start shift ke Supabase
    try {
      await supabase.from('shifts').upsert([
        {
          id: shift.id,
          cashier_name: shift.cashierName,
          initial_cash: shift.initialCash,
          start_time: shift.startTime,
          status: 'OPEN',
        },
      ]);
    } catch (e) {
      console.error('Error syncing start shift to Supabase', e);
    }

    return shift;
  },

  async closeShift(actualPhysicalCash) {
    try {
      const activeShift = await this.getActiveShift();
      if (!activeShift) return null;

      const transactions = await this.getTransactions();
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

      // Sync close shift ke Supabase (ubah status jadi CLOSED)
      await supabase.from('shifts').upsert([
        {
          id: closedShift.id,
          cashier_name: closedShift.cashierName,
          initial_cash: closedShift.initialCash,
          start_time: closedShift.startTime,
          end_time: closedShift.endTime,
          status: 'CLOSED',
          total_cash_sales: closedShift.totalCashSales,
          total_qris_sales: closedShift.totalQrisSales,
          total_sales: closedShift.totalSales,
          expected_physical_cash: closedShift.expectedPhysicalCash,
          actual_physical_cash: closedShift.actualPhysicalCash,
          discrepancy: closedShift.discrepancy,
        },
      ]);

      return closedShift;
    } catch (e) {
      console.error('Error closing shift', e);
    }
  },

  // --- PRODUCTS ---
  async getProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.log('Reading products from local storage');
    }

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
      const newProd = { ...product, id: Date.now().toString() };
      const updated = [...existing, newProd];
      await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(updated));

      // Sync ke Supabase
      await supabase.from('products').insert([newProd]);

      return updated;
    } catch (e) {
      console.error('Error adding product', e);
    }
  },

  async clearAllHistory() {
    try {
      await AsyncStorage.removeItem(KEYS.TRANSACTIONS);
      await AsyncStorage.removeItem(KEYS.CASH_ENTRIES);
      await AsyncStorage.removeItem(KEYS.SHIFTS);

      // Clear di Supabase
      await supabase.from('transactions').delete().neq('id', '0');
      await supabase.from('cash_entries').delete().neq('id', '0');
      await supabase.from('shifts').delete().neq('id', '0');

      return true;
    } catch (e) {
      console.error('Error clearing history', e);
      return false;
    }
  },
};
