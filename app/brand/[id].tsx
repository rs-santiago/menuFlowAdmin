import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  image?: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
}

export default function BrandProductsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 800;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const prevPendingCount = useRef(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B',
    showCancel: false, confirmText: 'OK', onConfirm: () => hideAlert()
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const showAlert = (title: string, message: string, icon: string, color: string, confirmText = 'OK', showCancel = false, onConfirm = hideAlert) => {
    setAlertConfig({ visible: true, title, message, iconName: icon, iconColor: color, confirmText, showCancel, onConfirm });
  };

  const playNotificationSound = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/notification.wav') 
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error("Erro ao tocar som:", error);
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [prodRes, catRes, ordersRes] = await Promise.all([
        api.get(`/admin/brands/${id}/products`),
        api.get(`/admin/brands/${id}/categories`),
        api.get(`/admin/brands/${id}/orders`)
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      
      const orders = ordersRes.data || [];
      const active = orders.filter((o: any) => ['PENDING', 'PREPARING', 'DISPATCHED'].includes(o.status));
      const pending = orders.filter((o: any) => o.status === 'PENDING');
      
      setActiveOrdersCount(active.length);
      setPendingOrdersCount(pending.length);
    } catch (error) {
      if (!isSilent) showAlert('Erro', 'Não foi possível carregar os dados.', 'x-circle', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      const interval = setInterval(() => fetchData(true), 15000);
      return () => clearInterval(interval);
    }, [id])
  );

  useEffect(() => {
    if (pendingOrdersCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else { pulseAnim.setValue(1); }

    if (pendingOrdersCount > prevPendingCount.current) {
      playNotificationSound();
    }
    prevPendingCount.current = pendingOrdersCount;
  }, [pendingOrdersCount]);

  const toggleAvailability = async (product: Product) => {
    const newStatus = !product.isAvailable;
    try {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAvailable: newStatus } : p));
      await api.patch(`/admin/products/${product.id}`, { isAvailable: newStatus });
    } catch (error) {
      showAlert('Erro', 'Falha ao atualizar status.', 'alert-octagon', '#EF4444');
      fetchData(true);
    }
  };

  const performFinalDelete = async () => {
    if (!selectedProduct) return;
    hideAlert();
    try {
      await api.delete(`/admin/products/${selectedProduct.id}`);
      setProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
      setSelectedProduct(null);
    } catch (e) {
      showAlert('Erro', 'Não foi possível apagar o produto.', 'x-circle', '#EF4444');
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

  const formatData = (dataList: any[], numColumns: number) => {
    const dataCopy = [...dataList];
    const totalRows = Math.floor(dataCopy.length / numColumns);
    let totalLastRow = dataCopy.length - (totalRows * numColumns);

    while (totalLastRow !== 0 && totalLastRow !== numColumns) {
      dataCopy.push({ id: `blank-${totalLastRow}`, empty: true });
      totalLastRow++;
    }
    return dataCopy;
  };

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

      <View style={styles.mainWrapper}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#F59E0B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gestão da <Text style={{ color: '#F59E0B' }}>Unidade</Text></Text>
          </View>

          {/* GRID DE GESTÃO */}
          <View style={[styles.managementGrid, isLargeScreen && styles.managementGridDesktop]}>
            <TouchableOpacity
              style={[styles.manageCard, isLargeScreen && { flex: 1 }, pendingOrdersCount > 0 && { borderColor: '#F59E0B' }]}
              onPress={() => router.push({ pathname: "/brand/orders", params: { brandId: id } })}
            >
              <View style={styles.manageIconContainer}>
                <Feather name="shopping-bag" size={20} color="#F59E0B" />
                {pendingOrdersCount > 0 ? (
                  <Animated.View style={[styles.orderBadgeAlert, { opacity: pulseAnim }]}>
                    <Text style={styles.orderBadgeText}>{pendingOrdersCount} {pendingOrdersCount == 1 ? 'NOVO' : 'NOVOS'}</Text>
                  </Animated.View>
                ) : activeOrdersCount > 0 && (
                  <View style={styles.orderBadgeNormal}><Text style={styles.orderBadgeText}>{activeOrdersCount}</Text></View>
                )}
              </View>
              <Text style={styles.manageTitle}>Pedidos</Text>
              <Text style={styles.manageSubtitle}>{pendingOrdersCount > 0 ? 'Ação necessária!' : 'Gerenciar fluxo'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.manageCard, isLargeScreen && { flex: 1 }]} onPress={() => router.push(`/brand/categories?brandId=${id}`)}>
              <View style={[styles.manageIconContainer, { backgroundColor: '#262626' }]}><Feather name="layers" size={20} color="#888" /></View>
              <Text style={styles.manageTitle}>Categorias</Text>
              <Text style={styles.manageSubtitle}>Organizar seções</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.manageCard, isLargeScreen && { flex: 1 }]} onPress={() => router.push({ pathname: "/brand/reports", params: { brandId: id } })}>
              <View style={[styles.manageIconContainer, { backgroundColor: '#262626' }]}><Feather name="bar-chart-2" size={20} color="#3B82F6" /></View>
              <Text style={styles.manageTitle}>Relatórios</Text>
              <Text style={styles.manageSubtitle}>Desempenho</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.manageCard, isLargeScreen && { flex: 1 }]} onPress={() => router.push(`/brand/settings?id=${id}`)}>
              <View style={[styles.manageIconContainer, { backgroundColor: '#262626' }]}><Feather name="settings" size={20} color="#888" /></View>
              <Text style={styles.manageTitle}>Unidade</Text>
              <Text style={styles.manageSubtitle}>Ajustes gerais</Text>
            </TouchableOpacity>
          </View>

          {/* FILTRO CATEGORIAS */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={[styles.filterTab, !selectedCategory && styles.filterTabActive]} onPress={() => setSelectedCategory(null)}>
                <Text style={[styles.filterTabText, !selectedCategory && styles.filterTabTextActive]}>Tudo</Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.filterTab, selectedCategory === cat.id && styles.filterTabActive]} onPress={() => setSelectedCategory(cat.id)}>
                  <Text style={[styles.filterTabText, selectedCategory === cat.id && styles.filterTabTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* LISTA DE PRODUTOS */}
          <FlatList
            data={isLargeScreen ? formatData([...filteredProducts], 2) : filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={isLargeScreen ? 2 : 1}
            key={isLargeScreen ? 'pc' : 'mobile'}
            columnWrapperStyle={isLargeScreen ? { gap: 15 } : null}
            renderItem={({ item }) => {
              if (item.empty) {
                return <View style={[styles.productCardInvisible, { flex: 1 }]} />;
              }

              return (
                <TouchableOpacity
                  style={[styles.productCard, !item.isAvailable && styles.productCardDisabled, isLargeScreen && { flex: 1 }]}
                  onPress={() => toggleAvailability(item)}
                >
                  <Image source={{ uri: item.image || 'https://via.placeholder.com/150/171717/F59E0B?text=Sem+Foto' }} style={styles.cardImage} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardPrice}>R$ {item.price.toFixed(2)}</Text>
                  </View>
                  
                  {/* COLUNA DE AÇÕES E STATUS REINSERIDA */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => { setSelectedProduct(item); setModalVisible(true); }}>
                      <Feather name="edit" size={18} color="#666" />
                    </TouchableOpacity>
                    
                    <View style={[styles.badgeSmall, item.isAvailable ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={[styles.badgeTextSmall, { color: item.isAvailable ? '#10B981' : '#EF4444' }]}>
                        {item.isAvailable ? 'ATIVO' : 'OFF'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum produto cadastrado.</Text>}
          />
        </View>

        <TouchableOpacity style={styles.fab} onPress={() => router.push(`/product/form?brandId=${id}`)}>
          <Feather name="plus" size={30} color="#000" />
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent visible={modalVisible}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, isLargeScreen && { maxWidth: 400, alignSelf: 'center', marginBottom: 'auto', marginTop: 'auto', borderRadius: 30 }]}>
            <Text style={styles.modalTitle}>Gerir {selectedProduct?.name}</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => { setModalVisible(false); router.push(`/product/form?brandId=${id}&productId=${selectedProduct?.id}`); }}>
              <Feather name="edit-2" size={20} color="#FFF" />
              <Text style={styles.modalOptionText}>Editar Informações</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOption, styles.modalOptionDanger]} onPress={() => { setModalVisible(false); setTimeout(() => showAlert('Excluir?', `Apagar ${selectedProduct?.name}?`, 'trash-2', '#EF4444', 'APAGAR', true, performFinalDelete), 300); }}>
              <Feather name="trash-2" size={20} color="#EF4444" />
              <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>Remover Permanentemente</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <CustomAlert {...alertConfig} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  mainWrapper: { flex: 1, alignItems: 'center' },
  container: { flex: 1, width: '100%', maxWidth: 1000, paddingHorizontal: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 25 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },

  managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  managementGridDesktop: { flexDirection: 'row' },
  manageCard: { backgroundColor: '#171717', width: '48.5%', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: '#262626' },
  manageIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F59E0B15', justifyContent: 'center', alignItems: 'center', marginBottom: 12, position: 'relative' },
  manageTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  manageSubtitle: { color: '#666', fontSize: 12, marginTop: 2 },

  orderBadgeAlert: { position: 'absolute', top: -10, right: -60, backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 8, height: 22, justifyContent: 'center', borderWidth: 2, borderColor: '#171717' },
  orderBadgeNormal: { position: 'absolute', top: -5, right: -5, backgroundColor: '#262626', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#171717' },
  orderBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  filterContainer: { marginBottom: 20 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#171717', marginRight: 10, borderWidth: 1, borderColor: '#262626' },
  filterTabActive: { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' },
  filterTabText: { color: '#888', fontWeight: 'bold' },
  filterTabTextActive: { color: '#F59E0B' },

  productCard: { backgroundColor: '#171717', padding: 12, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
  productCardInvisible: { backgroundColor: 'transparent', padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  productCardDisabled: { opacity: 0.5 },
  cardImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#262626' },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cardPrice: { color: '#F59E0B', fontSize: 14, fontWeight: '900', marginTop: 4 },
  
  cardActions: { height: 60, alignItems: 'flex-end', justifyContent: 'space-between' },
  badgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeActive: { backgroundColor: '#10B98120' },
  badgeInactive: { backgroundColor: '#EF444420' },
  badgeTextSmall: { fontSize: 8, fontWeight: '900' },

  emptyText: { color: '#444', textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#F59E0B', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#171717', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', padding: 16, borderRadius: 16, marginBottom: 10 },
  modalOptionDanger: { backgroundColor: 'rgba(239,68,68,0.1)' },
  modalOptionText: { color: '#FFF', fontSize: 15, fontWeight: '600', marginLeft: 15 },
});