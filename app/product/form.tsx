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
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';

export default function ProductForm() {
  const { brandId, productId } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Breakpoints para Web
  const isLargeScreen = width > 768;

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
  });

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permissão necessária', 'Precisamos de acesso às suas fotos.', 'camera', '#F59E0B');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) {
      showAlert('Campos obrigatórios', 'Por favor, preencha nome, preço e categoria.', 'info', '#F59E0B');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUri?.startsWith('http') ? imageUri : '';

      if (imageUri && !imageUri.startsWith('http')) {
        const formData = new FormData();

        if (Platform.OS === 'web') {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const fileType = blob.type || 'image/jpeg';
          const filename = `product_${Date.now()}.${fileType.split('/')[1]}`;
          const file = new File([blob], filename, { type: fileType });
          formData.append('image', file);
        } else {
          const filename = imageUri.split('/').pop() || 'image.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          // @ts-ignore
          formData.append('image', {
            uri: imageUri,
            name: filename,
            type: type,
          });
        }

        const uploadRes = await api.post('/admin/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalImageUrl = uploadRes.data.url;
      }

      const payload = {
        ...form,
        price: parseFloat(form.price.toString().replace(',', '.')),
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
      console.error("Erro no upload/save:", e?.response?.data || e.message);
      showAlert('Erro', 'Não conseguimos processar a imagem.', 'alert-octagon', '#EF4444');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      
      {/* DESATIVAMOS O HEADER NATIVO PARA USAR O CUSTOMIZADO */}
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formWrapper}>

            {/* HEADER PADRONIZADO */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#F59E0B" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {productId ? 'Editar' : 'Novo'} <Text style={{ color: '#F59E0B' }}>Item</Text>
              </Text>
            </View>

            <View style={isLargeScreen ? styles.rowContainer : styles.columnContainer}>

              {/* LADO ESQUERDO: IMAGEM */}
              <View style={isLargeScreen ? styles.leftSide : styles.fullWidth}>
                <Text style={styles.label}>FOTO DO PRODUTO</Text>
                <TouchableOpacity style={styles.imageSelector} onPress={pickImage} activeOpacity={0.8}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.placeholderBox}>
                      <Feather name="camera" size={32} color="#333" />
                      <Text style={styles.imagePlaceholder}>Adicionar Foto</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* LADO DIREITO: DADOS BÁSICOS */}
              <View style={isLargeScreen ? styles.rightSide : styles.fullWidth}>
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
              </View>
            </View>

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
              placeholder="O que vem no prato? Detalhe os ingredientes..."
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
          </View>
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
  scrollContent: { alignItems: 'center', paddingVertical: 20 },
  formWrapper: { width: '100%', maxWidth: 800, paddingHorizontal: 20 },

  // ESTILOS DO HEADER PADRONIZADO
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 30 
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

  rowContainer: { flexDirection: 'row', gap: 20, marginBottom: 10 },
  columnContainer: { flexDirection: 'column' },
  leftSide: { flex: 0.4 },
  rightSide: { flex: 0.6 },
  fullWidth: { width: '100%' },

  imageSelector: {
    backgroundColor: '#171717',
    aspectRatio: 1,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#262626',
    borderStyle: 'dashed',
    overflow: 'hidden'
  },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { color: '#444', fontWeight: 'bold', fontSize: 12, marginTop: 10 },

  label: { color: '#666', fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1.2 },
  input: {
    backgroundColor: '#171717',
    borderRadius: 15,
    padding: 16,
    color: '#FFF',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262626',
    fontSize: 16
  },
  textArea: { height: 120, textAlignVertical: 'top' },

  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  categoryChip: {
    backgroundColor: '#171717',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#262626'
  },
  categoryChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  categoryText: { color: '#666', fontWeight: 'bold', fontSize: 13 },
  categoryTextActive: { color: '#000' },

  saveButton: {
    backgroundColor: '#F59E0B',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 10,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  saveButtonText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 15 }
});