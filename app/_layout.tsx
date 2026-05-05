import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import api from '../services/api';
import { getStorageItem, removeStorageItem } from '../utils/storage';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const checkAuth = async () => {
    // Usamos as nossas novas funções compatíveis com a Web
    const token = await getStorageItem('menuflow_token');
    const userData = await getStorageItem('menuflow_user');
    const inAuthGroup = segments[0] === 'login';

    if (!token && !inAuthGroup) {
      router.replace('/login');
    } else if (token && userData) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (inAuthGroup) {
        const user = JSON.parse(userData);
        
        if (user.role === 'SUPER_ADMIN' || user.brandIds?.length > 1) {
          router.replace('/(tabs)');
        } else if (user.brandIds?.length === 1) {
          router.replace(`/brand/${user.brandIds[0]}`);
        } else {
          await removeStorageItem('menuflow_token');
          await removeStorageItem('menuflow_user');
          router.replace('/login');
        }
      }
    }
    
    if (!isReady) setIsReady(true);
  };

  useEffect(() => {
    checkAuth();
  }, [segments]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#0A0A0A' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="brand/[id]" options={{ gestureEnabled: true }} /> 
    </Stack>
  );
}