import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function NewBrandScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B'
  });

  const handleNameChange = (text: string) => {
    setName(text);
    const generatedSlug = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-');
    setSlug(generatedSlug);
  };

  const handleSave = async () => {
    if (!name || !slug) {
      setAlertConfig({
        visible: true, title: 'Campos Obrigatórios', message: 'Preencha o nome e o link (slug) da loja.',
        iconName: 'alert-triangle', iconColor: '#F59E0B'
      });
      return;
    }

    setLoading(true);

    try {
      // Dados Template para evitar quebras no app do cliente
      const payload = {
        name,
        slug,
        surname: name.split(' ')[0],
        tagline: 'O melhor sabor da região',
        heroTitle: `Bem-vindo ao ${name}`,
        heroHighlight: 'Sabor',
        heroDescription: 'Peça agora e receba no conforto da sua casa.',
        heroImage: 'https://via.placeholder.com/800x600/171717/F59E0B?text=Hero+Image',
        aboutTitle: 'Sobre nós',
        aboutHighlight: 'Tradição',
        since: new Date().getFullYear().toString(),
        aboutDescription: 'Trabalhamos com os melhores ingredientes.',
        aboutSubText: 'Qualidade garantida.',
        features: ['Delivery Rápido', 'Ingredientes Frescos', 'Embalagem Segura'],
        whatsapp: '5511999999999',
        whatsappDisplay: '(11) 99999-9999',
        instagram: '@' + slug,
        instaLink: `https://instagram.com/${slug}`,
        location: 'Endereço da Loja, 123',
        colorPrimary: '#F59E0B',
        colorPrimaryHover: '#D97706',
        colorBg: '#0A0A0A',
      };

      await api.post('/admin/brands', payload);

      setAlertConfig({
        visible: true, title: 'Sucesso!', message: 'Loja criada com sucesso.',
        iconName: 'check-circle', iconColor: '#10B981'
      });

      setTimeout(() => {
        setAlertConfig(prev => ({...prev, visible: false}));
        router.back();
      }, 1500);

    } catch (error: any) {
      const msg = error.response?.data?.message || 'Já existe uma loja com este Link (Slug).';
      setAlertConfig({
        visible: true, title: 'Erro', message: msg,
        iconName: 'x-circle', iconColor: '#EF4444'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: 'Criar Nova Loja', 
          headerTintColor: '#F59E0B', 
          headerStyle: { backgroundColor: '#0A0A0A' } 
        }} 
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.mainWrapper}>
          <ScrollView 
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Feather name="briefcase" size={40} color="#F59E0B" />
              </View>
              <Text style={styles.headerTitle}>Nova Unidade</Text>
              <Text style={styles.headerSubtitle}>Crie um novo espaço de vendas</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>NOME DA LOJA</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Pizzaria MenuFlow"
                placeholderTextColor="#444"
                value={name}
                onChangeText={handleNameChange}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>LINK DA LOJA (SLUG)</Text>
              <View style={styles.slugContainer}>
                <Text style={styles.slugPrefix}>menuflow.com/</Text>
                <TextInput
                  style={styles.slugInput}
                  placeholder="pizzaria-menuflow"
                  placeholderTextColor="#444"
                  value={slug}
                  onChangeText={setSlug}
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.hint}>Este será o link que os clientes acessarão.</Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
              onPress={handleSave} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveBtnText}>CADASTRAR LOJA</Text>
              )}
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <CustomAlert 
        {...alertConfig} 
        onConfirm={() => setAlertConfig(prev => ({ ...prev, visible: false }))} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  mainWrapper: {
    flex: 1,
    alignItems: 'center', // Centraliza o formulário no desktop
  },
  container: { 
    padding: 20,
    width: '100%',
    maxWidth: 600, // Largura controlada para o formulário de cadastro
  },
  iconContainer: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 25, backgroundColor: '#F59E0B20', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#F59E0B50' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: '#888', fontSize: 14, marginTop: 5 },
  
  formGroup: { marginBottom: 25 },
  label: { color: '#666', fontSize: 11, fontWeight: '900', marginBottom: 10, letterSpacing: 1.2, marginLeft: 4 },
  input: { backgroundColor: '#171717', borderRadius: 16, padding: 18, color: '#FFF', borderWidth: 1, borderColor: '#262626', fontSize: 16 },
  
  slugContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', borderRadius: 16, borderWidth: 1, borderColor: '#262626', paddingHorizontal: 15, height: 60 },
  slugPrefix: { color: '#F59E0B', fontSize: 16, fontWeight: 'bold' },
  slugInput: { flex: 1, color: '#FFF', fontSize: 16, height: '100%', marginLeft: 5 },
  hint: { color: '#666', fontSize: 12, marginTop: 8, marginLeft: 4 },
  
  saveBtn: { 
    backgroundColor: '#F59E0B', 
    padding: 20, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginTop: 20, 
    elevation: 5,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  saveBtnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }
});