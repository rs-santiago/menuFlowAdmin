import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  image?: string;
}

export default function BrandProductsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para os Modais
  const [modalVisible, setModalVisible] = useState(false); // Bottom Sheet de Opções
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false); // Modal de Exclusão
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false); // Modal de Logout

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/admin/brands/${id}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [id]);

  // Função para executar o Logout real
  const performLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('menuflow_token');
      await SecureStore.deleteItemAsync('menuflow_user');
      setLogoutModalVisible(false);
      router.replace('/login');
    } catch (e) {
      Alert.alert("Erro", "Falha ao encerrar a sessão.");
    }
  };

  const toggleAvailability = async (product: Product) => {
    const newStatus = !product.isAvailable;
    
    try {
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, isAvailable: newStatus } : p
      ));

      await api.patch(`/admin/products/${product.id}`, {
        isAvailable: newStatus
      });
    } catch (error) {
      Alert.alert("Erro", "Falha ao atualizar status.");
      fetchProducts();
    }
  };

  const openOptions = (product: Product) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  // Executa a exclusão final no banco
  const performFinalDelete = async () => {
    if (!selectedProduct) return;
    
    setDeletingProduct(true);
    try {
      await api.delete(`/admin/products/${selectedProduct.id}`);
      setProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
      setConfirmDeleteVisible(false);
      setSelectedProduct(null);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível apagar o produto.");
    } finally {
      setDeletingProduct(false);
    }
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
      
      <View style={styles.container}>
        {/* CABEÇALHO */}
        <View style={styles.headerRow}>
          {router.canGoBack() ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#F59E0B" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setLogoutModalVisible(true)} style={styles.backButton}>
              <Feather name="log-out" size={24} color="#EF4444" />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}> 
            <Text style={styles.headerTitle}>Produtos da <Text style={{color: '#F59E0B'}}>Loja</Text></Text>
          </View>
        </View>

        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.productCard, 
                !item.isAvailable && styles.productCardDisabled,
                { borderColor: item.isAvailable ? '#10B98140' : '#EF444440' }
              ]}
              activeOpacity={0.7}
              onPress={() => toggleAvailability(item)}
            >
              <Image 
                source={{ uri: item.image || 'https://via.placeholder.com/150/171717/F59E0B?text=Sem+Foto' }} 
                style={styles.cardImage}
              />

              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                
                {item.description ? (
                  <Text style={styles.cardDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}

                <Text style={styles.cardPrice}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={styles.optionsButton} 
                  onPress={(e) => {
                    e.stopPropagation(); 
                    openOptions(item);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} 
                >
                  <Feather name="more-vertical" size={20} color="#888" />
                </TouchableOpacity>

                <View style={[
                  styles.badgeSmall, 
                  item.isAvailable ? styles.badgeActive : styles.badgeInactive
                ]}>
                  <Text style={[
                    styles.badgeTextSmall, 
                    item.isAvailable ? styles.textActive : styles.textInactive
                  ]}>
                    {item.isAvailable ? 'ATIVO' : 'OFF'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum produto encontrado.</Text>
          }
        />

        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => router.push(`/product/form?brandId=${id}`)}
        >
          <Feather name="plus" size={30} color="#000" />
        </TouchableOpacity>

        {/* ==========================================
            MODAL 1: BOTTOM SHEET DE OPÇÕES DO PRODUTO
            ========================================== */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              
              <Text style={styles.modalTitle}>
                Gerir <Text style={{ color: '#F59E0B' }}>{selectedProduct?.name}</Text>
              </Text>

              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => {
                  setModalVisible(false);
                  router.push(`/product/form?brandId=${id}&productId=${selectedProduct?.id}`);
                }}
              >
                <Feather name="edit-2" size={20} color="#FFF" />
                <Text style={styles.modalOptionText}>Editar Informações</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalOption, styles.modalOptionDanger]}
                onPress={() => {
                  setModalVisible(false);
                  setTimeout(() => {
                    setConfirmDeleteVisible(true);
                  }, 300);
                }}
              >
                <Feather name="trash-2" size={20} color="#EF4444" />
                <Text style={[styles.modalOptionText, { color: '#EF4444' }]}>Eliminar Produto</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ==========================================
            MODAL 2: DIALOG CENTRADO PARA APAGAR PRODUTO
            ========================================== */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={confirmDeleteVisible}
          onRequestClose={() => setConfirmDeleteVisible(false)}
        >
          <Pressable style={styles.confirmOverlay} onPress={() => setConfirmDeleteVisible(false)}>
            <View style={styles.confirmDialog} onStartShouldSetResponder={() => true}>
              
              <View style={styles.alertIconContainer}>
                <Feather name="alert-triangle" size={32} color="#EF4444" />
              </View>

              <Text style={styles.confirmTitle}>Confirmar Exclusão</Text>
              
              <Text style={styles.confirmMessage}>
                Tens a certeza que desejas apagar{"\n"}
                <Text style={styles.highlightText}>{selectedProduct?.name}</Text>?
                {"\n\n"}
                <Text style={styles.warningText}>Esta ação não pode ser desfeita.</Text>
              </Text>

              <View style={styles.confirmButtonsRow}>
                <TouchableOpacity 
                  style={styles.btnSecondary}
                  onPress={() => setConfirmDeleteVisible(false)}
                >
                  <Text style={styles.btnSecondaryText}>CANCELAR</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnDanger, deletingProduct && { opacity: 0.7 }]}
                  onPress={performFinalDelete}
                  disabled={deletingProduct}
                >
                  {deletingProduct ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.btnDangerText}>APAGAR</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* ==========================================
            MODAL 3: DIALOG CENTRADO PARA LOGOUT
            ========================================== */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={logoutModalVisible}
          onRequestClose={() => setLogoutModalVisible(false)}
        >
          <Pressable style={styles.confirmOverlay} onPress={() => setLogoutModalVisible(false)}>
            <View style={styles.confirmDialog} onStartShouldSetResponder={() => true}>
              
              <View style={styles.logoutIconContainer}>
                <Feather name="log-out" size={32} color="#F59E0B" />
              </View>

              <Text style={styles.confirmTitle}>Sair do MenuFlow</Text>
              
              <Text style={styles.confirmMessage}>
                Deseja realmente encerrar a{"\n"}sua sessão no aplicativo?
              </Text>

              <View style={styles.confirmButtonsRow}>
                <TouchableOpacity 
                  style={styles.btnSecondary}
                  onPress={() => setLogoutModalVisible(false)}
                >
                  <Text style={styles.btnSecondaryText}>CANCELAR</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.btnPrimary}
                  onPress={performLogout}
                >
                  <Text style={styles.btnPrimaryText}>SAIR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Estrutura Base
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  
  // Cabeçalho
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 25 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  
  // Produto Card
  productCard: {
    backgroundColor: '#171717',
    padding: 12, 
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row', 
    alignItems: 'center',
    borderWidth: 1,
  },
  productCardDisabled: {
    opacity: 0.5, 
    backgroundColor: '#121212',
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#262626', 
  },
  cardInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cardDescription: { color: '#888', fontSize: 12, marginTop: 2 },
  cardPrice: { color: '#F59E0B', fontSize: 14, fontWeight: '900', marginTop: 4 },
  
  // Ações do Card
  cardActions: {
    height: 70,
    alignItems: 'flex-end',
    justifyContent: 'space-between', 
    paddingLeft: 10,
  },
  optionsButton: { padding: 4 },
  badgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#10B98120' },
  badgeInactive: { backgroundColor: '#EF444420' },
  badgeTextSmall: { fontSize: 10, fontWeight: 'bold' },
  textActive: { color: '#10B981' },
  textInactive: { color: '#EF4444' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 50 },
  
  // Botão Flutuante (FAB)
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#F59E0B',
    width: 65,
    height: 65,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  // Modal 1: Bottom Sheet (Opções)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#171717',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 45,
    borderWidth: 1,
    borderColor: '#262626',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#FFF', fontSize: 19, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', padding: 18, borderRadius: 18, marginBottom: 12 },
  modalOptionDanger: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1 },
  modalOptionText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 15 },
  modalCancelButton: { marginTop: 10, padding: 10, alignItems: 'center' },
  modalCancelText: { color: '#666', fontSize: 15, fontWeight: 'bold' },

  // Modais 2 e 3: Dialog Centrado (Confirmações)
  confirmOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.85)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 30 
  },
  confirmDialog: {
    backgroundColor: '#171717',
    width: '100%',
    borderRadius: 25,
    padding: 25,
    paddingTop: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  alertIconContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 15,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutIconContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // Dourado suave para o logout
    padding: 15,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  confirmTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginBottom: 15 },
  confirmMessage: { color: '#AAA', fontSize: 15, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  highlightText: { color: '#F59E0B', fontWeight: 'bold' },
  warningText: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  confirmButtonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  
  // Botões do Diálogo
  btnSecondary: { 
    backgroundColor: '#262626', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 12, 
    width: '48%', 
    alignItems: 'center' 
  },
  btnSecondaryText: { color: '#FFF', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  
  btnDanger: { 
    backgroundColor: '#EF4444', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 12, 
    width: '48%', 
    alignItems: 'center',
    elevation: 5,
  },
  btnDangerText: { color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  
  btnPrimary: { 
    backgroundColor: '#F59E0B', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 12, 
    width: '48%', 
    alignItems: 'center',
    elevation: 5,
  },
  btnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
});