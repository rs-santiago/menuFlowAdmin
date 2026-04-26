import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para os Modais
  const [modalVisible, setModalVisible] = useState(false); // Bottom Sheet
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B', 
    showCancel: false, confirmText: 'OK', onConfirm: () => hideAlert()
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const showAlert = (title: string, message: string, icon: string, color: string, confirmText = 'OK', showCancel = false, onConfirm = hideAlert) => {
    setAlertConfig({ visible: true, title, message, iconName: icon, iconColor: color, confirmText, showCancel, onConfirm });
  };

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get(`/admin/brands/${id}/products`),
        api.get(`/admin/brands/${id}/categories`)
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (error) {
      showAlert('Erro', 'Não foi possível carregar os dados.', 'x-circle', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  // Atualiza sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  const toggleAvailability = async (product: Product) => {
    const newStatus = !product.isAvailable;
    try {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAvailable: newStatus } : p));
      await api.patch(`/admin/products/${product.id}`, { isAvailable: newStatus });
    } catch (error) {
      showAlert('Erro', 'Falha ao atualizar status.', 'alert-octagon', '#EF4444');
      fetchData();
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

  // Lógica de Filtro
  const filteredProducts = selectedCategory 
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

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
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#F59E0B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Produtos da <Text style={{color: '#F59E0B'}}>Loja</Text></Text>
        </View>

        {/* BOTÃO GERENCIAR CATEGORIAS (OPÇÃO 2) */}
        <TouchableOpacity 
          style={styles.categoryActionBtn}
          onPress={() => router.push(`/brand/categories?brandId=${id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryActionContent}>
            <View style={styles.categoryIconCircle}>
              <Feather name="list" size={18} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.categoryActionTitle}>Gerenciar Categorias</Text>
              <Text style={styles.categoryActionSubtitle}>Organize seu cardápio por seções</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#333" />
        </TouchableOpacity>

        {/* FILTRO HORIZONTAL */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterTab, selectedCategory === null && styles.filterTabActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.filterTabText, selectedCategory === null && styles.filterTabTextActive]}>Tudo</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat.id}
                style={[styles.filterTab, selectedCategory === cat.id && styles.filterTabActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.filterTabText, selectedCategory === cat.id && styles.filterTabTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* LISTA DE PRODUTOS */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.productCard, !item.isAvailable && styles.productCardDisabled]}
              activeOpacity={0.7}
              onPress={() => toggleAvailability(item)}
            >
              <Image 
                source={{ uri: item.image || 'https://via.placeholder.com/150/171717/F59E0B?text=Sem+Foto' }} 
                style={styles.cardImage}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.description && <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text>}
                <Text style={styles.cardPrice}>R$ {item.price.toFixed(2)}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => { setSelectedProduct(item); setModalVisible(true); }}>
                  <Feather name="more-vertical" size={20} color="#888" />
                </TouchableOpacity>
                <View style={[styles.badgeSmall, item.isAvailable ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.badgeTextSmall, {color: item.isAvailable ? '#10B981' : '#EF4444'}]}>
                    {item.isAvailable ? 'ATIVO' : 'OFF'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Nenhum produto nesta categoria.</Text>}
        />

        <TouchableOpacity style={styles.fab} onPress={() => router.push(`/product/form?brandId=${id}`)}>
          <Feather name="plus" size={30} color="#000" />
        </TouchableOpacity>

        {/* BOTTOM SHEET DE OPÇÕES */}
        <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Gerir <Text style={{ color: '#F59E0B' }}>{selectedProduct?.name}</Text></Text>
              <TouchableOpacity style={styles.modalOption} onPress={() => { setModalVisible(false); router.push(`/product/form?brandId=${id}&productId=${selectedProduct?.id}`); }}>
                <Feather name="edit-2" size={20} color="#FFF" />
                <Text style={styles.modalOptionText}>Editar Informações</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalOption, styles.modalOptionDanger]}
                onPress={() => {
                  setModalVisible(false);
                  setTimeout(() => showAlert('Confirmar Exclusão', `Deseja apagar ${selectedProduct?.name}?`, 'trash-2', '#EF4444', 'APAGAR', true, performFinalDelete), 300);
                }}
              >
                <Feather name="trash-2" size={20} color="#EF4444" />
                <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>Eliminar Produto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        <CustomAlert 
          visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message}
          iconName={alertConfig.iconName} iconColor={alertConfig.iconColor} confirmText={alertConfig.confirmText}
          showCancel={alertConfig.showCancel} onCancel={hideAlert} onConfirm={alertConfig.onConfirm}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 25 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  
  // Categorias Action Btn
  categoryActionBtn: { backgroundColor: '#171717', padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderWidth: 1, borderColor: '#262626' },
  categoryActionContent: { flexDirection: 'row', alignItems: 'center' },
  categoryIconCircle: { width: 40, height: 40, backgroundColor: '#F59E0B15', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  categoryActionTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  categoryActionSubtitle: { color: '#666', fontSize: 12, marginTop: 2 },

  // Filtros
  filterContainer: { marginBottom: 20 },
  filterScroll: { paddingHorizontal: 0 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#171717', marginRight: 10, borderWidth: 1, borderColor: '#262626' },
  filterTabActive: { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' },
  filterTabText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  filterTabTextActive: { color: '#F59E0B' },

  // Cards
  productCard: { backgroundColor: '#171717', padding: 12, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
  productCardDisabled: { opacity: 0.5, backgroundColor: '#121212' },
  cardImage: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#262626' },
  cardInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cardDescription: { color: '#888', fontSize: 12, marginTop: 2 },
  cardPrice: { color: '#F59E0B', fontSize: 14, fontWeight: '900', marginTop: 4 },
  cardActions: { height: 70, alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 10 },
  badgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#10B98120' },
  badgeInactive: { backgroundColor: '#EF444420' },
  badgeTextSmall: { fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#F59E0B', width: 65, height: 65, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#171717', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 45, borderWidth: 1, borderColor: '#262626' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: '#FFF', fontSize: 19, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', padding: 18, borderRadius: 18, marginBottom: 12 },
  modalOptionDanger: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', borderWidth: 1 },
  modalOptionText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 15 },
  modalCancelButton: { marginTop: 10, padding: 10, alignItems: 'center' },
  modalCancelText: { color: '#666', fontSize: 15, fontWeight: 'bold' },
});