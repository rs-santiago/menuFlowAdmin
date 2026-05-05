import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  useWindowDimensions
} from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';

// --- INTERFACES ---
interface Category {
  id: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  isHighlight: boolean;
  sortOrder: number;
  activeTime?: any;
}

const WEEK_DAYS = [
  { id: 0, label: 'D' }, { id: 1, label: 'S' }, { id: 2, label: 'T' }, 
  { id: 3, label: 'Q' }, { id: 4, label: 'Q' }, { id: 5, label: 'S' }, { id: 6, label: 'S' }
];

export default function CategoriesScreen() {
  const { brandId } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  
  const isLargeScreen = width > 768;
  const isWeb = Platform.OS === 'web';

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');

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

  const formatTime = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.substring(0, 2)}:${cleaned.substring(2, 4)}`;
    }
    return formatted;
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setSubmitting(true);
    if (Platform.OS !== 'web') Keyboard.dismiss();

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

  const openSettingsModal = (cat: Category) => {
    setEditingCat({ ...cat });
    if (cat.activeTime && Array.isArray(cat.activeTime) && cat.activeTime.length > 0) {
      setScheduleEnabled(true);
      setSelectedDays(cat.activeTime.map((t: any) => t.day));
      setOpenTime(cat.activeTime[0].open || '');
      setCloseTime(cat.activeTime[0].close || '');
    } else {
      setScheduleEnabled(false);
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setOpenTime('');
      setCloseTime('');
    }
    setEditModalVisible(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCat) return;
    let activeTimePayload = null;

    if (scheduleEnabled) {
      if (openTime.length !== 5 || closeTime.length !== 5) {
        showAlert('Atenção', 'Preencha os horários no formato 00:00.', 'alert-circle', '#EF4444');
        return;
      }
      if (selectedDays.length === 0) {
        showAlert('Atenção', 'Selecione pelo menos um dia da semana.', 'alert-circle', '#EF4444');
        return;
      }
      activeTimePayload = selectedDays.map(day => ({
        day, open: openTime, close: closeTime
      }));
    }

    setSubmitting(true);
    try {
      await api.patch(`/admin/categories/${editingCat.id}`, {
        name: editingCat.name,
        icon: editingCat.icon,
        isActive: editingCat.isActive,
        isHighlight: editingCat.isHighlight,
        activeTime: activeTimePayload,
      });
      setEditModalVisible(false);
      fetchCategories();
    } catch (e) {
      showAlert('Erro', 'Falha ao atualizar configurações.', 'x-circle', '#EF4444');
    } finally {
      setSubmitting(false);
    }
  };

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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => {
    return (
      <View 
        style={[
          styles.categoryItem, 
          isActive && styles.categoryItemDragging, 
          { opacity: item.isActive ? (isActive ? 0.9 : 1) : 0.5 }
        ]}
      >
        <View style={styles.categoryInfo}>
          <TouchableOpacity 
            onPressIn={drag} 
            style={styles.dragHandle}
          >
            <Feather name="menu" size={20} color="#666" />
          </TouchableOpacity>

          <Text style={styles.categoryIcon}>{item.icon || '📌'}</Text>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
              {item.isHighlight && (
                <View style={styles.highlightBadge}>
                  <Text style={styles.highlightText}>Destaque</Text>
                </View>
              )}
            </View>
            <Text style={[styles.statusText, { color: item.isActive ? '#10B981' : '#EF4444' }]}>
              {item.isActive ? 'Visível' : 'Oculto'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => openSettingsModal(item)} style={styles.actionBtn}>
            <Feather name="settings" size={18} color="#F59E0B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtnDanger}>
            <Feather name="trash-2" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        {/* DESATIVAMOS O HEADER NATIVO PARA USAR O CUSTOMIZADO */}
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.mainWrapper}>
          <View style={styles.container}>
            
            {/* HEADER PADRONIZADO */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#F59E0B" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                Gestão de <Text style={{ color: '#F59E0B' }}>Categorias</Text>
              </Text>
            </View>

            <Text style={styles.description}>
              Crie, ordene e configure as seções do seu cardápio. No PC, use o ícone de menu para arrastar.
            </Text>

            <View style={styles.inputRow}>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: Pizzas Salgadas..." 
                placeholderTextColor="#444" 
                value={newCategory} 
                onChangeText={setNewCategory} 
              />
              <TouchableOpacity 
                style={[styles.addButton, !newCategory.trim() && { opacity: 0.5 }]} 
                onPress={handleAddCategory} 
                disabled={submitting || !newCategory.trim()}
              >
                {submitting && !editModalVisible ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Feather name="plus" size={24} color="#000" />
                )}
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
                activationDistance={20}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma categoria cadastrada.</Text>}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            )}
          </View>
        </View>

        {/* MODAL DE CONFIGURAÇÕES */}
        <Modal visible={editModalVisible} animationType={isWeb ? 'fade' : 'slide'} transparent={true} onRequestClose={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={isLargeScreen ? styles.modalContainerDesktop : { flex: 1, justifyContent: 'flex-end' }}>
              <View style={[styles.modalContent, isLargeScreen && styles.modalContentDesktop]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Configurar Categoria</Text>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}><Feather name="x" size={24} color="#666" /></TouchableOpacity>
                </View>

                {editingCat && (
                  <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                    <View style={isLargeScreen ? styles.modalRow : {}}>
                      <View style={{ flex: 1, marginRight: isLargeScreen ? 15 : 0 }}>
                        <Text style={styles.label}>NOME</Text>
                        <TextInput style={styles.modalInput} value={editingCat.name} onChangeText={(t) => setEditingCat({ ...editingCat, name: t })} />
                      </View>
                      <View style={{ width: isLargeScreen ? 120 : 80, marginTop: isLargeScreen ? 0 : 15 }}>
                        <Text style={styles.label}>EMOJI</Text>
                        <TextInput style={[styles.modalInput, { textAlign: 'center', fontSize: 20 }]} value={editingCat.icon || ''} onChangeText={(t) => setEditingCat({ ...editingCat, icon: t })} maxLength={2} />
                      </View>
                    </View>

                    <View style={styles.switchGrid}>
                      <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}><Text style={styles.switchTitle}>Categoria Ativa</Text></View>
                        <Switch value={editingCat.isActive} onValueChange={(v) => setEditingCat({ ...editingCat, isActive: v })} trackColor={{ false: '#262626', true: '#F59E0B80' }} thumbColor={editingCat.isActive ? '#F59E0B' : '#666'} />
                      </View>

                      <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}><Text style={styles.switchTitle}>Destaque (Highlight)</Text></View>
                        <Switch value={editingCat.isHighlight} onValueChange={(v) => setEditingCat({ ...editingCat, isHighlight: v })} trackColor={{ false: '#262626', true: '#F59E0B80' }} thumbColor={editingCat.isHighlight ? '#F59E0B' : '#666'} />
                      </View>
                    </View>

                    <View style={styles.switchRow}>
                      <View style={{ flex: 1 }}><Text style={styles.switchTitle}>Horário Específico</Text></View>
                      <Switch value={scheduleEnabled} onValueChange={setScheduleEnabled} trackColor={{ false: '#262626', true: '#F59E0B80' }} thumbColor={scheduleEnabled ? '#F59E0B' : '#666'} />
                    </View>

                    {scheduleEnabled && (
                      <View style={styles.scheduleBox}>
                        <Text style={styles.label}>DIAS DA SEMANA</Text>
                        <View style={styles.daysRow}>
                          {WEEK_DAYS.map((day) => {
                            const isSelected = selectedDays.includes(day.id);
                            return (
                              <TouchableOpacity key={day.id} style={[styles.dayCircle, isSelected && styles.dayCircleActive]} onPress={() => setSelectedDays(isSelected ? selectedDays.filter(d => d !== day.id) : [...selectedDays, day.id])}>
                                <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View style={styles.timeInputRow}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.label}>ABERTURA</Text>
                            <TextInput style={[styles.modalInput, { textAlign: 'center' }]} placeholder="00:00" keyboardType="number-pad" value={openTime} onChangeText={(t) => setOpenTime(formatTime(t))} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.label}>FECHAMENTO</Text>
                            <TextInput style={[styles.modalInput, { textAlign: 'center' }]} placeholder="23:59" keyboardType="number-pad" value={closeTime} onChangeText={(t) => setCloseTime(formatTime(t))} />
                          </View>
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
          </View>
        </Modal>

        <CustomAlert {...alertConfig} onCancel={() => setAlertConfig(p => ({ ...p, visible: false }))} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  mainWrapper: { flex: 1, alignItems: 'center' },
  container: { flex: 1, width: '100%', maxWidth: 800, paddingHorizontal: 20 },
  
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20, 
    marginBottom: 20 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center' 
  },
  headerTitle: { 
    color: '#FFF', 
    fontSize: 24, 
    fontWeight: '900',
    marginLeft: 5 
  },

  description: { color: '#666', fontSize: 13, marginBottom: 25, lineHeight: 18 },
  inputRow: { flexDirection: 'row', marginBottom: 25 },
  input: { 
    flex: 1, 
    backgroundColor: '#171717', 
    borderRadius: 15, 
    padding: 16, 
    color: '#FFF', 
    borderWidth: 1, 
    borderColor: '#262626' 
  },
  addButton: { 
    backgroundColor: '#F59E0B', 
    width: 60, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10 
  },
  
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#171717', padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#262626' },
  categoryItemDragging: { backgroundColor: '#262626', opacity: 0.8 },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  dragHandle: { paddingRight: 15, cursor: Platform.OS === 'web' ? 'grab' : 'auto' } as any,
  categoryIcon: { fontSize: 24, marginRight: 15 },
  categoryName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flexShrink: 1 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  highlightBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B40' },
  highlightText: { color: '#F59E0B', fontSize: 9, fontWeight: 'bold' },
  actionsContainer: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 8, backgroundColor: '#262626', borderRadius: 10 },
  actionBtnDanger: { padding: 8, backgroundColor: '#EF444420', borderRadius: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  modalContainerDesktop: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#121212', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, borderWidth: 1, borderColor: '#262626' },
  modalContentDesktop: { width: 600, borderRadius: 30, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  modalBody: { paddingBottom: 20 },
  modalRow: { flexDirection: 'row', gap: 15 },
  label: { color: '#666', fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1.2 },
  modalInput: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 15, color: '#FFF', borderWidth: 1, borderColor: '#333' },
  switchGrid: { marginBottom: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  switchTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  scheduleBox: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, marginTop: 5 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center' },
  dayCircleActive: { backgroundColor: '#F59E0B' },
  dayText: { color: '#888', fontWeight: 'bold' },
  dayTextActive: { color: '#000' },
  timeInputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  saveModalBtn: { backgroundColor: '#F59E0B', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 10 },
  saveModalBtnText: { color: '#000', fontWeight: '900' }
});