import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../../components/CustomAlert';
import api from '../../../services/api';

export default function UserFormScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dados do Usuário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN');

  // Gestão de Marcas
  const [allBrands, setAllBrands] = useState<{ id: string, name: string }[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B' 
  });

  const fetchData = async () => {
    try {
      const brandsRes = await api.get('/admin/brands');
      setAllBrands(brandsRes.data);

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
      setAlertConfig({ 
        visible: true, title: 'Campos Vazios', 
        message: 'Preencha os dados básicos do usuário.', 
        iconName: 'alert-circle', iconColor: '#F59E0B' 
      });
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
      setAlertConfig({ 
        visible: true, title: 'Erro', 
        message: 'Falha ao salvar usuário.', 
        iconName: 'x-circle', iconColor: '#EF4444' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#F59E0B" size="large" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ 
        title: id ? 'Editar Usuário' : 'Novo Usuário',
        headerTintColor: '#F59E0B',
        headerStyle: { backgroundColor: '#0A0A0A' }
      }} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.mainWrapper}>
          <ScrollView 
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            
            {/* SEÇÃO: DADOS BÁSICOS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dados de Acesso</Text>
              
              <View style={isLargeScreen ? styles.row : styles.column}>
                <View style={isLargeScreen ? { flex: 1, marginRight: 10 } : {}}>
                  <Text style={styles.label}>NOME COMPLETO</Text>
                  <TextInput 
                    style={styles.input} 
                    value={name} 
                    onChangeText={setName} 
                    placeholder="Ex: João Silva" 
                    placeholderTextColor="#444" 
                  />
                </View>
                
                <View style={isLargeScreen ? { flex: 1, marginLeft: 10 } : { marginTop: 15 }}>
                  <Text style={styles.label}>E-MAIL (LOGIN)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={email} 
                    onChangeText={setEmail} 
                    keyboardType="email-address" 
                    autoCapitalize="none" 
                    placeholder="email@exemplo.com"
                    placeholderTextColor="#444"
                  />
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 15 }]}>
                SENHA {id && "(Deixe vazio para não alterar)"}
              </Text>
              <TextInput 
                style={styles.input} 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
                placeholder="••••••" 
                placeholderTextColor="#444"
              />
            </View>

            {/* SEÇÃO: NÍVEL DE ACESSO */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Permissões</Text>
              <Text style={styles.label}>NÍVEL DE ACESSO</Text>
              <View style={styles.roleRow}>
                {['ADMIN', 'SUPER_ADMIN'].map(r => (
                  <TouchableOpacity 
                    key={r} 
                    style={[styles.roleOption, role === r && styles.roleActive]} 
                    onPress={() => setRole(r)}
                  >
                    <Feather 
                      name={r === 'SUPER_ADMIN' ? 'shield' : 'user'} 
                      size={16} 
                      color={role === r ? '#000' : '#444'} 
                      style={{ marginBottom: 5 }}
                    />
                    <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                      {r.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* SEÇÃO: VINCULAR LOJAS */}
            {role === 'ADMIN' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Unidades Permitidas</Text>
                <Text style={[styles.label, { marginBottom: 15 }]}>SELECIONE AS LOJAS QUE ESTE USUÁRIO PODE GERENCIAR</Text>
                
                <View style={isLargeScreen ? styles.brandsGrid : {}}>
                  {allBrands.map(brand => (
                    <TouchableOpacity 
                      key={brand.id} 
                      style={[styles.checkboxRow, isLargeScreen && { width: '48%' }]} 
                      onPress={() => toggleBrand(brand.id)}
                    >
                      <View style={[styles.checkbox, selectedBrands.includes(brand.id) && styles.checkboxChecked]}>
                        {selectedBrands.includes(brand.id) && <Feather name="check" size={14} color="#000" />}
                      </View>
                      <Text style={styles.brandName}>{brand.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
              onPress={handleSave} 
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SALVAR CONFIGURAÇÕES</Text>}
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <CustomAlert {...alertConfig} onConfirm={() => setAlertConfig(p => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  mainWrapper: { flex: 1, alignItems: 'center' },
  container: { 
    padding: 20, 
    width: '100%', 
    maxWidth: 700 // Largura ideal para formulários no desktop
  },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  
  section: { backgroundColor: '#121212', padding: 20, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#262626' },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  label: { color: '#555', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1.2 },
  
  row: { flexDirection: 'row' },
  column: { flexDirection: 'column' },
  
  input: { backgroundColor: '#171717', borderRadius: 14, padding: 16, color: '#FFF', borderWidth: 1, borderColor: '#262626', fontSize: 15 },
  
  roleRow: { flexDirection: 'row', gap: 12 },
  roleOption: { flex: 1, padding: 18, borderRadius: 16, backgroundColor: '#171717', alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
  roleActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  roleText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
  roleTextActive: { color: '#000' },
  
  brandsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, backgroundColor: '#171717', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#262626' },
  checkbox: { width: 22, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#333', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  brandName: { color: '#DDD', fontSize: 14, fontWeight: '600' },
  
  saveBtn: { 
    backgroundColor: '#F59E0B', 
    padding: 20, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginBottom: 50,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  saveBtnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }
});