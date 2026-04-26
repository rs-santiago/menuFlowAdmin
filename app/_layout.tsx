import { Stack, useRouter, useSegments } from 'expo-router';
import { deleteItemAsync, getItemAsync } from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import api from '../services/api'; // Ajuste o caminho se necessário

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Função para validar o token e os dados
  const checkAuth = async () => {
    const token = await getItemAsync('menuflow_token');
    const userData = await getItemAsync('menuflow_user');
    const inAuthGroup = segments[0] === 'login';

    if (!token && !inAuthGroup) {
      // Sem token e fora do login? Manda pro login
      router.replace('/login');
    } else if (token && userData) {
      // Se tem token, garante que o Axios do app inteiro vai usá-lo
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      if (inAuthGroup) {
        // Se já está logado e tentou abrir a tela de Login, faz o roteamento inteligente
        const user = JSON.parse(userData);
        
        if (user.role === 'SUPER_ADMIN' || user.brandIds?.length > 1) {
          router.replace('/(tabs)');
        } else if (user.brandIds?.length === 1) {
          router.replace(`/brand/${user.brandIds[0]}`);
        } else {
          // Token existe mas não tem lojas cadastradas (segurança)
          await deleteItemAsync('menuflow_token');
          await deleteItemAsync('menuflow_user');
          router.replace('/login');
        }
      }
    }
    
    if (!isReady) setIsReady(true);
  };

  useEffect(() => {
    checkAuth();
  }, [segments]); // Executa sempre que a rota mudar

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