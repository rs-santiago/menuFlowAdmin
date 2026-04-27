import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../../components/CustomAlert';
import api from '../../../services/api';

export default function UserFormScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dados do Usuário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');

  // Gestão de Marcas (Checkboxes)
  const [allBrands, setAllBrands] = useState<{ id: string, name: string }[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B' });

  const fetchData = async () => {
    try {
      // 1. Carrega todas as marcas do sistema para o Checkbox
      const brandsRes = await api.get('/admin/brands'); // Certifique-se que essa rota existe e retorna {id, name}
      setAllBrands(brandsRes.data);

      // 2. Se for edição, carrega dados do usuário
      if (id) {
        const userRes = await api.get(`/admin/users/${id}`);
        const u = userRes.data;
        setName(u.name);
        setEmail(u.email);
        setRole(u.role);
        setSelectedBrands(u.brands.map((b: any) => b.brandId));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const toggleBrand = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      setSelectedBrands(selectedBrands.filter(i => i !== brandId));
    } else {
      setSelectedBrands([...selectedBrands, brandId]);
    }
  };

  const handleSave = async () => {
    if (!name || !email || (!id && !password)) {
      setAlertConfig({ visible: true, title: 'Campos Vazios', message: 'Preencha os dados básicos.', iconName: 'alert-circle', iconColor: '#F59E0B' });
      return;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      setAlertConfig({
        visible: true, title: 'E-mail Inválido',
        message: 'Insira um formato de e-mail correto.',
        iconName: 'mail', iconColor: '#EF4444'
      });
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/users/save', {
        id, name, email, password, role,
        brandIds: selectedBrands
      });
      router.back();
    } catch (e) {
      setAlertConfig({ visible: true, title: 'Erro', message: 'Falha ao salvar usuário.', iconName: 'x-circle', iconColor: '#EF4444' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#F59E0B" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: id ? 'Editar Usuário' : 'Novo Usuário' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>

          <View style={styles.section}>
            <Text style={styles.label}>NOME COMPLETO</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome do Lojista" placeholderTextColor="#444" />

            <Text style={[styles.label, { marginTop: 15 }]}>E-MAIL (LOGIN)</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <Text style={[styles.label, { marginTop: 15 }]}>SENHA {id && "(Deixe vazio para manter)"}</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>NÍVEL DE ACESSO</Text>
            <View style={styles.roleRow}>
              {['ADMIN', 'SUPER_ADMIN'].map(r => (
                <TouchableOpacity key={r} style={[styles.roleOption, role === r && styles.roleActive]} onPress={() => setRole(r)}>
                  <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {role === 'ADMIN' && (
            <View style={styles.section}>
              <Text style={styles.label}>VINCULAR LOJAS (BRANDS)</Text>
              {allBrands.map(brand => (
                <TouchableOpacity key={brand.id} style={styles.checkboxRow} onPress={() => toggleBrand(brand.id)}>
                  <View style={[styles.checkbox, selectedBrands.includes(brand.id) && styles.checkboxChecked]}>
                    {selectedBrands.includes(brand.id) && <Feather name="check" size={14} color="#000" />}
                  </View>
                  <Text style={styles.brandName}>{brand.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SALVAR USUÁRIO</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert {...alertConfig} onConfirm={() => setAlertConfig(p => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { padding: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: '#121212', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#262626' },
  label: { color: '#666', fontSize: 11, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  input: { backgroundColor: '#171717', borderRadius: 12, padding: 15, color: '#FFF', borderWidth: 1, borderColor: '#262626' },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#171717', alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
  roleActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  roleText: { color: '#888', fontWeight: 'bold' },
  roleTextActive: { color: '#000' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#333', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  brandName: { color: '#FFF', fontSize: 16 },
  saveBtn: { backgroundColor: '#F59E0B', padding: 20, borderRadius: 18, alignItems: 'center', marginBottom: 40 },
  saveBtnText: { color: '#000', fontWeight: '900', fontSize: 15 }
});