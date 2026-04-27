import { registerForPushNotificationsAsync } from '@/services/notifications';
import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';

interface Metrics {
  totalBrands: number;
  totalProducts: number;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  _count: { products: number };
}

export default function DashboardScreen() {
  const router = useRouter();

  // Estados de Dados
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Estados de Usuário
  const [userName, setUserName] = useState('Lojista');
  const [userRole, setUserRole] = useState('ADMIN');
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [brandSelectorVisible, setBrandSelectorVisible] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B'
  });

  const loadUserData = async () => {
    try {
      const userStr = await SecureStore.getItemAsync('menuflow_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const firstName = user.name ? user.name.split(' ')[0] : 'Lojista';
        setUserName(firstName);
        setUserRole(user.role || 'ADMIN');
      }
    } catch (e) {
      console.error("Erro ao ler dados do usuário", e);
    }
  };

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
  async function setupPush() {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      try {
        // PEGUE O ID DE UM USER VÁLIDO NO SEU PRISMA STUDIO PARA TESTAR
        const userStr = await SecureStore.getItemAsync('menuflow_user');
        const user = userStr ? JSON.parse(userStr) : null;
        const idDoLojista = user?.id; 
        
        await api.patch('/admin/user/push-token', { 
          token: token,
          userId: idDoLojista 
        });
        console.log("Token salvo no banco com sucesso!");
      } catch (error) {
        console.error("Erro ao salvar token no banco:", error);
      }
    }
  }
  setupPush();
}, []);

  useFocusEffect(
    useCallback(() => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Bom dia');
      else if (hour < 18) setGreeting('Boa tarde');
      else setGreeting('Boa noite');

      loadUserData();
      fetchData();
    }, [])
  );

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

  // Verifica se o usuário logado é Super Admin
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {userName}</Text>
            <Text style={styles.subtitle}>Gerencie seu império</Text>
          </View>
          
          <View style={[styles.adminBadge, !isSuperAdmin && styles.adminBadgeRegular]}>
            <Text style={[styles.adminBadgeText, !isSuperAdmin && styles.adminBadgeTextRegular]}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'ADMINISTRADOR'}
            </Text>
          </View>
        </View>

        {/* MÉTRICAS */}
        <View style={styles.metricsGrid}>
          {renderMetricCard('Lojas Ativas', metrics?.totalBrands || 0, 'briefcase')}
          {renderMetricCard('Produtos Totais', metrics?.totalProducts || 0, 'package')}
        </View>

        {/* AÇÕES RÁPIDAS (Todos os usuários veem) */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => {
                if (brands.length === 1) {
                  router.push(`/product/form?brandId=${brands[0].id}`);
                } else if (brands.length > 1) {
                  setBrandSelectorVisible(true);
                } else {
                  setAlertConfig({
                    visible: true,
                    title: 'Nenhuma Loja',
                    message: 'Você precisa criar uma loja antes de adicionar produtos.',
                    iconName: 'alert-circle',
                    iconColor: '#EF4444'
                  });
                }
              }}
            >
              <Feather name="plus-circle" size={18} color="#F59E0B" />
              <Text style={styles.actionBtnText}>Novo Produto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={onRefresh}>
              <Feather name="refresh-cw" size={18} color="#F59E0B" />
              <Text style={styles.actionBtnText}>Sincronizar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PAINEL SUPER ADMIN (Só aparece se isSuperAdmin for true) */}
        {isSuperAdmin && (
          <View style={styles.quickActionsContainer}>
            <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>Painel Super Admin</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => router.push('/admin/brands/new')}
              >
                <Feather name="briefcase" size={18} color="#10B981" />
                <Text style={styles.actionBtnText}>Nova Loja</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => router.push('/admin/users')}
              >
                <Feather name="users" size={18} color="#3B82F6" />
                <Text style={styles.actionBtnText}>Usuários</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suas Unidades</Text>
          <Text style={styles.sectionSubtitle}>{brands.length} {brands.length === 1 ? 'LOJA' : 'LOJAS'}</Text>
        </View>

        <FlatList
          data={brands}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.brandCard}
              activeOpacity={0.8}
              onPress={() => router.push(`/brand/${item.id}`)}
            >
              <View style={styles.brandCardContent}>
                 <View style={styles.brandAvatar}>
                    {item.logoUrl ? (
                      <Image source={{ uri: item.logoUrl }} style={styles.brandImage} />
                    ) : (
                      <Text style={styles.brandAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    )}
                 </View>
                 <View style={styles.brandInfo}>
                    <Text style={styles.brandName}>{item.name}</Text>
                    <Text style={styles.brandSlug}>/{item.slug}</Text>
                 </View>

                 <TouchableOpacity 
                    style={styles.settingsBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/brand/settings?id=${item.id}`);
                    }}
                  >
                    <Feather name="settings" size={20} color="#666" />
                 </TouchableOpacity>
              </View>
              
              <View style={styles.brandCardFooter}>
                 <View style={styles.badge}>
                    <Feather name="box" size={12} color="#F59E0B" style={{marginRight: 4}} />
                    <Text style={styles.badgeText}>{item._count?.products || 0} Itens</Text>
                 </View>
                 <Feather name="chevron-right" size={20} color="#444" />
              </View>
            </TouchableOpacity>
          )}
        />

        {/* MODAL SELETOR DE UNIDADE */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={brandSelectorVisible}
          onRequestClose={() => setBrandSelectorVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setBrandSelectorVisible(false)}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Selecionar <Text style={{color: '#F59E0B'}}>Unidade</Text></Text>
              <Text style={styles.modalSubtitle}>Em qual loja deseja cadastrar o produto?</Text>

              {brands.map((brand) => (
                <TouchableOpacity 
                  key={brand.id}
                  style={styles.brandOption}
                  onPress={() => {
                    setBrandSelectorVisible(false);
                    router.push(`/product/form?brandId=${brand.id}`);
                  }}
                >
                  <View style={styles.brandOptionAvatar}>
                    {brand.logoUrl ? (
                      <Image source={{ uri: brand.logoUrl }} style={styles.brandOptionImage} />
                    ) : (
                      <Text style={styles.brandOptionAvatarText}>{brand.name.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>
                  <Text style={styles.brandOptionName}>{brand.name}</Text>
                  <Feather name="chevron-right" size={18} color="#444" />
                </TouchableOpacity>
              ))}

              <TouchableOpacity 
                style={styles.closeModalBtn} 
                onPress={() => setBrandSelectorVisible(false)}
              >
                <Text style={styles.closeModalText}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

      </View>
      
      <CustomAlert 
        {...alertConfig} 
        onConfirm={() => setAlertConfig(prev => ({ ...prev, visible: false }))} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 25 },
  greeting: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  adminBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B50' },
  adminBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  adminBadgeRegular: { backgroundColor: '#10B98120', borderColor: '#10B98150' },
  adminBadgeTextRegular: { color: '#10B981' },
  
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  metricCard: { backgroundColor: '#171717', width: '48%', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#262626' },
  metricIconContainer: { backgroundColor: '#F59E0B20', width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  metricValue: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  metricLabel: { color: '#888', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },

  quickActionsContainer: { marginBottom: 25 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 15 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { backgroundColor: '#171717', width: '48%', padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
  actionBtnText: { color: '#FFF', marginLeft: 10, fontWeight: 'bold', fontSize: 13 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionSubtitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 3 },
  listContent: { paddingBottom: 40 },
  brandCard: { backgroundColor: '#171717', borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#262626', overflow: 'hidden' },
  brandCardContent: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  brandAvatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  brandImage: { width: '100%', height: '100%', borderRadius: 16, resizeMode: 'cover' },
  brandAvatarText: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  brandInfo: { flex: 1 },
  brandName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  brandSlug: { color: '#888', fontSize: 14, marginTop: 2 },
  settingsBtn: { padding: 10 },
  brandCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#262626' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#171717', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1, borderColor: '#262626' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 5, textAlign: 'center' },
  modalSubtitle: { color: '#666', textAlign: 'center', marginBottom: 25, fontSize: 14 },
  brandOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', padding: 15, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  brandOptionAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  brandOptionImage: { width: '100%', height: '100%', borderRadius: 12, resizeMode: 'cover' },
  brandOptionAvatarText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  brandOptionName: { flex: 1, color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  closeModalBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeModalText: { color: '#666', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
});