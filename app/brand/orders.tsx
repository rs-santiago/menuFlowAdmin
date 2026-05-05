import { Feather } from '@expo/vector-icons';
import { endOfDay, formatDistanceToNow, parseISO, startOfDay, startOfWeek, subDays, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Audio } from 'expo-av';
import * as Print from 'expo-print';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList, Platform, RefreshControl,
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
import api from '../../services/api';
import { generateOrderHtml } from '../../utils/printTemplate';

// --- INTERFACES ---
interface Order {
  id: string;
  displayId: string;
  customerName: string;
  total: number;
  status: 'PENDING' | 'PREPARING' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  itemsCount: number;
  items?: any;
  is_printed: boolean;
  brandName: string;
  brandLogoUrl: string;
  mesa?: string;
  empty?: boolean;
}

type StatusFilter = 'ACTIVE' | 'HISTORY';
type DateRange = 'HOJE' | '3 DIAS' | '7 DIAS' | 'ESTA SEMANA' | 'ÚLTIMA SEMANA' | '30 DIAS';

// --- COMPONENTE DE CARD ANIMADO ---
const OrderCardAnimated = ({ item, onPress, getStatusStyle, isLargeScreen }: any) => {
  const isPending = item.status === 'PENDING';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPending) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPending]);

  if (item.empty) return <View style={[styles.orderCardInvisible, isLargeScreen && { flex: 1 }]} />;

  const status = getStatusStyle(item.status);

  return (
    <TouchableOpacity
      style={[styles.orderCard, isPending && styles.orderCardPending, isLargeScreen && { flex: 1 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{item.displayId}</Text>
        {isPending ? (
          <Animated.View style={[styles.badgePending, { opacity: pulseAnim }]}>
            <View style={styles.dot} />
            <Text style={styles.badgeTextPending}>NOVO</Text>
          </Animated.View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        )}
      </View>

      <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>

      {item.mesa && <Text style={styles.mesaDestaque}>MESA {item.mesa}</Text>}

      <View style={styles.orderFooter}>
        <View style={styles.infoRow}>
          <Feather name="clock" size={12} color="#666" />
          <Text style={styles.footerText}>
            {formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true, locale: ptBR })}
          </Text>
        </View>
        <Text style={styles.orderTotal}>R$ {item.total.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function OrdersScreen() {
  const { brandId } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 800;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('HOJE');
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));

  const isPrinting = useRef(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const prevPendingCount = useRef(0);

  // --- LÓGICA DE ÁUDIO ---
  const playNotificationSound = async () => {
    if (Platform.OS === 'web') return;
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/notification.wav')
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error("Erro áudio:", error);
    }
  };

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  useEffect(() => {
    const currentPendingCount = orders.filter((o) => o.status === 'PENDING').length;
    if (currentPendingCount > prevPendingCount.current) playNotificationSound();
    prevPendingCount.current = currentPendingCount;
  }, [orders]);

  // --- FILTROS DE DATA ---
  useEffect(() => {
    const now = new Date();
    switch (dateRange) {
      case 'HOJE': setStartDate(startOfDay(now)); setEndDate(endOfDay(now)); break;
      case '3 DIAS': setStartDate(startOfDay(subDays(now, 2))); setEndDate(endOfDay(now)); break;
      case '7 DIAS': setStartDate(startOfDay(subDays(now, 6))); setEndDate(endOfDay(now)); break;
      case 'ESTA SEMANA': setStartDate(startOfWeek(now, { weekStartsOn: 1 })); setEndDate(endOfDay(now)); break;
      case 'ÚLTIMA SEMANA':
        const lastWeek = subWeeks(now, 1);
        setStartDate(startOfWeek(lastWeek, { weekStartsOn: 1 }));
        setEndDate(endOfDay(subDays(startOfWeek(now, { weekStartsOn: 1 }), 1)));
        break;
      case '30 DIAS': setStartDate(startOfDay(subDays(now, 29))); setEndDate(endOfDay(now)); break;
    }
  }, [dateRange]);

  const fetchOrders = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const params: any = { search: searchQuery.trim() || undefined, type: filter };
      if (filter === 'HISTORY') {
        params.start = startDate.toISOString();
        params.end = endDate.toISOString();
      }

      const response = await api.get(`/admin/brands/${brandId}/orders`, { params });
      const newOrders: Order[] = response.data;

      // Autoprint
      const toPrint = newOrders.filter(o => o.status === 'PENDING' && !o.is_printed);
      if (filter === 'ACTIVE' && toPrint.length > 0 && !isPrinting.current) {
        const processQueue = async () => {
          isPrinting.current = true;
          for (const order of toPrint) {
            try {
              const html = generateOrderHtml(order, order.brandName, order.brandLogoUrl);

              if (Platform.OS === 'web') {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed'; // Evita saltos de scroll
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                document.body.appendChild(iframe);

                const doc = iframe.contentWindow?.document || iframe.contentDocument;
                if (doc) {
                  doc.open();
                  doc.write(html);
                  doc.close();

                  // Usando onload para máxima segurança mesmo sem imagens pesadas
                  iframe.onload = () => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();

                    // Pequeno delay para o browser processar o comando antes de remover
                    setTimeout(() => {
                      if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                      }
                    }, 1000);
                  };
                }
              } else {
                await Print.printAsync({ html });
              }

              // Marca como impresso no banco para não repetir
              await api.patch(`/admin/orders/${order.id}/printed`);

              // Intervalo entre impressões para não encavalar o spooler da impressora
              await new Promise(r => setTimeout(r, 1200));

            } catch (e) {
              console.error("Falha ao processar impressão do pedido:", order.displayId, e);
              // Continua para o próximo pedido mesmo se este falhar
              continue;
            }
          }
          isPrinting.current = false;
          fetchOrders(true);
        };
        processQueue();
      }
      setOrders(newOrders);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      const interval = setInterval(() => { if (!searchQuery) fetchOrders(true); }, 20000);
      return () => clearInterval(interval);
    }, [brandId, startDate, endDate, searchQuery, filter])
  );

  const formatData = (dataList: any[], numColumns: number) => {
    const dataCopy = [...dataList];
    const totalRows = Math.floor(dataCopy.length / numColumns);
    let totalLastRow = dataCopy.length - (totalRows * numColumns);
    while (totalLastRow !== 0 && totalLastRow !== numColumns) {
      dataCopy.push({ id: `blank-${totalLastRow}`, empty: true });
      totalLastRow++;
    }
    return dataCopy;
  };

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

      <View style={styles.mainWrapper}>
        <View style={styles.container}>
          {/* HEADER */}
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

          {/* BARRA DE BUSCA E TABS */}
          <View style={isLargeScreen ? styles.topActionsRow : {}}>
            <View style={[styles.searchBar, isLargeScreen && { flex: 1, marginBottom: 0, marginRight: 15 }]}>
              <Feather name="search" size={18} color="#444" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar pedido..."
                placeholderTextColor="#444"
                keyboardType="numeric"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => fetchOrders()}
              />
            </View>

            <View style={[styles.tabContainer, isLargeScreen && { width: 300, marginBottom: 0 }]}>
              <TouchableOpacity style={[styles.tab, filter === 'ACTIVE' && styles.tabActive]} onPress={() => setFilter('ACTIVE')}>
                <Text style={[styles.tabText, filter === 'ACTIVE' && styles.tabTextActive]}>Ativos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, filter === 'HISTORY' && styles.tabActive]} onPress={() => setFilter('HISTORY')}>
                <Text style={[styles.tabText, filter === 'HISTORY' && styles.tabTextActive]}>Histórico</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FILTRO DE DATA HISTÓRICO */}
          {filter === 'HISTORY' && (
            <View style={styles.dateFilterWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateFilterScroll}>
                {['HOJE', '3 DIAS', '7 DIAS', 'ESTA SEMANA', 'ÚLTIMA SEMANA', '30 DIAS'].map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={[styles.dateBtn, dateRange === range && styles.dateBtnActive]}
                    onPress={() => setDateRange(range as DateRange)}
                  >
                    <Text style={[styles.dateBtnText, dateRange === range && styles.dateBtnTextActive]}>{range}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* LISTAGEM - GRID NO PC / LISTA NO MOBILE */}
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 50 }} />
          ) : (
            <FlatList
              data={isLargeScreen ? formatData(orders, 3) : orders}
              keyExtractor={(item) => item.id}
              numColumns={isLargeScreen ? 3 : 1}
              key={isLargeScreen ? 'grid' : 'list'}
              columnWrapperStyle={isLargeScreen ? { gap: 15 } : null}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} tintColor="#F59E0B" />}
              renderItem={({ item }) => (
                <OrderCardAnimated
                  item={item}
                  isLargeScreen={isLargeScreen}
                  getStatusStyle={getStatusStyle}
                  onPress={() => router.push(`/brand/order-details?orderId=${item.id}`)}
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhum pedido encontrado.</Text>}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  mainWrapper: { flex: 1, alignItems: 'center' },
  container: { flex: 1, width: '100%', maxWidth: 1200, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  backBtn: { padding: 5, marginRight: 10 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  dateSubTitle: { color: '#666', fontSize: 12, fontWeight: 'bold' },

  topActionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#171717', borderRadius: 15, paddingHorizontal: 15, height: 50, marginBottom: 15, borderWidth: 1, borderColor: '#262626' },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14, marginLeft: 10 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#171717', borderRadius: 15, padding: 5, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#262626' },
  tabText: { color: '#666', fontWeight: 'bold' },
  tabTextActive: { color: '#F59E0B' },

  dateFilterWrapper: { marginBottom: 20 },
  dateFilterScroll: { gap: 10 },
  dateBtn: { backgroundColor: '#171717', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#262626' },
  dateBtnActive: { borderColor: '#F59E0B', backgroundColor: '#F59E0B10' },
  dateBtnText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  dateBtnTextActive: { color: '#F59E0B' },

  orderCard: { backgroundColor: '#171717', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#262626' },
  orderCardInvisible: { backgroundColor: 'transparent', padding: 18, marginBottom: 15 },
  orderCardPending: { backgroundColor: '#F59E0B08', borderColor: '#F59E0B50' },

  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { color: '#FFF', fontWeight: '900', fontSize: 16 },

  badgePending: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#000', marginRight: 6 },
  badgeTextPending: { color: '#000', fontSize: 11, fontWeight: '900' },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900' },
  customerName: { color: '#DDD', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  mesaDestaque: { color: '#F59E0B', fontSize: 13, fontWeight: '900', marginBottom: 10 },

  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { color: '#666', fontSize: 11, marginLeft: 5 },
  orderTotal: { color: '#F59E0B', fontWeight: '900', fontSize: 16 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 }
});