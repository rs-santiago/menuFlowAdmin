import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

// Tipagem baseada no que costumamos ter no Prisma
interface Order {
  id: string;
  displayId: string; // Ex: #1234
  customerName: string;
  total: number;
  status: 'PENDING' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  itemsCount: number;
}

type StatusFilter = 'ACTIVE' | 'HISTORY';

export default function OrdersScreen() {
  const { brandId } = useLocalSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE');

  const fetchOrders = async () => {
    try {
      const response = await api.get(`/admin/brands/${brandId}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Erro ao buscar pedidos", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders(); // Busca os dados sempre que a tela ganha foco (ao voltar)

      // Mantém o auto-refresh enquanto a tela estiver visível
      const interval = setInterval(fetchOrders, 60000);

      return () => clearInterval(interval);
    }, [brandId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Lógica de filtro local para UI rápida
  const filteredOrders = orders.filter(order => {
    if (filter === 'ACTIVE') return ['PENDING', 'PREPARING', 'DISPATCHED'].includes(order.status);
    return ['DELIVERED', 'CANCELLED'].includes(order.status);
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { color: '#F59E0B', bg: '#F59E0B15', label: 'NOVO' };
      case 'PREPARING': return { color: '#3B82F6', bg: '#3B82F615', label: 'COZINHA' };
      case 'DISPATCHED': return { color: '#10B981', bg: '#10B98115', label: 'EM ROTA' };
      default: return { color: '#666', bg: '#262626', label: 'FINALIZADO' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ title: 'Pedidos', headerShown: false }} />

      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#F59E0B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gestão de <Text style={{ color: '#F59E0B' }}>Pedidos</Text></Text>
        </View>

        {/* ABAS DE FILTRO */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, filter === 'ACTIVE' && styles.tabActive]}
            onPress={() => setFilter('ACTIVE')}
          >
            <Text style={[styles.tabText, filter === 'ACTIVE' && styles.tabTextActive]}>Ativos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'HISTORY' && styles.tabActive]}
            onPress={() => setFilter('HISTORY')}
          >
            <Text style={[styles.tabText, filter === 'HISTORY' && styles.tabTextActive]}>Histórico</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const status = getStatusStyle(item.status);
              return (
                <TouchableOpacity
                  style={styles.orderCard}
                  onPress={() => router.push(`/brand/order-details?orderId=${item.id}`)}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>#{item.displayId}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.customerName}>{item.customerName}</Text>

                  <View style={styles.orderFooter}>
                    <View style={styles.infoRow}>
                      <Feather name="clock" size={14} color="#666" />
                      <Text style={styles.footerText}>Há 5 min</Text>
                      <Feather name="shopping-cart" size={14} color="#666" style={{ marginLeft: 15 }} />
                      <Text style={styles.footerText}>{item.itemsCount} itens</Text>
                    </View>
                    <Text style={styles.orderTotal}>
                      R$ {item.total.toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="coffee" size={50} color="#262626" />
                <Text style={styles.emptyText}>Tudo em ordem por aqui!</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  backBtn: { padding: 5, marginRight: 10 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#171717', borderRadius: 15, padding: 5, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#262626' },
  tabText: { color: '#666', fontWeight: 'bold' },
  tabTextActive: { color: '#F59E0B' },

  orderCard: { backgroundColor: '#171717', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#262626' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900' },
  customerName: { color: '#DDD', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { color: '#666', fontSize: 12, marginLeft: 5 },
  orderTotal: { color: '#F59E0B', fontWeight: '900', fontSize: 16 },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#444', marginTop: 15, fontWeight: 'bold' }
});