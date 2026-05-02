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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import TimeInput from '../../components/TimeInput';
import api from '../../services/api';

// --- TIPAGENS ---
interface Schedule { dayOfWeek: number; openTime: string; closeTime: string; closed: boolean; }
const DAYS_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function BrandSettingsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Estados Base
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');

  // Imagens
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<string | null>(null);

  // Dados do Prisma
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

  // Validação
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B' });

  // --- BUSCA INICIAL ---
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

      if (b.schedules && b.schedules.length > 0) {
        setSchedules(b.schedules.sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek));
      } else {
        setSchedules(DAYS_LABELS.map((_, index) => ({ dayOfWeek: index, openTime: '08:00', closeTime: '18:00', closed: false })));
      }
    } catch (e) {
      setAlertConfig({ visible: true, title: 'Erro', message: 'Falha ao carregar dados.', iconName: 'x-circle', iconColor: '#EF4444' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- HELPERS DE ATUALIZAÇÃO E FORMATAÇÃO ---
  const updateField = (field: keyof typeof brandData, value: string) => {
    let newData = { ...brandData, [field]: value };

    // Automações Inteligentes
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

    // Limpa erro ao digitar
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const addFeature = () => {
    if (featureInput.trim() && !features.includes(featureInput.trim())) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const removeFeature = (item: string) => {
    setFeatures(features.filter(f => f !== item));
  };

  // --- UPLOAD DE IMAGENS ---
  const pickImage = async (type: 'logo' | 'hero') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: type === 'logo' ? [1, 1] : [16, 9], quality: 0.5,
    });
    if (!result.canceled) {
      if (type === 'logo') setLogoUrl(result.assets[0].uri);
      else setHeroImage(result.assets[0].uri);

      // Limpa erro de imagem
      if (type === 'logo' && errors.logoUrl) { const e = { ...errors }; delete e.logoUrl; setErrors(e); }
      if (type === 'hero' && errors.heroImage) { const e = { ...errors }; delete e.heroImage; setErrors(e); }
    }
  };

  const uploadFile = async (uri: string) => {
    if (uri.startsWith('http')) return uri; // Já é URL da nuvem
    
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    
    // 1. GARANTIA DO MIME TYPE CORRETO (Evita o travamento do celular)
    let ext = match ? match[1].toLowerCase() : 'jpeg';
    if (ext === 'jpg') ext = 'jpeg';
    const type = `image/${ext}`;

    // 2. MONTAGEM EXATA DO ARQUIVO PARA REACT NATIVE
    // @ts-ignore
    formData.append('image', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type: type,
    });

    // 3. O DISPARO (Igual ao do ProductForm que já funciona)
    const res = await api.post('/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return res.data.url;
  };

  // --- VALIDAÇÃO ---
  const validateAll = () => {
    const errs: Record<string, string> = {};
    const hexRegex = /^#([A-Fa-f0-9]{6})$/;

    if (!brandData.name) errs.name = "Obrigatório";
    if (!brandData.slug) errs.slug = "Obrigatório";
    if (!brandData.surname) errs.surname = "Obrigatório";
    if (!logoUrl) errs.logoUrl = "Logo Obrigatória";
    if (!heroImage) errs.heroImage = "Hero Image Obrigatória";

    if (!hexRegex.test(brandData.colorPrimary)) errs.colorPrimary = "Hex inválido (#XXXXXX)";
    if (!hexRegex.test(brandData.colorPrimaryHover)) errs.colorPrimaryHover = "Hex inválido";
    if (!hexRegex.test(brandData.colorBg)) errs.colorBg = "Hex inválido";

    if (!brandData.heroTitle) errs.heroTitle = "Obrigatório";
    if (!brandData.aboutTitle) errs.aboutTitle = "Obrigatório";
    if (!/^\d{4}$/.test(brandData.since)) errs.since = "Ano com 4 dígitos";
    if (!brandData.whatsapp || brandData.whatsapp.length < 10) errs.whatsapp = "Telefone inválido";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- SALVAR ---
  const handleSave = async () => {
    if (!validateAll()) {
      setAlertConfig({ visible: true, title: 'Erros Encontrados', message: 'Por favor, revise os campos marcados em vermelho nas abas.', iconName: 'alert-triangle', iconColor: '#EF4444' });
      return;
    }

    const timeToMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return (h * 60) + m; };
    if (schedules.some(s => !s.closed && timeToMinutes(s.openTime) >= timeToMinutes(s.closeTime))) {
      setAlertConfig({ visible: true, title: 'Atenção', message: 'Horários inválidos encontrados.', iconName: 'clock', iconColor: '#F59E0B' });
      return;
    }

    setSaving(true);
    try {
      // Tenta fazer o upload das imagens (se houver)
      const finalLogo = logoUrl ? await uploadFile(logoUrl) : null;
      const finalHero = heroImage ? await uploadFile(heroImage) : null;

      const payload = {
        ...brandData,
        logoUrl: finalLogo,
        heroImage: finalHero,
        features,
        schedules
      };

      console.log("=== INICIANDO PATCH ===");
      console.log("URL:", `/admin/brands/${id}/settings`);
      // Mostramos apenas as chaves para não poluir demais o log, 
      // mas você pode usar JSON.stringify(payload) se quiser ver os dados exatos.
      console.log("Payload enviado (Chaves):", Object.keys(payload));

      await api.patch(`/admin/brands/${id}/settings`, payload);

      setAlertConfig({ visible: true, title: 'Sucesso', message: 'Todas as configurações salvas!', iconName: 'check-circle', iconColor: '#10B981' });
    } catch (error: any) {
      console.error("=== ERRO CRÍTICO NO HANDLESAVE ===");

      // Tratamento aprofundado do Axios
      if (error.response) {
        // A requisição foi feita e o servidor (Vercel) respondeu com um código de status fora do range 2xx
        console.error("Erro da Vercel (Status):", error.response.status);
        console.error("Dados da Resposta:", error.response.data);
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta (O Network Error puro)
        console.error("Sem resposta do servidor (Network Error). Request details:", error);
      } else {
        // Algo aconteceu na configuração da requisição que acionou um erro
        console.error("Erro de configuração do Axios:", error.message);
      }

      setAlertConfig({ visible: true, title: 'Erro', message: 'Falha ao salvar. Tente novamente.', iconName: 'x-circle', iconColor: '#EF4444' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#F59E0B" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Gerenciar Loja', headerTintColor: '#F59E0B', headerStyle: { backgroundColor: '#0A0A0A' } }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* 1. BÁSICO */}
          <Accordion
            title="Identificação da Loja"
            section="basic"
            errorFields={['name', 'slug', 'surname', 'logoUrl']}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            errors={errors}
          >
            <TouchableOpacity style={[styles.imagePickerSquare, { alignSelf: 'center', width: 120, height: 120, marginBottom: 20 }]} onPress={() => pickImage('logo')}>
              {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.uploadedImage} /> : <Feather name="camera" size={30} color="#666" />}
              <Text style={styles.imagePickerText}>Logo (1:1)</Text>
              {errors.logoUrl && <Text style={styles.errorText}>Falta Logo</Text>}
            </TouchableOpacity>

            <Text style={styles.label}>NOME DA UNIDADE {errors.name && <Text style={styles.errorText}>({errors.name})</Text>}</Text>
            <TextInput style={[styles.input, errors.name && styles.inputError]} value={brandData.name} onChangeText={(t) => updateField('name', t)} />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>NOME CURTO (SURNAME) {errors.surname && <Text style={styles.errorText}>⚠️</Text>}</Text>
                <TextInput style={[styles.input, errors.surname && styles.inputError]} value={brandData.surname} onChangeText={(t) => updateField('surname', t)} placeholder="Ex: Flow" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>SLUG (URL) {errors.slug && <Text style={styles.errorText}>⚠️</Text>}</Text>
                <TextInput style={[styles.input, errors.slug && styles.inputError]} value={brandData.slug} onChangeText={(t) => updateField('slug', t)} autoCapitalize="none" />
              </View>
            </View>
          </Accordion>

          {/* 2. IDENTIDADE VISUAL */}
          <Accordion
            title="Identidade Visual (Cores)"
            section="colors"
            errorFields={['colorPrimary', 'colorPrimaryHover', 'colorBg']}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            errors={errors}
          >
            {['colorPrimary', 'colorPrimaryHover', 'colorBg'].map((field) => (
              <View key={field} style={{ marginBottom: 15 }}>
                <Text style={styles.label}>{field.toUpperCase()} {errors[field] && <Text style={styles.errorText}>({errors[field]})</Text>}</Text>
                <View style={styles.colorRow}>
                  <View style={[styles.colorPreview, { backgroundColor: brandData[field as keyof typeof brandData] || '#171717' }]} />
                  <TextInput
                    style={[styles.input, { flex: 1, marginLeft: 15 }, errors[field] && styles.inputError]}
                    value={brandData[field as keyof typeof brandData]}
                    onChangeText={(t) => updateField(field as any, t)}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            ))}
          </Accordion>

          {/* 3. HERO & MARKETING */}
          <Accordion
            title="Conteúdo Principal (Hero)"
            section="hero"
            errorFields={['heroImage', 'heroTitle', 'heroHighlight', 'heroDescription', 'tagline']}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            errors={errors}
          >
            <Text style={styles.label}>IMAGEM DE CAPA (BACKGROUND) {errors.heroImage && <Text style={styles.errorText}>*</Text>}</Text>
            <TouchableOpacity style={[styles.imagePickerSquare, { width: '100%', aspectRatio: 16 / 9, marginBottom: 20 }]} onPress={() => pickImage('hero')}>
              {heroImage ? <Image source={{ uri: heroImage }} style={styles.uploadedImage} /> : <Feather name="image" size={30} color="#666" />}
              <Text style={styles.imagePickerText}>Capa (16:9)</Text>
              {errors.heroImage && <Text style={styles.errorText}>Falta Capa</Text>}
            </TouchableOpacity>

            <Text style={styles.label}>TÍTULO PRINCIPAL {errors.heroTitle && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { marginBottom: 15 }]} value={brandData.heroTitle} onChangeText={(t) => updateField('heroTitle', t)} />

            <Text style={styles.label}>PALAVRA EM DESTAQUE (HIGHLIGHT) {errors.heroHighlight && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { marginBottom: 15 }]} value={brandData.heroHighlight} onChangeText={(t) => updateField('heroHighlight', t)} />

            <Text style={styles.label}>SLOGAN (TAGLINE) {errors.tagline && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { marginBottom: 15 }]} value={brandData.tagline} onChangeText={(t) => updateField('tagline', t)} />

            <Text style={styles.label}>DESCRIÇÃO CURTA {errors.heroDescription && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={brandData.heroDescription} onChangeText={(t) => updateField('heroDescription', t)} />
          </Accordion>

          {/* 4. SOBRE NÓS */}
          <Accordion
            title="Seção Sobre a Empresa"
            section="about"
            errorFields={['aboutTitle', 'aboutHighlight', 'since', 'aboutDescription', 'aboutSubText']}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            errors={errors}
          >
            <Text style={styles.label}>TÍTULO DA SEÇÃO {errors.aboutTitle && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { marginBottom: 15 }]} value={brandData.aboutTitle} onChangeText={(t) => updateField('aboutTitle', t)} />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>DESTAQUE</Text>
                <TextInput style={styles.input} value={brandData.aboutHighlight} onChangeText={(t) => updateField('aboutHighlight', t)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>FUNDAÇÃO (ANO) {errors.since && <Text style={styles.errorText}>*</Text>}</Text>
                <TextInput style={[styles.input, errors.since && styles.inputError]} value={brandData.since} onChangeText={(t) => updateField('since', t)} keyboardType="numeric" maxLength={4} />
              </View>
            </View>

            <Text style={styles.label}>HISTÓRIA / DESCRIÇÃO {errors.aboutDescription && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top', marginBottom: 15 }]} multiline value={brandData.aboutDescription} onChangeText={(t) => updateField('aboutDescription', t)} />

            <Text style={styles.label}>TEXTO DE RODAPÉ (SUBTEXT) {errors.aboutSubText && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={styles.input} value={brandData.aboutSubText} onChangeText={(t) => updateField('aboutSubText', t)} />
          </Accordion>

          {/* 5. DIFERENCIAIS (FEATURES) */}
          <Accordion
            title="Diferenciais (Tags)"
            section="features"
            errorFields={[]}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            errors={errors}
          >
            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
              <TextInput style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]} value={featureInput} onChangeText={setFeatureInput} placeholder="Ex: Wi-fi Grátis" placeholderTextColor="#444" />
              <TouchableOpacity style={styles.addBtn} onPress={addFeature}>
                <Feather name="plus" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.tagsContainer}>
              {features.map((feat, idx) => (
                <View key={idx} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{feat}</Text>
                  <TouchableOpacity onPress={() => removeFeature(feat)} style={{ marginLeft: 8 }}>
                    <Feather name="x" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </Accordion>

          {/* 6. CONTATOS */}
          <Accordion
            title="Contatos e Endereço"
            section="contact"
            errorFields={['whatsapp', 'instagram', 'location']}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            errors={errors}
          >
            <Text style={styles.label}>WHATSAPP (NÚMEROS) {errors.whatsapp && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { marginBottom: 5 }]} keyboardType="numeric" value={brandData.whatsapp} onChangeText={(t) => updateField('whatsapp', t)} />
            <Text style={styles.helperText}>Exibição no site: {brandData.whatsappDisplay || '---'}</Text>

            <Text style={[styles.label, { marginTop: 15 }]}>INSTAGRAM {errors.instagram && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { marginBottom: 5 }]} value={brandData.instagram} onChangeText={(t) => updateField('instagram', t)} autoCapitalize="none" />
            <Text style={styles.helperText}>Link: {brandData.instaLink || '---'}</Text>

            <Text style={[styles.label, { marginTop: 15 }]}>ENDEREÇO COMPLETO {errors.location && <Text style={styles.errorText}>*</Text>}</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={brandData.location} onChangeText={(t) => updateField('location', t)} />
          </Accordion>

          {/* 7. HORÁRIOS */}
          <Accordion
            title="Horários de Funcionamento"
            section="schedules"
            errorFields={[]}
            expandedSection={expandedSection}
            setExpandedSection={setExpandedSection}
            errors={errors}
          >
            {schedules.map((item, index) => (
              <View key={item.dayOfWeek} style={[styles.dayRow, item.closed && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayLabel}>{DAYS_LABELS[item.dayOfWeek]}</Text>
                </View>
                <View style={styles.timeInputs}>
                  <TimeInput value={item.openTime} onChangeText={(text) => { const n = [...schedules]; n[index].openTime = text; setSchedules(n); }} disabled={item.closed} />
                  <Text style={{ color: '#444', marginHorizontal: 8 }}>às</Text>
                  <TimeInput value={item.closeTime} onChangeText={(text) => { const n = [...schedules]; n[index].closeTime = text; setSchedules(n); }} disabled={item.closed} />
                </View>
                <View style={{ marginLeft: 15, alignItems: 'center' }}>
                  <Text style={{ color: '#444', fontSize: 9, fontWeight: '900', marginBottom: 4 }}>{item.closed ? 'FECH' : 'ABER'}</Text>
                  <Switch value={!item.closed} onValueChange={(v) => { const n = [...schedules]; n[index].closed = !v; setSchedules(n); }} trackColor={{ false: '#262626', true: '#F59E0B80' }} thumbColor={!item.closed ? '#F59E0B' : '#666'} />
                </View>
              </View>
            ))}
          </Accordion>

          {/* SALVAR */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SALVAR TODAS CONFIGURAÇÕES</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert {...alertConfig} onConfirm={() => setAlertConfig({ ...alertConfig, visible: false })} />
    </SafeAreaView>
  );
}

// --- COMPONENTE ACORDEÃO (MOVIDO PARA FORA) ---
const Accordion = ({ title, section, errorFields, children, expandedSection, setExpandedSection, errors }: any) => {
  const isOpen = expandedSection === section;
  const isError = errorFields.some((f: string) => errors && errors[f]);

  return (
    <View style={[styles.accordionCard, isError && styles.accordionErrorBorder]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandedSection(isOpen ? null : section)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.accordionTitle, isError && { color: '#EF4444' }]}>{title}</Text>
          {isError && <Feather name="alert-circle" size={16} color="#EF4444" style={{ marginLeft: 8 }} />}
        </View>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={22} color="#888" />
      </TouchableOpacity>
      {isOpen && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { padding: 20, paddingBottom: 50 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },

  // Acordeão
  accordionCard: { backgroundColor: '#121212', borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#262626', overflow: 'hidden' },
  accordionErrorBorder: { borderColor: '#EF444450' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#171717' },
  accordionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  accordionBody: { padding: 20, borderTopWidth: 1, borderTopColor: '#262626' },

  // Formulário
  label: { color: '#666', fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1.2, marginLeft: 4 },
  input: { backgroundColor: '#171717', borderRadius: 12, padding: 16, color: '#FFF', borderWidth: 1, borderColor: '#262626', fontSize: 15 },
  inputError: { borderColor: '#EF4444', backgroundColor: '#EF444410' },
  errorText: { color: '#EF4444', fontSize: 10, fontWeight: 'bold' },
  helperText: { color: '#888', fontSize: 12, marginLeft: 4, marginTop: 4, fontStyle: 'italic' },

  // Imagens
  imagePickerSquare: { backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerText: { color: '#666', fontSize: 12, marginTop: 8, fontWeight: 'bold' },

  // Cores
  colorRow: { flexDirection: 'row', alignItems: 'center' },
  colorPreview: { width: 50, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#333' },

  // Tags (Features)
  addBtn: { backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  tagText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  // Horários
  dayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#262626' },
  dayLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  timeInputs: { flexDirection: 'row', alignItems: 'center' },

  saveBtn: { backgroundColor: '#F59E0B', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 20, elevation: 5 },
  saveBtnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 }
});