import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

const KEY_ROLE = '@kasir_user_role';
const KEY_PIN = '@kasir_owner_pin';
const DEFAULT_PIN = '1234';

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [role, setRole] = useState('kasir'); // 'kasir' | 'owner'
  const [pin, setPin] = useState(DEFAULT_PIN);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRoleAndPin();

    // Auto-sync PIN dari cloud setiap 3 detik
    const timer = setInterval(() => {
      fetchCloudPin();
    }, 3000);

    // Realtime Supabase listener untuk perubahan PIN Owner
    const channel = supabase
      .channel('store-settings-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_settings' },
        (payload) => {
          if (payload.new && payload.new.key === 'owner_pin') {
            setPin(payload.new.value);
            AsyncStorage.setItem(KEY_PIN, payload.new.value);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCloudPin = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('key', 'owner_pin')
        .limit(1);

      if (!error && data && data.length > 0) {
        const cloudPin = data[0].value;
        if (cloudPin) {
          setPin(cloudPin);
          await AsyncStorage.setItem(KEY_PIN, cloudPin);
        }
      }
    } catch (e) {
      console.log('Reading PIN from local storage');
    }
  };

  const loadRoleAndPin = async () => {
    try {
      const savedPin = await AsyncStorage.getItem(KEY_PIN);
      if (savedPin) setPin(savedPin);

      await fetchCloudPin();

      // Setiap kali aplikasi baru dibuka, selalu mulai di Mode Kasir demi keamanan
      setRole('kasir');
      await AsyncStorage.setItem(KEY_ROLE, 'kasir');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToOwner = async (inputPin) => {
    await fetchCloudPin();

    if (inputPin === pin) {
      setRole('owner');
      await AsyncStorage.setItem(KEY_ROLE, 'owner');
      return true;
    }
    return false;
  };

  const switchToKasir = async () => {
    setRole('kasir');
    await AsyncStorage.setItem(KEY_ROLE, 'kasir');
  };

  const updatePin = async (newPin) => {
    try {
      setPin(newPin);
      await AsyncStorage.setItem(KEY_PIN, newPin);

      // Sync PIN baru ke Supabase Cloud
      await supabase.from('store_settings').upsert({
        key: 'owner_pin',
        value: newPin,
        updated_at: new Date().toISOString(),
      });

      return true;
    } catch (e) {
      console.error('Error updating pin', e);
      return false;
    }
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        pin,
        isLoading,
        isOwner: role === 'owner',
        switchToOwner,
        switchToKasir,
        updatePin,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
