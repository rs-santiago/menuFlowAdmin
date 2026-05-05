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
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import TimeInput from '../../components/TimeInput';
import api from '../../services/api';

// --- TIPAGENS E CONSTANTES ---
interface Schedule { dayOfWeek: number; openTime: string; closeTime: string; closed: boolean; }
const DAYS_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function BrandSettingsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isLargeScreen = width > 800;
  const isWeb = Platform.OS === 'web';

  // Estados de Controle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');

  // Estados de Mídia
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<string | null>(null);

  // Dados do Formulário
  const [brandData, setBrandData] = useState({
    name: '', slug: '', surname: '', tagline: '',
    heroTitle: '', heroHighlight: '', heroDescription: '',
    aboutTitle: '', aboutHighlight: '', since: '', aboutDescription: '', aboutSubText: '',
    whatsapp: '', whatsappDisplay: '', instagram: '', instaLink: '', location: '',
    colorPrimary: '#F59E0B', colorPrimaryHover: '#D97706', colorBg: '#0A0A0A',
  });

  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Erros e Alertas
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B' });

  // --- CARREGAMENTO ---
  const fetchData = async () => {
    try {
      const res = await api.get(`/admin/brands/${id}`);
      const b = res.data;

      setLogoUrl(b.logoUrl || null);
      setHeroImage(b.heroImage || null);
      setFeatures(b.features || []);

      setBrandData({
        name: b.name || '', slug: b.slug || '', surname: b.surname || '', tagline: b.tagline || '',
        heroTitle: b.heroTitle || '', heroHighlight: b.heroHighlight || '', heroDescription: b.heroDescription || '',
        aboutTitle: b.aboutTitle || '', aboutHighlight: b.aboutHighlight || '', since: b.since || '', aboutDescription: b.aboutDescription || '', aboutSubText: b.aboutSubText || '',
        whatsapp: b.whatsapp || '', whatsappDisplay: b.whatsappDisplay || '', instagram: b.instagram || '', instaLink: b.instaLink || '', location: b.location || '',
        colorPrimary: b.colorPrimary || '#F59E0B', colorPrimaryHover: b.colorPrimaryHover || '#D97706', colorBg: b.colorBg || '#0A0A0A',
      });

      if (b.schedules?.length > 0) {
        setSchedules(b.schedules.sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek));
      } else {
        setSchedules(DAYS_LABELS.map((_, index) => ({ dayOfWeek: index, openTime: '08:00', closeTime: '18:00', closed: false })));
      }
    } catch (e) {
      setAlertConfig({ visible: true, title: 'Erro', message: 'Falha ao carregar loja.', iconName: 'x-circle', iconColor: '#EF4444' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- MÉTODOS AUXILIARES ---
  const updateField = (field: keyof typeof brandData, value: string) => {
    let newData = { ...brandData, [field]: value };
    if (field === 'whatsapp') {
      const clean = value.replace(/\D/g, '');
      newData.whatsapp = clean;
      if (clean.length === 11) newData.whatsappDisplay = `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7, 11)}`;
    }
    if (field === 'instagram') {
      const clean = value.replace('@', '').trim();
      newData.instagram = `@${clean}`;
      newData.instaLink = `https://instagram.com/${clean}`;
    }
    setBrandData(newData);
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const pickImage = async (type: 'logo' | 'hero') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.5,
    });
    if (!result.canceled) {
      if (type === 'logo') setLogoUrl(result.assets[0].uri);
      else setHeroImage(result.assets[0].uri);
    }
  };

  // --- MÉTODO DE UPLOAD HÍBRIDO ---
  const uploadFile = async (uri: string) => {
    if (uri.startsWith('http')) return uri;
    const formData = new FormData();

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileType = blob.type || 'image/jpeg';
      const extension = fileType.split('/')[1];
      const filename = `brand_${Date.now()}.${extension}`;
      const file = new File([blob], filename, { type: fileType });
      formData.append('image', file);
    } else {
      const filename = uri.split('/').pop() || 'brand_image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      // @ts-ignore
      formData.append('image', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: filename,
        type: type,
      });
    }

    try {
      const res = await api.post('/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.url;
    } catch (error: any) {
      console.error("Erro no upload do arquivo:", error?.response?.data || error.message);
      throw new Error("Falha no upload");
    }
  };

  const validateAll = () => {
    const errs: Record<string, string> = {};
    const hexRegex = /^#([A-Fa-f0-9]{6})$/;
    if (!brandData.name) errs.name = "Obrigatório";
    if (!brandData.slug) errs.slug = "Obrigatório";
    if (!logoUrl) errs.logoUrl = "Falta Logo";
    if (!heroImage) errs.heroImage = "Falta Capa";
    if (!hexRegex.test(brandData.colorPrimary)) errs.colorPrimary = "Hex inválido";
    if (!/^\d{4}$/.test(brandData.since)) errs.since = "4 dígitos";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- SALVAMENTO ---
  const handleSave = async () => {
    if (!validateAll()) return;
    setSaving(true);
    try {
      const [finalLogo, finalHero] = await Promise.all([
        logoUrl ? uploadFile(logoUrl) : Promise.resolve(null),
        heroImage ? uploadFile(heroImage) : Promise.resolve(null)
      ]);

      const payload = { ...brandData, logoUrl: finalLogo, heroImage: finalHero, features, schedules };
      await api.patch(`/admin/brands/${id}/settings`, payload);

      setAlertConfig({
        visible: true,
        title: 'Sucesso',
        message: 'Configurações da unidade atualizadas!',
        iconName: 'check-circle',
        iconColor: '#10B981'
      });
    } catch (error) {
      setAlertConfig({
        visible: true,
        title: 'Erro no Upload',
        message: 'Não foi possível processar as imagens. Tente novamente.',
        iconName: 'x-circle',
        iconColor: '#EF4444'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#F59E0B" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER NATIVO DESATIVADO */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mainWrapper}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%' }}>
          
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.contentContainer}>

              {/* NOVO HEADER PADRONIZADO */}
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Feather name="arrow-left" size={24} color="#F59E0B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                  Configurações da <Text style={{ color: '#F59E0B' }}>Unidade</Text>
                </Text>
              </View>

              {/* 1. IDENTIFICAÇÃO */}
              <Accordion title="Identificação" section="basic" expandedSection={expandedSection} setExpandedSection={setExpandedSection} hasError={!!(errors.name || errors.logoUrl)}>
                <View style={isLargeScreen ? styles.row : styles.column}>
                  <TouchableOpacity style={styles.logoPicker} onPress={() => pickImage('logo')}>
                    {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.uploadedImage} /> : <Feather name="camera" size={30} color="#333" />}
                    <Text style={styles.pickerSubtext}>Logo 1:1</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: isLargeScreen ? 20 : 0, marginTop: isLargeScreen ? 0 : 20 }}>
                    <Text style={styles.label}>NOME DA UNIDADE</Text>
                    <TextInput style={[styles.input, errors.name && styles.inputError]} value={brandData.name} onChangeText={(t) => updateField('name', t)} />
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>SURNAME</Text>
                        <TextInput style={styles.input} value={brandData.surname} onChangeText={(t) => updateField('surname', t)} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.label}>SLUG</Text>
                        <TextInput style={styles.input} value={brandData.slug} onChangeText={(t) => updateField('slug', t)} autoCapitalize="none" />
                      </View>
                    </View>
                  </View>
                </View>
              </Accordion>

              {/* 2. CORES */}
              <Accordion title="Identidade Visual" section="colors" expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                <View style={isLargeScreen ? styles.row : styles.column}>
                  {['colorPrimary', 'colorPrimaryHover', 'colorBg'].map((f) => (
                    <View key={f} style={{ flex: 1, marginHorizontal: isLargeScreen ? 5 : 0 }}>
                      <Text style={styles.label}>{f.toUpperCase()}</Text>
                      <View style={styles.colorRow}>
                        <View style={[styles.colorPreview, { backgroundColor: (brandData as any)[f] }]} />
                        <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} value={(brandData as any)[f]} onChangeText={(t) => updateField(f as any, t)} />
                      </View>
                    </View>
                  ))}
                </View>
              </Accordion>

              {/* 3. HERO */}
              <Accordion title="Marketing (Hero)" section="hero" expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                <TouchableOpacity style={[styles.heroPicker, { aspectRatio: isLargeScreen ? 21 / 9 : 16 / 9 }]} onPress={() => pickImage('hero')}>
                  {heroImage ? <Image source={{ uri: heroImage }} style={styles.uploadedImage} /> : <Feather name="image" size={40} color="#333" />}
                </TouchableOpacity>
                <Text style={styles.label}>TÍTULO E SLOGAN</Text>
                <TextInput style={styles.input} value={brandData.heroTitle} onChangeText={(t) => updateField('heroTitle', t)} placeholder="Título" />
                <TextInput style={styles.input} value={brandData.tagline} onChangeText={(t) => updateField('tagline', t)} placeholder="Slogan" />
              </Accordion>

              {/* 4. SOBRE NÓS */}
              <Accordion title="Sobre a Empresa" section="about" expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                <View style={styles.row}>
                  <View style={{ flex: 2 }}><Text style={styles.label}>TÍTULO</Text><TextInput style={styles.input} value={brandData.aboutTitle} onChangeText={(t) => updateField('aboutTitle', t)} /></View>
                  <View style={{ flex: 1, marginLeft: 10 }}><Text style={styles.label}>DESDE</Text><TextInput style={styles.input} value={brandData.since} onChangeText={(t) => updateField('since', t)} keyboardType="numeric" /></View>
                </View>
                <Text style={styles.label}>DESCRIÇÃO HISTÓRICA</Text>
                <TextInput style={[styles.input, { height: 80 }]} multiline value={brandData.aboutDescription} onChangeText={(t) => updateField('aboutDescription', t)} />
              </Accordion>

              {/* 5. DIFERENCIAIS */}
              <Accordion title="Diferenciais (Tags)" section="features" expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                <View style={styles.row}>
                  <TextInput style={[styles.input, { flex: 1 }]} value={featureInput} onChangeText={setFeatureInput} placeholder="Novo diferencial..." />
                  <TouchableOpacity style={styles.addBtn} onPress={() => { if (featureInput) { setFeatures([...features, featureInput]); setFeatureInput(''); } }}>
                    <Feather name="plus" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <View style={styles.tagGrid}>{features.map((f, i) => (
                  <View key={i} style={styles.tag}><Text style={styles.tagText}>{f}</Text><TouchableOpacity onPress={() => setFeatures(features.filter(x => x !== f))}><Feather name="x" size={12} color="#EF4444" /></TouchableOpacity></View>
                ))}</View>
              </Accordion>

              {/* 6. CONTATOS */}
              <Accordion title="Contatos e Localização" section="contact" expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                <View style={isLargeScreen ? styles.row : styles.column}>
                  <View style={{ flex: 1 }}><Text style={styles.label}>WHATSAPP</Text><TextInput style={styles.input} value={brandData.whatsapp} onChangeText={(t) => updateField('whatsapp', t)} /></View>
                  <View style={{ flex: 1, marginLeft: isLargeScreen ? 15 : 0 }}><Text style={styles.label}>INSTAGRAM</Text><TextInput style={styles.input} value={brandData.instagram} onChangeText={(t) => updateField('instagram', t)} /></View>
                </View>
                <Text style={styles.label}>ENDEREÇO</Text>
                <TextInput style={[styles.input, { height: 60 }]} multiline value={brandData.location} onChangeText={(t) => updateField('location', t)} />
              </Accordion>

              {/* 7. HORÁRIOS */}
              <Accordion title="Horários de Funcionamento" section="schedules" expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                <View style={isLargeScreen ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } : {}}>
                  {schedules.map((s, i) => (
                    <View key={s.dayOfWeek} style={[styles.dayCard, isLargeScreen && { width: '48%' }]}>
                      <Text style={styles.dayText}>{DAYS_LABELS[s.dayOfWeek]}</Text>
                      <View style={styles.row}>
                        <TimeInput value={s.openTime} onChangeText={(t) => { const n = [...schedules]; n[i].openTime = t; setSchedules(n); }} disabled={s.closed} />
                        <TimeInput value={s.closeTime} onChangeText={(t) => { const n = [...schedules]; n[i].closeTime = t; setSchedules(n); }} disabled={s.closed} />
                        <Switch value={!s.closed} onValueChange={(v) => { const n = [...schedules]; n[i].closed = !v; setSchedules(n); }} />
                      </View>
                    </View>
                  ))}
                </View>
              </Accordion>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SALVAR TUDO</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <CustomAlert {...alertConfig} onConfirm={() => setAlertConfig({ ...alertConfig, visible: false })} />
    </SafeAreaView>
  );
}

// --- ACORDEÃO ---
const Accordion = ({ title, children, section, expandedSection, setExpandedSection, hasError }: any) => {
  const isOpen = expandedSection === section;
  return (
    <View style={[styles.card, hasError && styles.cardError]}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpandedSection(isOpen ? null : section)}>
        <Text style={[styles.cardTitle, hasError && { color: '#EF4444' }]}>{title}</Text>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#888" />
      </TouchableOpacity>
      {isOpen && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  mainWrapper: { flex: 1, alignItems: 'center' },
  scrollContainer: { width: '100%', alignItems: 'center', paddingBottom: 50 },
  contentContainer: { width: '100%', maxWidth: 950, padding: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  
  // ESTILOS DO HEADER PADRONIZADO
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 25 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginLeft: 5 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  column: { flexDirection: 'column' },
  card: { backgroundColor: '#121212', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#262626', overflow: 'hidden' },
  cardError: { borderColor: '#EF4444' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, backgroundColor: '#171717' },
  cardTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  cardBody: { padding: 20, borderTopWidth: 1, borderTopColor: '#262626' },
  label: { color: '#666', fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: '#171717', borderRadius: 12, padding: 14, color: '#FFF', borderWidth: 1, borderColor: '#262626', marginBottom: 10 },
  inputError: { borderColor: '#EF4444' },
  logoPicker: { width: 100, height: 100, backgroundColor: '#1A1A1A', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  heroPicker: { width: '100%', backgroundColor: '#1A1A1A', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15, overflow: 'hidden' },
  uploadedImage: { width: '100%', height: '100%' },
  pickerSubtext: { color: '#444', fontSize: 10, marginTop: 5 },
  colorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  colorPreview: { width: 40, height: 40, borderRadius: 10 },
  addBtn: { backgroundColor: '#F59E0B', height: 50, width: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  tagText: { color: '#FFF', fontSize: 12, marginRight: 8 },
  dayCard: { backgroundColor: '#181818', padding: 12, borderRadius: 15, marginBottom: 8 },
  dayText: { color: '#888', fontWeight: 'bold', fontSize: 12, marginBottom: 8 },
  saveBtn: { backgroundColor: '#F59E0B', padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#000', fontWeight: '900', fontSize: 16 }
});