import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';
import api from '../services/api';
import { setStorageItem } from '../utils/storage';

// =====================================================================
// COMPONENTE EXTRAÍDO (FORA DA TELA PRINCIPAL) PARA NÃO PERDER O FOCO
// =====================================================================
const DismissKeyboardWrapper = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
};
// =====================================================================

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    iconName: 'info' as keyof typeof Feather.glyphMap,
    iconColor: '#F59E0B',
  });

  const showAlert = (title: string, message: string, iconName: keyof typeof Feather.glyphMap = 'info', iconColor = '#F59E0B') => {
    setAlertConfig({ visible: true, title, message, iconName, iconColor });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Atenção', 'Preencha seu e-mail e senha para continuar.', 'info', '#F59E0B');
      return;
    }

    setLoading(true);
    if (Platform.OS !== 'web') Keyboard.dismiss(); 

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: password
      });

      const { token, user } = response.data;

      await setStorageItem('menuflow_token', token);
      await setStorageItem('menuflow_user', JSON.stringify(user));

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      router.replace('/(tabs)');

    } catch (error: any) {
      console.error('error ==> ', error);
      
      if (error.response?.status === 401) {
        showAlert('Acesso Negado', 'E-mail ou senha incorretos.', 'x-circle', '#EF4444');
      } else {
        const message = error.response?.data?.message || 'Não foi possível conectar ao servidor.';
        showAlert('Erro de Login', message, 'alert-triangle', '#EF4444');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <DismissKeyboardWrapper>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.content}>
            
            <View style={styles.formContainerWrapper}>
              
              {/* LOGO & BOAS-VINDAS */}
              <View style={styles.header}>
                <View style={styles.logoIcon}>
                  <Feather name="layers" size={40} color="#000" />
                </View>
                <Text style={styles.title}>Menu<Text style={{ color: '#F59E0B' }}>Flow</Text></Text>
                <Text style={styles.subtitle}>Gerencie seu império de onde estiver.</Text>
              </View>

              {/* FORMULÁRIO */}
              <View style={styles.form}>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>E-MAIL</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="mail" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                      placeholder="seu@email.com"
                      placeholderTextColor="#444"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                      editable={!loading}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>SENHA</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="lock" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                      placeholder="••••••••"
                      placeholderTextColor="#444"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
                </TouchableOpacity>

                {/* BOTÃO DE LOGIN */}
                <TouchableOpacity
                  style={[styles.loginButton, loading && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.loginButtonText}>ENTRAR NO SISTEMA</Text>
                  )}
                </TouchableOpacity>

              </View>
            </View>

            {/* COMPONENTE DE ALERTA DINÂMICO */}
            <CustomAlert
              visible={alertConfig.visible}
              title={alertConfig.title}
              message={alertConfig.message}
              iconName={alertConfig.iconName}
              iconColor={alertConfig.iconColor}
              onConfirm={hideAlert} 
            />

          </View>
        </KeyboardAvoidingView>
      </DismissKeyboardWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  formContainerWrapper: {
    width: '100%',
    maxWidth: 450, 
    alignSelf: 'center', 
  },
  header: { alignItems: 'center', marginBottom: 50 },
  logoIcon: { backgroundColor: '#F59E0B', width: 80, height: 80, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  title: { color: '#FFF', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#888', fontSize: 15, marginTop: 10, textAlign: 'center' },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { color: '#666', fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1.5, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', borderWidth: 1, borderColor: '#262626', borderRadius: 16, height: 60, paddingHorizontal: 15 },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, color: '#FFF', fontSize: 16, height: '100%' },
  eyeIcon: { padding: 10 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 30 },
  forgotPasswordText: { color: '#F59E0B', fontSize: 13, fontWeight: 'bold' },
  loginButton: { backgroundColor: '#F59E0B', height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  loginButtonText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
});