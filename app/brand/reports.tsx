import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

export default function ReportsScreen() {
  const { brandId } = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await api.get(`/admin/brands/${brandId}/reports`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#F59E0B" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#F59E0B" />
          <Text style={styles.headerTitle}>Relatórios de <Text style={{ color: '#F59E0B' }}>Vendas</Text></Text>
        </TouchableOpacity>

        {/* RESUMO DE HOJE */}
        <Text style={styles.sectionTitle}>Performance de Hoje</Text>
        <View style={styles.mainCard}>
          <Text style={styles.cardLabel}>Faturamento Hoje</Text>
          <Text style={styles.mainValue}>{formatCurrency(data?.today.revenue)}</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View>
              <Text style={styles.subLabel}>Pedidos</Text>
              <Text style={styles.subValue}>{data?.today.count}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.subLabel}>Ticket Médio</Text>
              <Text style={styles.subValue}>{formatCurrency(data?.today.averageTicket)}</Text>
            </View>
          </View>
        </View>

        {/* HISTÓRICO TOTAL */}
        <Text style={styles.sectionTitle}>Acumulado Geral</Text>
        <View style={styles.rowBetween}>
          <View style={styles.smallCard}>
            <Feather name="trending-up" size={20} color="#10B981" />
            <Text style={styles.smallLabel}>Vendas Totais</Text>
            <Text style={styles.smallValue}>{formatCurrency(data?.total.revenue)}</Text>
          </View>
          <View style={styles.smallCard}>
            <Feather name="package" size={20} color="#3B82F6" />
            <Text style={styles.smallLabel}>Total Pedidos</Text>
            <Text style={styles.smallValue}>{data?.total.count}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Top 5 Produtos (Mais Vendidos)</Text>
        <View style={styles.card}>
          {data?.topProducts.length > 0 ? data.topProducts.map((prod: any, index: number) => (
            <View key={index} style={styles.productRankRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{index + 1}º</Text>
              </View>
              <Text style={styles.productName} numberOfLines={1}>{prod.name}</Text>
              <Text style={styles.productQty}>{prod.qty} vds</Text>
            </View>
          )) : (
            <Text style={styles.emptyText}>Sem dados suficientes ainda.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Saúde da Operação (Hoje)</Text>
        <View style={[styles.rowBetween, { marginBottom: 40 }]}>
          <View style={[styles.miniCard, { borderLeftColor: '#10B981', borderLeftWidth: 4 }]}>
            <Text style={styles.miniLabel}>CONCLUÍDOS</Text>
            <Text style={styles.miniValue}>{data?.today.count - data?.today.cancelled}</Text>
          </View>
          <View style={[styles.miniCard, { borderLeftColor: '#EF4444', borderLeftWidth: 4 }]}>
            <Text style={styles.miniLabel}>CANCELADOS</Text>
            <Text style={styles.miniValue}>{data?.today.cancelled}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Eficiência Operacional</Text>
        <View style={styles.card}>
          <View style={styles.efficiencyHeader}>
            <Feather name="clock" size={24} color="#F59E0B" />
            <Text style={styles.efficiencyValue}>{data?.efficiency.avgPrepTime} min</Text>
          </View>
          <Text style={styles.cardDescription}>Tempo médio entre o pedido entrar e sair para entrega.</Text>

          {/* Barra de progresso visual */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {
              width: `${Math.min((data?.efficiency.avgPrepTime / 60) * 100, 100)}%`,
              backgroundColor: data?.efficiency.avgPrepTime < 30 ? '#10B981' : '#EF4444'
            }]} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Comportamento do Cliente</Text>
        <View style={styles.rowBetween}>
          <View style={styles.loyaltyCard}>
            <Text style={styles.loyaltyTitle}>Recorrência</Text>
            <Text style={styles.loyaltyValue}>{data?.loyalty.rate.toFixed(1)}%</Text>
            <Text style={styles.loyaltySub}>{data?.loyalty.recurringCount} clientes voltaram</Text>
          </View>
          <View style={styles.loyaltyCard}>
            <Text style={styles.loyaltyTitle}>Novos</Text>
            <Text style={styles.loyaltyValue}>{data?.loyalty.newCount}</Text>
            <Text style={styles.loyaltySub}>este mês</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },
  container: { padding: 25 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginLeft: 15 },
  sectionTitle: { color: '#888', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  mainCard: { backgroundColor: '#171717', borderRadius: 30, padding: 25, marginBottom: 30, borderWidth: 1, borderColor: '#262626' },
  cardLabel: { color: '#888', fontSize: 14, fontWeight: '600' },
  mainValue: { color: '#F59E0B', fontSize: 38, fontWeight: '900', marginVertical: 10 },
  divider: { height: 1, backgroundColor: '#262626', marginVertical: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  subLabel: { color: '#666', fontSize: 12, fontWeight: '600' },
  subValue: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 5 },
  smallCard: { backgroundColor: '#171717', width: '48%', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: '#262626' },
  smallLabel: { color: '#666', fontSize: 11, fontWeight: 'bold', marginTop: 10 },
  smallValue: { color: '#FFF', fontSize: 15, fontWeight: '900', marginTop: 5 },
  card: { backgroundColor: '#171717', borderRadius: 25, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#262626' },
  productRankRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  rankBadge: { backgroundColor: '#F59E0B20', width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  rankText: { color: '#F59E0B', fontWeight: 'bold', fontSize: 12 },
  productName: { color: '#FFF', flex: 1, fontSize: 15, fontWeight: '600' },
  productQty: { color: '#888', fontWeight: '900', fontSize: 13 },
  miniCard: { backgroundColor: '#171717', width: '48%', padding: 15, borderRadius: 15 },
  miniLabel: { color: '#666', fontSize: 10, fontWeight: 'bold' },
  miniValue: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 5 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 },
  efficiencyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  efficiencyValue: { color: '#FFF', fontSize: 24, fontWeight: '900', marginLeft: 10 },
  cardDescription: { color: '#666', fontSize: 13, marginBottom: 15 },
  progressBarBg: { height: 8, backgroundColor: '#262626', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  loyaltyCard: { backgroundColor: '#171717', width: '48%', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: '#262626' },
  loyaltyTitle: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  loyaltyValue: { color: '#F59E0B', fontSize: 28, fontWeight: '900', marginVertical: 5 },
  loyaltySub: { color: '#555', fontSize: 10, fontWeight: '600' },
});