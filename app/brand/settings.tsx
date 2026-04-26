import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView, StyleSheet,
    Switch,
    Text,
    TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';

interface Schedule {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  closed: boolean;
}

const DAYS_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function BrandSettingsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B' 
  });

  const fetchData = async () => {
    try {
      const res = await api.get(`/admin/brands/${id}`);
      const b = res.data;
      setName(b.name);
      setLogoUrl(b.logoUrl);

      // Se não houver horários, inicializa a lista vazia de 0 a 6
      if (b.schedules && b.schedules.length > 0) {
        setSchedules(b.schedules.sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek));
      } else {
        const initial = DAYS_LABELS.map((_, index) => ({
          dayOfWeek: index,
          openTime: '08:00',
          closeTime: '18:00',
          closed: false
        }));
        setSchedules(initial);
      }
    } catch (e) {
      console.error("Erro ao carregar dados da loja", e);
      setAlertConfig({ visible: true, title: 'Erro', message: 'Falha ao carregar dados.', iconName: 'x-circle', iconColor: '#EF4444' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const updateSchedule = (index: number, fields: Partial<Schedule>) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], ...fields };
    setSchedules(newSchedules);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setLogoUrl(result.assets[0].uri);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      // Upload da logo se for uma URI local
      if (logoUrl && !logoUrl.startsWith('http')) {
        const formData = new FormData();
        const filename = logoUrl.split('/').pop() || 'logo.jpg';
        // @ts-ignore
        formData.append('image', { uri: logoUrl, name: filename, type: 'image/jpeg' });
        const uploadRes = await api.post('/admin/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalLogoUrl = uploadRes.data.url;
      }

      await api.patch(`/admin/brands/${id}/settings`, {
        name,
        logoUrl: finalLogoUrl,
        schedules
      });

      setAlertConfig({ 
        visible: true, title: 'Sucesso', message: 'Configurações atualizadas!', 
        iconName: 'check-circle', iconColor: '#10B981' 
      });
    } catch (e) {
      setAlertConfig({ visible: true, title: 'Erro', message: 'Falha ao salvar.', iconName: 'x-circle', iconColor: '#EF4444' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#F59E0B" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Configurações da Loja', headerTintColor: '#F59E0B', headerStyle: { backgroundColor: '#0A0A0A' } }} />
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* LOGO SELECTOR */}
        <TouchableOpacity style={styles.logoContainer} onPress={pickImage}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Feather name="camera" size={30} color="#666" />
              <Text style={{color: '#666', marginTop: 5, fontSize: 12}}>Logo da Loja</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>NOME DA UNIDADE</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome da Loja" placeholderTextColor="#444" />

        <Text style={[styles.label, { marginTop: 20 }]}>HORÁRIOS DE FUNCIONAMENTO</Text>
        {schedules.map((item, index) => (
          <View key={index} style={[styles.dayRow, item.closed && { opacity: 0.5 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dayLabel}>{DAYS_LABELS[item.dayOfWeek]}</Text>
            </View>
            
            {!item.closed && (
              <View style={styles.timeInputs}>
                <TextInput 
                  style={styles.timeInput} 
                  value={item.openTime} 
                  onChangeText={(v) => updateSchedule(index, { openTime: v })} 
                  keyboardType="numeric"
                />
                <Text style={{color: '#444'}}> às </Text>
                <TextInput 
                  style={styles.timeInput} 
                  value={item.closeTime} 
                  onChangeText={(v) => updateSchedule(index, { closeTime: v })}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={{ marginLeft: 10, alignItems: 'center' }}>
              <Text style={{ color: '#444', fontSize: 10, marginBottom: 2 }}>{item.closed ? 'FECHADO' : 'ABERTO'}</Text>
              <Switch 
                value={!item.closed} 
                onValueChange={(v) => updateSchedule(index, { closed: !v })}
                trackColor={{ false: '#333', true: '#F59E0B' }}
                thumbColor={!item.closed ? '#FFF' : '#666'}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SALVAR ALTERAÇÕES</Text>}
        </TouchableOpacity>

      </ScrollView>

      <CustomAlert {...alertConfig} onConfirm={() => setAlertConfig({ ...alertConfig, visible: false })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { padding: 20 },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  logoContainer: { alignSelf: 'center', width: 120, height: 120, borderRadius: 30, backgroundColor: '#171717', borderWidth: 1, borderColor: '#262626', overflow: 'hidden', marginBottom: 30 },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { color: '#666', fontSize: 11, fontWeight: '900', marginBottom: 10, letterSpacing: 1.2 },
  input: { backgroundColor: '#171717', borderRadius: 15, padding: 16, color: '#FFF', borderWidth: 1, borderColor: '#262626' },
  dayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', padding: 15, borderRadius: 18, marginBottom: 8, borderWidth: 1, borderColor: '#262626' },
  dayLabel: { color: '#FFF', fontWeight: 'bold' },
  timeInputs: { flexDirection: 'row', alignItems: 'center' },
  timeInput: { backgroundColor: '#262626', color: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 14, textAlign: 'center', width: 60 },
  saveBtn: { backgroundColor: '#F59E0B', padding: 20, borderRadius: 18, alignItems: 'center', marginTop: 30, marginBottom: 50 },
  saveBtnText: { color: '#000', fontWeight: '900', fontSize: 15 }
});