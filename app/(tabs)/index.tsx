import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

interface Metrics {
  totalBrands: number;
  totalProducts: number;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

export default function DashboardScreen() {
  const router = useRouter();

  // Estados de Dados
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Estados de Usuário (Dinâmicos)
  const [userName, setUserName] = useState('Lojista');
  const [userRole, setUserRole] = useState('ADMIN');
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');

  // 1. Carrega as informações locais do usuário logado
  const loadUserData = async () => {
    try {
      const userStr = await SecureStore.getItemAsync('menuflow_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Pega apenas o primeiro nome (Ex: "Rodrigo Santos" -> "Rodrigo")
        const firstName = user.name ? user.name.split(' ')[0] : 'Lojista';
        setUserName(firstName);
        setUserRole(user.role || 'ADMIN');
      }
    } catch (e) {
      console.error("Erro ao ler dados do usuário", e);
    }
  };

  // 2. Busca os dados da API
  const fetchData = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setMetrics(response.data.metrics);
      setBrands(response.data.brands);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Define a saudação baseada na hora
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    loadUserData();
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderMetricCard = (label: string, value: number | string, icon: keyof typeof Feather.glyphMap) => (
    <View style={styles.metricCard}>
      <View style={styles.metricIconContainer}>
        <Feather name={icon} size={20} color="#F59E0B" />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  // Verifica se é Super Admin para mudar a cor da tag
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.container}>
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {userName}</Text>
            <Text style={styles.subtitle}>Resumo do seu império</Text>
          </View>
          
          {/* TAG DINÂMICA */}
          <View style={[
            styles.adminBadge, 
            !isSuperAdmin && styles.adminBadgeRegular // Aplica estilo verde se for apenas ADMIN
          ]}>
            <Text style={[
              styles.adminBadgeText,
              !isSuperAdmin && styles.adminBadgeTextRegular
            ]}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'ADMINISTRADOR'}
            </Text>
          </View>
        </View>

        {/* GRADE DE MÉTRICAS */}
        <View style={styles.metricsGrid}>
          {renderMetricCard('Lojas Ativas', metrics?.totalBrands || 0, 'briefcase')}
          {renderMetricCard('Produtos Totais', metrics?.totalProducts || 0, 'package')}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lojas Registradas</Text>
          <Text style={styles.sectionSubtitle}>{brands.length} {brands.length === 1 ? 'LOJA' : 'LOJAS'}</Text>
        </View>

        {/* LISTA DE LOJAS */}
        <FlatList
          data={brands}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={40} color="#333" />
              <Text style={styles.emptyText}>Nenhuma loja encontrada.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.brandCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/brand/${item.id}`)}
            >
              <View style={styles.brandCardContent}>
                 <View style={styles.brandAvatar}>
                    <Text style={styles.brandAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                 </View>
                 <View style={styles.brandInfo}>
                    <Text style={styles.brandName}>{item.name}</Text>
                    <Text style={styles.brandSlug}>/{item.slug}</Text>
                 </View>
              </View>
              
              <View style={styles.brandCardFooter}>
                 <View style={styles.badge}>
                    <Feather name="box" size={12} color="#F59E0B" style={{marginRight: 4}} />
                    <Text style={styles.badgeText}>{item._count.products} Produtos</Text>
                 </View>
                 <Feather name="chevron-right" size={20} color="#444" />
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 30 },
  greeting: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 4 },
  
  // Badge do Admin (Dourado por padrão)
  adminBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B50' },
  adminBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  // Badge do Admin Regular (Verde Esmeralda)
  adminBadgeRegular: { backgroundColor: '#10B98120', borderColor: '#10B98150' },
  adminBadgeTextRegular: { color: '#10B981' },
  
  // Métricas
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 35 },
  metricCard: {
    backgroundColor: '#171717',
    width: '48%',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    // Sombra sutil para destacar os cards
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  metricIconContainer: { backgroundColor: '#F59E0B20', width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  metricValue: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  metricLabel: { color: '#888', fontSize: 12, marginTop: 4, fontWeight: '700', textTransform: 'uppercase' },
  
  // Lista
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  sectionSubtitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 3 },
  listContent: { paddingBottom: 40 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { color: '#666', marginTop: 15, fontSize: 15, fontWeight: '500' },
  
  // Cards de Marca
  brandCard: {
    backgroundColor: '#171717',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  brandCardContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  brandAvatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  brandAvatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  brandInfo: { flex: 1 },
  brandName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  brandSlug: { color: '#888', fontSize: 14, marginTop: 2 },
  
  // Footer do Card
  brandCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold' },
});