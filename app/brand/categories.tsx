import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';

interface Category {
  id: string;
  name: string;
}

export default function CategoriesScreen() {
  const { brandId } = useLocalSearchParams();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estado do CustomAlert
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    iconName: 'info' as keyof typeof Feather.glyphMap,
    iconColor: '#F59E0B',
    showCancel: false,
    confirmText: 'OK',
    onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
  });

  const fetchCategories = async () => {
    try {
      const res = await api.get(`/admin/brands/${brandId}/categories`);
      setCategories(res.data);
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: 'Erro',
        message: 'Não foi possível carregar as categorias.',
        iconName: 'x-circle',
        iconColor: '#EF4444',
        showCancel: false,
        confirmText: 'OK',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, [brandId]);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    setSubmitting(true);
    Keyboard.dismiss();

    try {
      await api.post(`/admin/brands/${brandId}/categories`, { name: newCategory });
      setNewCategory('');
      fetchCategories();
    } catch (e: any) {
      setAlertConfig({
        visible: true,
        title: 'Falha',
        message: 'Não foi possível adicionar a categoria.',
        iconName: 'alert-octagon',
        iconColor: '#EF4444',
        showCancel: false,
        confirmText: 'ENTENDI',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (category: Category) => {
    setAlertConfig({
      visible: true,
      title: 'Remover Categoria',
      message: `Deseja apagar "${category.name}"? Categorias com produtos não podem ser removidas.`,
      iconName: 'trash-2',
      iconColor: '#EF4444',
      showCancel: true,
      confirmText: 'APAGAR',
      onConfirm: () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        deleteCategory(category.id);
      }
    });
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (e) {
      setAlertConfig({
        visible: true,
        title: 'Ação Bloqueada',
        message: 'Você não pode apagar uma categoria que possui produtos vinculados.',
        iconName: 'lock',
        iconColor: '#F59E0B',
        showCancel: false,
        confirmText: 'OK',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ 
        title: 'Categorias',
        headerShown: true,
        headerStyle: { backgroundColor: '#0A0A0A' },
        headerTintColor: '#F59E0B',
        headerTitleStyle: { fontWeight: '900' }
      }} />

      <View style={styles.container}>
        <Text style={styles.description}>
          Crie as seções do seu cardápio (ex: Pizzas, Bebidas, Sobremesas).
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nome da categoria"
            placeholderTextColor="#444"
            value={newCategory}
            onChangeText={setNewCategory}
            autoCapitalize="words"
          />
          <TouchableOpacity 
            style={[styles.addButton, !newCategory.trim() && { opacity: 0.5 }]} 
            onPress={handleAddCategory}
            disabled={submitting || !newCategory.trim()}
          >
            {submitting ? <ActivityIndicator color="#000" /> : <Feather name="plus" size={24} color="#000" />}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <Feather name="tag" size={16} color="#F59E0B" style={{ marginRight: 10 }} />
                  <Text style={styles.categoryName}>{item.name}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhuma categoria cadastrada.</Text>
            }
          />
        )}
      </View>

      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        iconName={alertConfig.iconName}
        iconColor={alertConfig.iconColor}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText}
        onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, padding: 20 },
  description: { color: '#666', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  inputRow: { flexDirection: 'row', marginBottom: 30 },
  input: { 
    flex: 1, 
    backgroundColor: '#171717', 
    borderRadius: 15, 
    padding: 16, 
    color: '#FFF', 
    borderWidth: 1, 
    borderColor: '#262626',
    fontSize: 16,
    marginRight: 10
  },
  addButton: { 
    backgroundColor: '#F59E0B', 
    width: 60, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 5
  },
  categoryItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: '#171717', 
    padding: 20, 
    borderRadius: 18, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#262626' 
  },
  categoryInfo: { flexDirection: 'row', alignItems: 'center' },
  categoryName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { padding: 5 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50, fontSize: 15 }
});