import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrderDetails = async () => {
    try {
      // Podemos usar uma rota de GET específico ou o próprio GET de orders filtrado
      const response = await api.get(`/admin/orders/${orderId}`);
      setOrder(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });

      // Opcional: Se o lojista terminou o fluxo (ex: marcou como Entregue), 
      // você pode já mandar ele de volta para a lista
      if (newStatus === 'DELIVERED' || newStatus === 'CANCELLED') {
        router.back();
      } else {
        fetchOrderDetails();
      }
    } catch (e) {
      alert("Erro ao atualizar status");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => { fetchOrderDetails(); }, [orderId]);

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#F59E0B" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>

        {/* HEADER SIMPLES */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={30} color="#F59E0B" />
          <Text style={styles.headerTitle}>Pedido #{order?.displayId}</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={styles.customerName}>{order?.customerName}</Text>
          <Text style={styles.customerPhone}>{order?.customerPhone}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Itens do Pedido</Text>
          {order?.items?.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>R$ {(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ {order?.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* AÇÕES DE STATUS */}
        <View style={styles.actions}>
          {order?.status === 'PENDING' && (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => updateStatus('PREPARING')}
              disabled={updating}
            >
              <Text style={styles.btnText}>ACEITAR E PREPARAR</Text>
            </TouchableOpacity>
          )}

          {order?.status === 'PREPARING' && (
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: '#3B82F6' }]}
              onPress={() => updateStatus('DISPATCHED')}
            >
              <Text style={styles.btnText}>SAIU PARA ENTREGA</Text>
            </TouchableOpacity>
          )}

          {order?.status === 'DISPATCHED' && (
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: '#10B981' }]}
              onPress={() => updateStatus('DELIVERED')}
            >
              <Text style={styles.btnText}>MARCAR COMO ENTREGUE</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },
  container: { padding: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginLeft: 10 },
  card: { backgroundColor: '#171717', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#262626' },
  sectionTitle: { color: '#666', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 },
  customerName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  customerPhone: { color: '#888', marginTop: 5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  itemQty: { color: '#F59E0B', fontWeight: 'bold', width: 35 },
  itemName: { color: '#DDD', flex: 1, fontSize: 16 },
  itemPrice: { color: '#FFF', fontWeight: 'bold' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  totalValue: { color: '#F59E0B', fontSize: 22, fontWeight: '900' },
  actions: { marginBottom: 50 },
  btnPrimary: { backgroundColor: '#F59E0B', padding: 18, borderRadius: 15, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '900', fontSize: 16 }
});