import { removeStorageItem } from '@/utils/storage';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomAlert from '../../components/CustomAlert'; // Ajuste o caminho conforme a localização deste arquivo

export default function SettingsScreen() {
  const router = useRouter();

  // Estado Dinâmico para o CustomAlert
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    iconName: 'info' as keyof typeof Feather.glyphMap,
    iconColor: '#F59E0B',
    confirmText: 'OK',
    showCancel: false,
    onConfirm: () => hideAlert(),
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const showAlert = (
    title: string, 
    message: string, 
    iconName: keyof typeof Feather.glyphMap = 'info', 
    iconColor = '#F59E0B',
    confirmText = 'OK',
    showCancel = false,
    onConfirmAction = hideAlert
  ) => {
    setAlertConfig({ visible: true, title, message, iconName, iconColor, confirmText, showCancel, onConfirm: onConfirmAction });
  };

  const performLogout = async () => {
    hideAlert();
    try {
      await removeStorageItem('menuflow_token');
      await removeStorageItem('menuflow_user'); // Caso você também salve os dados do usuário
      router.replace('/login');
    } catch (e) {
      showAlert('Erro', 'Não foi possível sair da conta.', 'x-circle', '#EF4444');
    }
  };

  const confirmLogout = () => {
    showAlert(
      'Sair da Conta',
      'Deseja realmente encerrar a sua sessão?',
      'log-out',
      '#EF4444', // Vermelho para chamar a atenção
      'SAIR',
      true,
      performLogout
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações</Text>
      
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      {/* COMPONENTE DE ALERTA DINÂMICO */}
      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        iconName={alertConfig.iconName}
        iconColor={alertConfig.iconColor}
        confirmText={alertConfig.confirmText}
        showCancel={alertConfig.showCancel}
        onCancel={hideAlert}
        onConfirm={alertConfig.onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 20, justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  section: { width: '100%' },
  logoutButton: {
    backgroundColor: '#EF444420',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
});