import { Feather } from '@expo/vector-icons';
import { endOfDay, formatDistanceToNow, parseISO, startOfDay, startOfWeek, subDays, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Print from 'expo-print';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { generateOrderHtml } from '../../utils/printTemplate'; // IMPORTADO

interface Order {
  id: string;
  displayId: string;
  customerName: string;
  total: number;
  status: 'PENDING' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  itemsCount: number;
  items?: any; // Adicionado para impressão
  is_printed: boolean;
  brandName: string;
  brandLogoUrl: string;
}

type StatusFilter = 'ACTIVE' | 'HISTORY';
type DateRange = 'TODAY' | '3DAYS' | '7DAYS' | 'THIS_WEEK' | 'LAST_WEEK' | '30DAYS' | 'CUSTOM';

export default function OrdersScreen() {
  const { brandId } = useLocalSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  const [dateRange, setDateRange] = useState<DateRange>('TODAY');
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  const isFirstLoad = useRef(true);
  const prevPendingCount = useRef(0);

  // TRACKING DE IMPRESSÃO AUTOMÁTICA
  const printedOrders = useRef<Set<string>>(new Set());

  const isPrinting = useRef(false);

  // FUNÇÃO DE IMPRESSÃO
  const handlePrint = async (order: Order) => {
    // Se já estiver imprimindo, não tenta iniciar outro simultaneamente
    if (isPrinting.current) return;

    try {
      isPrinting.current = true;
      const html = generateOrderHtml(order, "Minha Loja");
      await Print.printAsync({ html });
      printedOrders.current.add(order.id);
    } catch (e) {
      console.error("Erro ao imprimir", e);
    } finally {
      isPrinting.current = false;
    }
  };

  useEffect(() => {
    const now = new Date();
    switch (dateRange) {
      case 'TODAY': setStartDate(startOfDay(now)); setEndDate(endOfDay(now)); break;
      case '3DAYS': setStartDate(startOfDay(subDays(now, 2))); setEndDate(endOfDay(now)); break;
      case '7DAYS': setStartDate(startOfDay(subDays(now, 6))); setEndDate(endOfDay(now)); break;
      case 'THIS_WEEK': setStartDate(startOfWeek(now, { weekStartsOn: 1 })); setEndDate(endOfDay(now)); break;
      case 'LAST_WEEK':
        const lastWeek = subWeeks(now, 1);
        setStartDate(startOfWeek(lastWeek, { weekStartsOn: 1 }));
        setEndDate(endOfDay(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1)));
        break;
      case '30DAYS': setStartDate(startOfDay(subDays(now, 29))); setEndDate(endOfDay(now)); break;
    }
  }, [dateRange]);

  const fetchOrders = async (isSilent = false) => {
    if (!isSilent) setLoading(true);

    try {
      const params: any = { search: searchQuery.trim() || undefined };
      if (filter === 'HISTORY') {
        params.start = startDate.toISOString();
        params.end = endDate.toISOString();
      }

      // 1. Busca os pedidos do backend Nuxt
      const response = await api.get(`/admin/brands/${brandId}/orders`, { params });
      const newOrders: Order[] = response.data;

      // 2. Filtra apenas pedidos PENDENTES que o banco diz que NÃO foram impressos
      const toPrint = newOrders.filter(o => o.status === 'PENDING' && !o.is_printed);

      // 3. Lógica de Impressão Automática
      // - Não imprime no primeiro carregamento (isFirstLoad)
      // - Só imprime se estiver na aba 'ACTIVE'
      // - Só inicia se houver algo para imprimir e não houver outra impressão em curso
      if (!isFirstLoad.current && filter === 'ACTIVE' && toPrint.length > 0 && !isPrinting.current) {

        const processQueue = async () => {
          isPrinting.current = true; // Ativa o bloqueio da fila

          for (const order of toPrint) {
            try {
              // Gera o HTML e abre a interface de impressão do sistema
              const html = generateOrderHtml(order, order.brandName, order.brandLogoUrl);
              await Print.printAsync({ html });

              // SUCESSO: Avisa o Nuxt que este pedido específico foi impresso
              // Isso atualiza o isPrinted no banco para true
              await api.patch(`/admin/orders/${order.id}/printed`);

              // Delay para o SO fechar a janela de impressão antes da próxima
              await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (e) {
              console.error("Erro ao processar pedido na fila:", order.id, e);
              // Se o usuário cancelar ou der erro, paramos a fila para evitar loops de erro
              break;
            }
          }

          isPrinting.current = false; // Libera a fila

          // Opcional: Re-executa uma busca silenciosa para atualizar os estados isPrinted na tela
          fetchOrders(true);
        };

        processQueue();
      }

      // 4. Finalização do ciclo
      isFirstLoad.current = false;
      // Removido o prevPendingCount pois agora a flag isPrinted é o nosso controle real
      setOrders(newOrders);

    } catch (error) {
      console.error("Erro na busca de pedidos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      const interval = setInterval(() => {
        if (!searchQuery) fetchOrders(true);
      }, 20000);
      return () => clearInterval(interval);
    }, [brandId, startDate, endDate, searchQuery, filter])
  );

  const filteredOrders = orders.filter(order => {
    if (filter === 'ACTIVE') return ['PENDING', 'PREPARING', 'DISPATCHED'].includes(order.status);
    return ['DELIVERED', 'CANCELLED'].includes(order.status);
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { color: '#F59E0B', bg: '#F59E0B15', label: 'NOVO' };
      case 'PREPARING': return { color: '#3B82F6', bg: '#3B82F615', label: 'COZINHA' };
      case 'DISPATCHED': return { color: '#10B981', bg: '#10B98115', label: 'EM ROTA' };
      case 'DELIVERED': return { color: '#10B981', bg: '#10B98115', label: 'ENTREGUE' };
      case 'CANCELLED': return { color: '#EF4444', bg: '#EF444415', label: 'CANCELADO' };
      default: return { color: '#666', bg: '#262626', label: 'CONCLUÍDO' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#F59E0B" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Gestão de <Text style={{ color: '#F59E0B' }}>Pedidos</Text></Text>
            {filter === 'HISTORY' && (
              <Text style={styles.dateSubTitle}>
                {startDate.toLocaleDateString('pt-BR')} até {endDate.toLocaleDateString('pt-BR')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#444" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar pelo número do pedido..."
            placeholderTextColor="#444"
            keyboardType="numeric"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchOrders()}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchOrders(); }}>
              <Feather name="x-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, filter === 'ACTIVE' && styles.tabActive]} onPress={() => setFilter('ACTIVE')}>
            <Text style={[styles.tabText, filter === 'ACTIVE' && styles.tabTextActive]}>Ativos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, filter === 'HISTORY' && styles.tabActive]} onPress={() => setFilter('HISTORY')}>
            <Text style={[styles.tabText, filter === 'HISTORY' && styles.tabTextActive]}>Histórico</Text>
          </TouchableOpacity>
        </View>

        {filter === 'HISTORY' && (
          <View style={{ marginBottom: 20 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateFilterContainer}>
              {['TODAY', '3DAYS', '7DAYS', 'THIS_WEEK', 'LAST_WEEK', '30DAYS', 'CUSTOM'].map((id) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.dateBtn, dateRange === id && styles.dateBtnActive]}
                  onPress={() => setDateRange(id as DateRange)}
                >
                  <Text style={[styles.dateBtnText, dateRange === id && styles.dateBtnTextActive]}>{id}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor="#F59E0B" />}
            renderItem={({ item }) => {
              const status = getStatusStyle(item.status);
              return (
                <TouchableOpacity style={styles.orderCard} onPress={() => router.push(`/brand/order-details?orderId=${item.id}`)}>
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
                      <Text style={styles.footerText}>{formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true, locale: ptBR })}</Text>
                    </View>
                    <Text style={styles.orderTotal}>R$ {item.total.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  backBtn: { padding: 5, marginRight: 10 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  dateSubTitle: { color: '#666', fontSize: 11, fontWeight: 'bold' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262626'
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, marginLeft: 10 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#171717', borderRadius: 15, padding: 5, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#262626' },
  tabText: { color: '#666', fontWeight: 'bold' },
  tabTextActive: { color: '#F59E0B' },

  dateFilterContainer: { gap: 10, paddingRight: 20 },
  dateBtn: { backgroundColor: '#171717', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#262626' },
  dateBtnActive: { borderColor: '#F59E0B', backgroundColor: '#F59E0B10' },
  dateBtnText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  dateBtnTextActive: { color: '#F59E0B' },

  customDateContainer: { flexDirection: 'row', gap: 10, marginTop: 15 },
  dateInput: { flex: 1, backgroundColor: '#171717', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#262626' },
  dateInputLabel: { color: '#444', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginBottom: 2 },
  dateInputValue: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  orderCard: { backgroundColor: '#171717', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#262626' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900' },
  customerName: { color: '#DDD', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { color: '#666', fontSize: 12, marginLeft: 5, textTransform: 'lowercase' },
  orderTotal: { color: '#F59E0B', fontWeight: '900', fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#444', marginTop: 15, fontWeight: 'bold', textAlign: 'center' }
});