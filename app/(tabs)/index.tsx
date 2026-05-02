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
  isActive: boolean;
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
        setUserName(user.name?.split(' ')[0] || 'Lojista');
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

  const toggleBrandStatus = async (brandId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      setBrands(prev => prev.map(b => b.id === brandId ? { ...b, isActive: newStatus } : b));
      await api.patch(`/admin/brands/${brandId}/status`, { isActive: newStatus });
    } catch (error) {
      fetchData();
      setAlertConfig({
        visible: true,
        title: 'Erro',
        message: 'Falha ao atualizar status da loja.',
        iconName: 'alert-octagon',
        iconColor: '#EF4444'
      });
    }
  };

  useEffect(() => {
    async function setupPush() {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        try {
          const userStr = await SecureStore.getItemAsync('menuflow_user');
          const user = userStr ? JSON.parse(userStr) : null;
          await api.patch('/admin/user/push-token', { 
            token: token,
            userId: user?.id 
          });
        } catch (error) {
          console.error("Erro ao salvar token push:", error);
        }
      }
    }
    setupPush();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const hour = new Date().getHours();
      setGreeting(hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite');
      loadUserData();
      fetchData();
    }, [])
  );

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

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

        <FlatList
          data={brands}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor="#F59E0B" />}
          ListHeaderComponent={
            <>
              {/* MÉTRICAS */}
              <View style={styles.metricsGrid}>
                {renderMetricCard('Lojas', metrics?.totalBrands || 0, 'briefcase')}
                {renderMetricCard('Produtos', metrics?.totalProducts || 0, 'package')}
              </View>

              {/* AÇÕES RÁPIDAS (Lojista) */}
              <View style={styles.quickActionsContainer}>
                <Text style={styles.sectionTitle}>Ações Rápidas</Text>
                <View style={styles.actionGrid}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => {
                      if (brands.length === 1) router.push(`/product/form?brandId=${brands[0].id}`);
                      else if (brands.length > 1) setBrandSelectorVisible(true);
                      else setAlertConfig({ visible: true, title: 'Ops', message: 'Crie uma loja primeiro.', iconName: 'alert-circle', iconColor: '#EF4444' });
                    }}
                  >
                    <Feather name="plus-circle" size={18} color="#F59E0B" />
                    <Text style={styles.actionBtnText}>Novo Produto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionBtn} onPress={fetchData}>
                    <Feather name="refresh-cw" size={18} color="#F59E0B" />
                    <Text style={styles.actionBtnText}>Sincronizar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PAINEL SUPER ADMIN */}
              {isSuperAdmin && (
                <View style={styles.quickActionsContainer}>
                  <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>Painel Master</Text>
                  <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin/brands/new')}>
                      <Feather name="plus-square" size={18} color="#10B981" />
                      <Text style={styles.actionBtnText}>Nova Loja</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/admin/users')}>
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
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.brandCard, !item.isActive && styles.brandCardDisabled]}
              activeOpacity={0.8}
              onPress={() => router.push(`/brand/${item.id}`)}
            >
              <View style={styles.brandCardContent}>
                <View style={styles.brandAvatar}>
                  {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles.brandImage} />
                  ) : (
                    <Text style={styles.brandAvatarText}>{item.name[0].toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.brandInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.brandName, !item.isActive && { color: '#666' }]}>{item.name}</Text>
                    {!item.isActive && (
                      <View style={styles.offBadge}><Text style={styles.offBadgeText}>OFFLINE</Text></View>
                    )}
                  </View>
                  <Text style={styles.brandSlug}>/{item.slug}</Text>
                </View>

                {isSuperAdmin && (
                  <TouchableOpacity 
                    style={[styles.statusToggleBtn, item.isActive ? styles.btnActive : styles.btnInactive]}
                    onPress={(e) => { e.stopPropagation(); toggleBrandStatus(item.id, item.isActive); }}
                  >
                    <Feather name="power" size={16} color={item.isActive ? '#10B981' : '#EF4444'} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.settingsBtn}
                  onPress={(e) => { e.stopPropagation(); router.push(`/brand/settings?id=${item.id}`); }}
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
          contentContainerStyle={styles.listContent}
        />

        {/* MODAL SELETOR DE UNIDADE */}
        <Modal animationType="slide" transparent={true} visible={brandSelectorVisible}>
          <Pressable style={styles.modalOverlay} onPress={() => setBrandSelectorVisible(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Selecionar <Text style={{color: '#F59E0B'}}>Unidade</Text></Text>
              {brands.map((brand) => (
                <TouchableOpacity key={brand.id} style={styles.brandOption} onPress={() => { setBrandSelectorVisible(false); router.push(`/product/form?brandId=${brand.id}`); }}>
                  <Text style={styles.brandOptionName}>{brand.name}</Text>
                  <Feather name="chevron-right" size={18} color="#444" />
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>
      </View>
      
      <CustomAlert {...alertConfig} onConfirm={() => setAlertConfig(p => ({ ...p, visible: false }))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 25 },
  greeting: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#888' },
  adminBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B50' },
  adminBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '900' },
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
  brandCardDisabled: { borderColor: '#EF444430', backgroundColor: '#121212' },
  brandCardContent: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  brandAvatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  brandImage: { width: '100%', height: '100%', borderRadius: 16 },
  brandAvatarText: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  brandInfo: { flex: 1 },
  brandName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  brandSlug: { color: '#888', fontSize: 14 },
  settingsBtn: { padding: 10 },
  statusToggleBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1 },
  btnActive: { backgroundColor: '#10B98110', borderColor: '#10B98130' },
  btnInactive: { backgroundColor: '#EF444410', borderColor: '#EF444430' },
  offBadge: { backgroundColor: '#EF444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  offBadgeText: { color: '#EF4444', fontSize: 8, fontWeight: '900' },
  brandCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#262626' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#F59E0B', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#171717', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  brandOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', padding: 15, borderRadius: 18, marginBottom: 12 },
  brandOptionName: { flex: 1, color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});