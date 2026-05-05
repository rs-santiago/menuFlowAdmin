import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const setStorageItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

export const getStorageItem = async (key: string) => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return await SecureStore.getItemAsync(key);
};

export const removeStorageItem = async (key: string) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};