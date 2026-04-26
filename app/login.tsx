import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      // 1. Salva o token e os dados do usuário com segurança
      await SecureStore.setItemAsync('menuflow_token', token);
      await SecureStore.setItemAsync('menuflow_user', JSON.stringify(user));

      // 2. Configura o Axios para usar o token em todas as próximas requisições
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // 3. SMART ROUTING (Mágica do Multi-Tenant)
      if (user.role === 'SUPER_ADMIN' || user.brandIds?.length > 1) {
        // Tem várias lojas ou é o dono do sistema: Vai pro Dashboard Global
        router.replace('/(tabs)');
      } else if (user.brandIds?.length === 1) {
        // Tem só 1 loja: Vai direto pro gerenciamento da loja dele
        router.replace(`/brand/${user.brandIds[0]}`);
      } else {
        // Não tem loja vinculada
        Alert.alert('Sem Acesso', 'Nenhuma loja vinculada a este usuário.');
        await SecureStore.deleteItemAsync('menuflow_token');
        await SecureStore.deleteItemAsync('menuflow_user');
      }

    } catch (error: any) {
      console.log(error.response);
      const message = error.response?.data?.message || 'Falha na autenticação';
      Alert.alert('Erro de Login', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={styles.logo}>Menu<Text style={{ color: '#F59E0B' }}>Flow</Text></Text>
      <Text style={styles.subtitle}>ADMIN PANEL</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>ENTRAR NO FLUXO</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', padding: 20 },
  logo: { fontSize: 42, fontWeight: '900', color: '#FFF', letterSpacing: -2 },
  subtitle: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold', letterSpacing: 4, marginBottom: 40 },
  inputContainer: { width: '100%', maxWidth: 400 },
  input: { backgroundColor: '#171717', borderWidth: 1, borderColor: '#262626', borderRadius: 16, padding: 18, color: '#FFF', marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#F59E0B', borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 10, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});