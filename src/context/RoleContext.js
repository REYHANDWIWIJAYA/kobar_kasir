import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  }, []);

  const loadRoleAndPin = async () => {
    try {
      const savedRole = await AsyncStorage.getItem(KEY_ROLE);
      const savedPin = await AsyncStorage.getItem(KEY_PIN);
      if (savedRole) setRole(savedRole);
      if (savedPin) setPin(savedPin);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const switchToOwner = async (inputPin) => {
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
    setPin(newPin);
    await AsyncStorage.setItem(KEY_PIN, newPin);
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
