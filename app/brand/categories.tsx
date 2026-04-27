import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  isHighlight: boolean;
  sortOrder: number;
  hasCustomSchedule?: boolean;
  openTime?: string;
  closeTime?: string;
}

export default function CategoriesScreen() {
  const { brandId } = useLocalSearchParams();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estados do Modal de Edição
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Refs para focar automaticamente nos inputs de horário (opcional, melhora a UX)
  const openTimeRef = useRef<TextInput>(null);
  const closeTimeRef = useRef<TextInput>(null);

  // Estado do CustomAlert
  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B', showCancel: false, confirmText: 'OK',
    onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
  });

  const showAlert = (title: string, message: string, iconName = 'info', iconColor = '#F59E0B') => {
    setAlertConfig(prev => ({ ...prev, visible: true, title, message, iconName, iconColor, showCancel: false, onConfirm: () => setAlertConfig(p => ({ ...p, visible: false })) }));
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get(`/admin/brands/${brandId}/categories`);
      setCategories(res.data);
    } catch (e) {
      showAlert('Erro', 'Não foi possível carregar as categorias.', 'x-circle', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, [brandId]);

  // --- MÁSCARA DE HORÁRIO ---
  const formatTime = (value: string) => {
    const cleaned = value.replace(/\D/g, ''); // Remove tudo que não for número
    let formatted = cleaned;
    
    // Se digitou mais de 2 números, adiciona os dois pontos (ex: 123 -> 12:3)
    if (cleaned.length > 2) {
      formatted = `${cleaned.substring(0, 2)}:${cleaned.substring(2, 4)}`;
    }
    return formatted;
  };

  // --- ADICIONAR CATEGORIA RÁPIDA ---
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setSubmitting(true);
    Keyboard.dismiss();

    try {
      await api.post(`/admin/brands/${brandId}/categories`, { name: newCategory.trim() });
      setNewCategory('');
      fetchCategories();
    } catch (e: any) {
      showAlert('Falha', 'Não foi possível adicionar a categoria.', 'alert-octagon', '#EF4444');
    } finally {
      setSubmitting(false);
    }
  };

  // --- REORDENAÇÃO (DRAG & DROP) ---
  const onDragEnd = async ({ data }: { data: Category[] }) => {
    setCategories(data);
    try {
      const ids = data.map(item => item.id);
      await api.patch(`/admin/brands/${brandId}/categories/reorder`, { ids });
    } catch (e) {
      showAlert('Erro', 'Falha ao salvar a nova ordem.', 'x-circle', '#EF4444');
      fetchCategories();
    }
  };

  // --- ATUALIZAR CATEGORIA (MODAL) ---
  const handleUpdateCategory = async () => {
    if (!editingCat) return;

    // Validação simples de horário, se a chave estiver ativa
    if (editingCat.hasCustomSchedule) {
        if (!editingCat.openTime || editingCat.openTime.length !== 5 || !editingCat.closeTime || editingCat.closeTime.length !== 5) {
             showAlert('Atenção', 'Por favor, preencha os horários no formato 00:00.', 'alert-circle', '#EF4444');
             return;
        }
    }

    setSubmitting(true);
    try {
      await api.patch(`/admin/categories/${editingCat.id}`, {
        name: editingCat.name,
        icon: editingCat.icon,
        isActive: editingCat.isActive,
        isHighlight: editingCat.isHighlight,
        hasCustomSchedule: editingCat.hasCustomSchedule,
        openTime: editingCat.hasCustomSchedule ? editingCat.openTime : null,
        closeTime: editingCat.hasCustomSchedule ? editingCat.closeTime : null,
      });
      setEditModalVisible(false);
      fetchCategories();
    } catch (e) {
      showAlert('Erro', 'Falha ao atualizar configurações.', 'x-circle', '#EF4444');
    } finally {
      setSubmitting(false);
    }
  };

  // --- EXCLUSÃO ---
  const confirmDelete = (category: Category) => {
    setAlertConfig({
      visible: true, title: 'Remover Categoria', message: `Deseja apagar "${category.name}"? Categorias com produtos não podem ser removidas.`,
      iconName: 'trash-2', iconColor: '#EF4444', showCancel: true, confirmText: 'APAGAR',
      onConfirm: async () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        try {
          await api.delete(`/admin/categories/${category.id}`);
          fetchCategories();
        } catch (e: any) {
          showAlert('Ação Bloqueada', e.response?.data?.statusMessage || 'Você não pode apagar uma categoria que possui produtos.', 'lock', '#F59E0B');
        }
      }
    });
  };

  // --- RENDERIZAR ITEM DA LISTA ---
  const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={drag}
        disabled={isActive}
        style={[styles.categoryItem, isActive && styles.categoryItemDragging, !item.isActive && { opacity: 0.5 }]}
      >
        <View style={styles.categoryInfo}>
          <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
            <Feather name="menu" size={20} color="#666" />
          </TouchableOpacity>

          <Text style={styles.categoryIcon}>{item.icon || '📌'}</Text>

          {/* Adicionamos flex: 1 para permitir o shrink no texto longo */}
          <View style={{ flex: 1 }}>
            {/* Flex-wrap aqui ajuda se a tela for pequena ou a fonte for grande */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              {/* O flexShrink garante que ele vai truncar se faltar espaco. */}
              <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
              {item.isHighlight && <View style={styles.highlightBadge}><Text style={styles.highlightText}>Destaque</Text></View>}
            </View>
            <Text style={[styles.statusText, { color: item.isActive ? '#10B981' : '#EF4444' }]}>
              {item.isActive ? 'Visível no Cardápio' : 'Oculto do Cardápio'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => { setEditingCat({ ...item }); setEditModalVisible(true); }} style={styles.actionBtn}>
            <Feather name="settings" size={18} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtnDanger}>
            <Feather name="trash-2" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: 'Categorias', headerShown: true, headerStyle: { backgroundColor: '#0A0A0A' }, headerTintColor: '#F59E0B' }} />

        <View style={styles.container}>
          <Text style={styles.description}>
            Crie, ordene e configure as seções do seu cardápio. <Text style={{ fontWeight: 'bold', color: '#F59E0B' }}>Segure e arraste</Text> para mudar a ordem.
          </Text>

          <View style={styles.inputRow}>
            <TextInput style={styles.input} placeholder="Nome da categoria" placeholderTextColor="#444" value={newCategory} onChangeText={setNewCategory} autoCapitalize="words" />
            <TouchableOpacity style={[styles.addButton, !newCategory.trim() && { opacity: 0.5 }]} onPress={handleAddCategory} disabled={submitting || !newCategory.trim()}>
              {submitting && !editModalVisible ? <ActivityIndicator color="#000" /> : <Feather name="plus" size={24} color="#000" />}
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 50 }} />
          ) : (
            <DraggableFlatList
              data={categories}
              onDragEnd={onDragEnd}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              containerStyle={{ flex: 1 }}
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma categoria cadastrada.</Text>}
            />
          )}
        </View>

        {/* MODAL DE CONFIGURAÇÕES AVANÇADAS */}
        <Modal visible={editModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEditModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configurar Categoria</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}><Feather name="x" size={24} color="#666" /></TouchableOpacity>
              </View>

              {editingCat && (
                <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>NOME</Text>
                      <TextInput style={styles.modalInput} value={editingCat.name} onChangeText={(t) => setEditingCat({ ...editingCat, name: t })} />
                    </View>
                    <View style={{ width: 80 }}>
                      <Text style={styles.label}>EMOJI</Text>
                      <TextInput style={[styles.modalInput, { textAlign: 'center', fontSize: 20 }]} value={editingCat.icon || ''} onChangeText={(t) => setEditingCat({ ...editingCat, icon: t })} maxLength={2} />
                    </View>
                  </View>

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>Categoria Ativa</Text>
                      <Text style={styles.switchDesc}>Exibe esta categoria no cardápio web.</Text>
                    </View>
                    <Switch value={editingCat.isActive} onValueChange={(v) => setEditingCat({ ...editingCat, isActive: v })} trackColor={{ false: '#262626', true: '#F59E0B80' }} thumbColor={editingCat.isActive ? '#F59E0B' : '#666'} />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>Destacar (Highlight)</Text>
                      <Text style={styles.switchDesc}>Pinta a categoria com as cores da sua marca.</Text>
                    </View>
                    <Switch value={editingCat.isHighlight} onValueChange={(v) => setEditingCat({ ...editingCat, isHighlight: v })} trackColor={{ false: '#262626', true: '#F59E0B80' }} thumbColor={editingCat.isHighlight ? '#F59E0B' : '#666'} />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>Horário Específico</Text>
                      <Text style={styles.switchDesc}>Disponível apenas em certas horas do dia.</Text>
                    </View>
                    <Switch value={editingCat.hasCustomSchedule} onValueChange={(v) => setEditingCat({ ...editingCat, hasCustomSchedule: v })} trackColor={{ false: '#262626', true: '#F59E0B80' }} thumbColor={editingCat.hasCustomSchedule ? '#F59E0B' : '#666'} />
                  </View>

                  {/* Campos de Horário Personalizado (só aparecem se ativado) */}
                  {editingCat.hasCustomSchedule && (
                     <View style={styles.scheduleContainer}>
                         <View style={{ flex: 1, marginRight: 10 }}>
                             <Text style={styles.label}>ABERTURA (HH:MM)</Text>
                             <TextInput 
                                ref={openTimeRef}
                                style={[styles.modalInput, { textAlign: 'center' }]} 
                                placeholder="00:00" 
                                placeholderTextColor="#666" 
                                keyboardType="number-pad" 
                                maxLength={5}
                                value={editingCat.openTime} 
                                onChangeText={(t) => setEditingCat({ ...editingCat, openTime: formatTime(t) })} 
                             />
                         </View>
                         <View style={{ flex: 1, marginLeft: 10 }}>
                             <Text style={styles.label}>FECHAMENTO (HH:MM)</Text>
                             <TextInput 
                                ref={closeTimeRef}
                                style={[styles.modalInput, { textAlign: 'center' }]} 
                                placeholder="23:59" 
                                placeholderTextColor="#666" 
                                keyboardType="number-pad" 
                                maxLength={5}
                                value={editingCat.closeTime} 
                                onChangeText={(t) => setEditingCat({ ...editingCat, closeTime: formatTime(t) })} 
                             />
                         </View>
                     </View>
                  )}

                  <TouchableOpacity style={styles.saveModalBtn} onPress={handleUpdateCategory} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.saveModalBtnText}>SALVAR ALTERAÇÕES</Text>}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <CustomAlert {...alertConfig} onCancel={() => setAlertConfig(p => ({ ...p, visible: false }))} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, padding: 20 },
  description: { color: '#888', fontSize: 13, marginBottom: 20, lineHeight: 20 },
  inputRow: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, backgroundColor: '#171717', borderRadius: 15, padding: 16, color: '#FFF', borderWidth: 1, borderColor: '#262626', fontSize: 15, marginRight: 10 },
  addButton: { backgroundColor: '#F59E0B', width: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },

  // Itens da Lista
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#171717', padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#262626' },
  categoryItemDragging: { backgroundColor: '#262626', transform: [{ scale: 1.02 }], shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }, // Margin right para não colar nos botões
  dragHandle: { paddingRight: 15, paddingVertical: 10 },
  categoryIcon: { fontSize: 24, marginRight: 15 },
  categoryName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flexShrink: 1 }, // flexShrink garante o "..." se faltar espaco
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 },
  highlightBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B40' },
  highlightText: { color: '#F59E0B', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },

  actionsContainer: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 8, backgroundColor: '#262626', borderRadius: 10 },
  actionBtnDanger: { padding: 8, backgroundColor: '#EF444420', borderRadius: 10 }, // Botão de delete agora tem um feedback visual vermelho sutil
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50, fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: '#121212', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, borderWidth: 1, borderColor: '#262626', maxHeight: '90%' }, // Max height pro scrollview funcionar
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic' },
  modalBody: { paddingBottom: 20 },
  label: { color: '#666', fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1.2, marginLeft: 4 },
  modalInput: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 15, color: '#FFF', borderWidth: 1, borderColor: '#333', fontSize: 15 },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  switchTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  switchDesc: { color: '#666', fontSize: 11 },

  scheduleContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },

  saveModalBtn: { backgroundColor: '#F59E0B', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 20 },
  saveModalBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }
});