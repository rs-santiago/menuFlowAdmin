import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

export default function ReportsScreen() {
  const { brandId } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 800;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await api.get(`/admin/brands/${brandId}/reports`);
      setData(res.data);
    } catch (e) { 
      console.error("Erro ao carregar relatórios:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchReports(); }, [brandId]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#F59E0B" size="large" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.mainWrapper}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* HEADER */}
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#F59E0B" />
              <Text style={styles.headerTitle}>Relatórios de <Text style={{ color: '#F59E0B' }}>Vendas</Text></Text>
            </TouchableOpacity>

            {/* GRID PRINCIPAL */}
            <View style={isLargeScreen ? styles.desktopGrid : styles.mobileColumn}>
              
              {/* LADO ESQUERDO: PERFORMANCE E ACUMULADO */}
              <View style={isLargeScreen ? styles.leftSide : { width: '100%' }}>
                <Text style={styles.sectionTitle}>Performance de Hoje</Text>
                <View style={styles.mainCard}>
                  <View>
                    <Text style={styles.cardLabel}>Faturamento Hoje</Text>
                    <Text style={[styles.mainValue, isLargeScreen && { fontSize: 42 }]}>
                      {formatCurrency(data?.today.revenue)}
                    </Text>
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subLabel}>Pedidos</Text>
                      <Text style={styles.subValue}>{data?.today.count}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.subLabel}>Ticket Médio</Text>
                      <Text style={styles.subValue}>{formatCurrency(data?.today.averageTicket)}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Acumulado Geral</Text>
                <View style={styles.rowBetween}>
                  <View style={styles.smallCard}>
                    <View style={styles.iconCircle}><Feather name="trending-up" size={18} color="#10B981" /></View>
                    <Text style={styles.smallLabel}>Vendas Totais</Text>
                    <Text style={styles.smallValue}>{formatCurrency(data?.total.revenue)}</Text>
                  </View>
                  <View style={styles.smallCard}>
                    <View style={styles.iconCircle}><Feather name="package" size={18} color="#3B82F6" /></View>
                    <Text style={styles.smallLabel}>Total Pedidos</Text>
                    <Text style={styles.smallValue}>{data?.total.count}</Text>
                  </View>
                </View>
              </View>

              {/* LADO DIREITO: RANKING E SAÚDE */}
              <View style={isLargeScreen ? styles.rightSide : { width: '100%', marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Top 5 Produtos</Text>
                <View style={styles.card}>
                  {data?.topProducts?.length > 0 ? data.topProducts.map((prod: any, index: number) => (
                    <View key={index} style={styles.productRankRow}>
                      <Text style={styles.rankText}>{index + 1}º</Text>
                      <Text style={styles.productName} numberOfLines={1}>{prod.name}</Text>
                      <Text style={styles.productQty}>{prod.qty} vds</Text>
                    </View>
                  )) : <Text style={styles.emptyText}>Sem dados.</Text>}
                </View>

                <Text style={styles.sectionTitle}>Operação e Eficiência</Text>
                <View style={styles.card}>
                  <View style={styles.efficiencyHeader}>
                    <Feather name="clock" size={18} color="#F59E0B" />
                    <Text style={styles.efficiencyValue}>{data?.efficiency.avgPrepTime} min</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {
                      width: `${Math.min((data?.efficiency.avgPrepTime / 60) * 100, 100)}%`,
                      backgroundColor: data?.efficiency.avgPrepTime < 30 ? '#10B981' : '#EF4444'
                    }]} />
                  </View>

                  <View style={[styles.rowBetween, { marginTop: 15 }]}>
                    <View>
                      <Text style={styles.miniLabel}>CONCLUÍDOS</Text>
                      <Text style={[styles.miniValue, { color: '#10B981' }]}>{data ? data.today.count - data.today.cancelled : 0}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.miniLabel}>CANCELADOS</Text>
                      <Text style={[styles.miniValue, { color: '#EF4444' }]}>{data?.today.cancelled}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* FIDELIZAÇÃO */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Fidelização</Text>
            <View style={[styles.rowBetween, { marginBottom: 50 }]}>
              <View style={styles.loyaltyCard}>
                <Text style={styles.loyaltyTitle}>Taxa de Recorrência</Text>
                <Text style={styles.loyaltyValue}>{data?.loyalty.rate.toFixed(1)}%</Text>
              </View>
              <View style={styles.loyaltyCard}>
                <Text style={styles.loyaltyTitle}>Novos Clientes</Text>
                <Text style={styles.loyaltyValue}>{data?.loyalty.newCount}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },
  
  mainWrapper: { 
    flex: 1, 
    backgroundColor: '#0A0A0A',
    width: '100%',
    alignItems: 'center',
  },
  
  scrollView: {
    width: '100%',
  },

  scrollContainer: {
    width: '100%',
    alignItems: 'center',
    flexGrow: 1,
  },

  container: { 
    padding: 20, 
    width: '100%', 
    maxWidth: 1200, 
    flexDirection: 'column',
  },
  
  desktopGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'flex-start',
  },
  
  mobileColumn: { width: '100%' },

  // Forçamos as colunas a ocuparem o espaço real no desktop
  leftSide: {
    width: '58%', 
  },
  rightSide: {
    width: '38%', 
  },

  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, alignSelf: 'flex-start' },
  headerTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', marginLeft: 12 },
  sectionTitle: { color: '#555', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1.5 },
  
  mainCard: { backgroundColor: '#141414', borderRadius: 24, padding: 30, marginBottom: 20, borderWidth: 1, borderColor: '#222', width: '100%' },
  cardLabel: { color: '#888', fontSize: 14, fontWeight: '600' },
  mainValue: { color: '#F59E0B', fontSize: 42, fontWeight: '900', marginTop: 10 },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 25 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 15 },
  
  subLabel: { color: '#444', fontSize: 12, fontWeight: 'bold' },
  subValue: { color: '#EEE', fontSize: 20, fontWeight: '800', marginTop: 5 },
  
  smallCard: { backgroundColor: '#141414', width: '48%', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#222' },
  iconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  smallLabel: { color: '#555', fontSize: 12, fontWeight: 'bold' },
  smallValue: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 5 },
  
  card: { backgroundColor: '#141414', borderRadius: 24, padding: 25, marginBottom: 20, borderWidth: 1, borderColor: '#222', width: '100%' },
  productRankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#1A1A1A', padding: 15, borderRadius: 15 },
  rankText: { color: '#F59E0B', fontWeight: 'bold', fontSize: 13, width: 35 },
  productName: { color: '#BBB', flex: 1, fontSize: 15, fontWeight: '600' },
  productQty: { color: '#666', fontWeight: 'bold', fontSize: 13 },
  
  miniLabel: { color: '#444', fontSize: 10, fontWeight: 'bold' },
  miniValue: { fontSize: 22, fontWeight: '900', marginTop: 5 },
  
  efficiencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  efficiencyValue: { color: '#FFF', fontSize: 26, fontWeight: '900', marginLeft: 10 },
  progressBarBg: { height: 8, backgroundColor: '#222', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  
  loyaltyCard: { backgroundColor: '#141414', width: '48%', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#222' },
  loyaltyTitle: { color: '#555', fontSize: 12, fontWeight: 'bold' },
  loyaltyValue: { color: '#F59E0B', fontSize: 28, fontWeight: '900', marginTop: 10 },
  emptyText: { color: '#333', fontSize: 14, textAlign: 'center', padding: 20 }
});