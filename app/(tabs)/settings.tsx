import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('menuflow_token');
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações</Text>
      
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>
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