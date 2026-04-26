import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';

export default function ProductForm() {
  const { brandId, productId } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
  });

  // Estado Dinâmico para o CustomAlert
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    iconName: 'info' as keyof typeof Feather.glyphMap,
    iconColor: '#F59E0B',
    onConfirm: () => hideAlert(),
  });

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const showAlert = (
    title: string, 
    message: string, 
    iconName: keyof typeof Feather.glyphMap = 'info', 
    iconColor = '#F59E0B',
    onConfirmAction = hideAlert
  ) => {
    setAlertConfig({ visible: true, title, message, iconName, iconColor, onConfirm: onConfirmAction });
  };

  // 1. Carrega Categorias e dados do produto
  useEffect(() => {
    const initData = async () => {
      try {
        const catRes = await api.get(`/admin/brands/${brandId}/categories`);
        setCategories(catRes.data);

        if (productId) {
          const prodRes = await api.get(`/admin/products/${productId}`);
          const p = prodRes.data;
          
          setForm({
            name: p.name,
            description: p.description || '',
            price: String(p.price),
            categoryId: p.categoryId,
          });
          
          if (p.image) setImageUri(p.image);
        }
      } catch (e) {
        showAlert('Erro', 'Falha ao carregar dados iniciais.', 'x-circle', '#EF4444');
      }
    };
    initData();
  }, [brandId, productId]);

  // 2. Seleção de Imagem
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permissão necessária', 'Precisamos de acesso às suas fotos.', 'camera', '#F59E0B');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 3. Salvar (Upload + Cadastro)
  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) {
      showAlert('Campos obrigatórios', 'Por favor, preencha nome, preço e categoria.', 'info', '#F59E0B');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUri?.startsWith('http') ? imageUri : '';

      // Upload da imagem se houver uma nova selecionada
      if (imageUri && !imageUri.startsWith('http')) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // @ts-ignore
        formData.append('image', {
          uri: imageUri,
          name: filename,
          type: type,
        });

        const uploadRes = await api.post('/admin/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalImageUrl = uploadRes.data.url;
      }

      const payload = {
        ...form,
        price: form.price.replace(',', '.'),
        brandId,
        image: finalImageUrl || ""
      };

      if (productId) {
        await api.patch(`/admin/products/${productId}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }

      showAlert('Sucesso', 'O cardápio foi atualizado!', 'check-circle', '#10B981', () => {
        hideAlert();
        router.back();
      });
    } catch (e: any) {
      showAlert('Erro', 'Não conseguimos salvar o produto.', 'alert-octagon', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ 
        title: productId ? 'Editar Item' : 'Novo Item',
        headerShown: true,
        headerStyle: { backgroundColor: '#0A0A0A' },
        headerTintColor: '#F59E0B',
        headerTitleStyle: { fontWeight: '900' }
      }} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.container} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <TouchableOpacity style={styles.imageSelector} onPress={pickImage} activeOpacity={0.8}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderIcon}>📸</Text>
                <Text style={styles.imagePlaceholder}>Adicionar Foto</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>NOME DO PRODUTO *</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
            placeholder="Ex: Cheeseburger"
            placeholderTextColor="#444"
          />

          <Text style={styles.label}>PREÇO (R$) *</Text>
          <TextInput
            style={styles.input}
            value={form.price}
            onChangeText={(v) => setForm({ ...form, price: v })}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#444"
          />

          <Text style={styles.label}>CATEGORIA *</Text>
          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, form.categoryId === cat.id && styles.categoryChipActive]}
                onPress={() => setForm({ ...form, categoryId: cat.id })}
              >
                <Text style={[styles.categoryText, form.categoryId === cat.id && styles.categoryTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>DESCRIÇÃO</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            multiline
            numberOfLines={4}
            placeholder="O que vem no prato?"
            placeholderTextColor="#444"
          />

          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonText}>SALVAR NO CARDÁPIO</Text>}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        iconName={alertConfig.iconName}
        iconColor={alertConfig.iconColor}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { padding: 20 },
  imageSelector: { backgroundColor: '#171717', height: 180, borderRadius: 20, marginBottom: 25, borderWidth: 2, borderColor: '#262626', borderStyle: 'dashed', overflow: 'hidden' },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 32, marginBottom: 8 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { color: '#666', fontWeight: 'bold', fontSize: 13 },
  label: { color: '#666', fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1.5 },
  input: { backgroundColor: '#171717', borderRadius: 15, padding: 16, color: '#FFF', marginBottom: 20, borderWidth: 1, borderColor: '#262626', fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 25 },
  categoryChip: { backgroundColor: '#171717', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#262626' },
  categoryChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  categoryText: { color: '#666', fontWeight: 'bold', fontSize: 13 },
  categoryTextActive: { color: '#000' },
  saveButton: { backgroundColor: '#F59E0B', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 10, elevation: 5 },
  saveButtonText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 15 }
});