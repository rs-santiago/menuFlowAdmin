import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';
import { generateOrderHtml } from '../../utils/printTemplate';

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 800;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cancelAlertVisible, setCancelAlertVisible] = useState(false);

  const fetchOrderDetails = async () => {
    try {
      const response = await api.get(`/admin/orders/${orderId}`);
      setOrder(response.data);
    } catch (e) {
      console.error("Erro ao carregar detalhes:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRePrint = async () => {
    if (!order) return;
    try {
      const html = generateOrderHtml(order, order.brand?.name || "Minha Loja", order.brand?.logoUrl || '');
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
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      if (newStatus === 'DELIVERED' || newStatus === 'CANCELLED') {
        router.back();
      } else {
        fetchOrderDetails();
      }
    } catch (e) {
      console.error("Erro status");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrderDetails();
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#F59E0B" size="large" />
      </View>
    );
  }

  const canCancel = order?.status !== 'DELIVERED' && order?.status !== 'CANCELLED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mainWrapper}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="chevron-left" size={30} color="#F59E0B" />
              <Text style={styles.headerTitle}>Pedido #{order?.displayId}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRePrint} style={styles.printBtnSmall}>
              <Feather name="printer" size={22} color="#F59E0B" />
              {isLargeScreen && <Text style={styles.printBtnText}>Imprimir Cupom</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

            <View style={isLargeScreen ? styles.desktopLayout : styles.mobileLayout}>

              {/* COLUNA 1: DADOS DO CLIENTE E LOGÍSTICA */}
              <View style={isLargeScreen ? styles.leftColumn : styles.fullWidth}>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Cliente</Text>
                  <Text style={styles.customerName}>{order?.customerName}</Text>
                  <View style={styles.infoRow}>
                    <Feather name="phone" size={14} color="#666" />
                    <Text style={styles.customerPhone}>{order?.customerPhone}</Text>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Entrega e Pagamento</Text>

                  {order?.mesa || order?.deliveryMethod === 'MESA' ? (
                    <View style={styles.mesaBadge}>
                      <Feather name="coffee" size={20} color="#F59E0B" />
                      <Text style={styles.mesaText}>MESA {order.mesa || order.address?.replace('Mesa ', '')}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.infoRow}>
                        <Feather name={order?.deliveryMethod === 'delivery' ? 'truck' : 'shopping-bag'} size={16} color="#F59E0B" />
                        <Text style={styles.detailText}>
                          {order?.deliveryMethod === 'delivery' ? 'Entrega (Motoboy)' : 'Retirada no Balcão'}
                        </Text>
                      </View>
                      {order?.deliveryMethod === 'delivery' && order?.address && (
                        <View style={styles.addressBox}>
                          <Text style={styles.addressText}>{order.address}</Text>
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <Feather name="dollar-sign" size={16} color="#10B981" />
                    <Text style={styles.detailText}>
                      Pagamento: <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{order?.paymentMethod || 'A combinar'}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* COLUNA 2: ITENS E AÇÕES */}
              <View style={isLargeScreen ? styles.rightColumn : styles.fullWidth}>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Itens do Pedido</Text>
                  {order?.items?.map((item: any, index: number) => (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.qtyBadge}><Text style={styles.itemQty}>{item.quantity}x</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.observation && <Text style={styles.itemObs}>Obs: {item.observation}</Text>}
                      </View>
                      <Text style={styles.itemPrice}>R$ {(item.price * item.quantity).toFixed(2)}</Text>
                    </View>
                  ))}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>R$ {order?.total?.toFixed(2)}</Text>
                  </View>
                </View>

                {/* BOTÕES DE AÇÃO */}
                <View style={styles.actions}>
                  {order?.status === 'PENDING' && (
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => updateStatus('PREPARING')} disabled={updating}>
                      {updating ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>ACEITAR E PREPARAR</Text>}
                    </TouchableOpacity>
                  )}

                  {order?.status === 'PREPARING' && (
                    <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#3B82F6' }]} onPress={() => updateStatus('DISPATCHED')} disabled={updating}>
                      {updating ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.btnText, { color: '#FFF' }]}>{order?.mesa ? 'PRONTO PARA SERVIR' : 'SAIU PARA ENTREGA'}</Text>}
                    </TouchableOpacity>
                  )}

                  {order?.status === 'DISPATCHED' && (
                    <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#10B981' }]} onPress={() => updateStatus('DELIVERED')} disabled={updating}>
                      {updating ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.btnText, { color: '#FFF' }]}>{order?.mesa ? 'CONCLUIR ATENDIMENTO' : 'MARCAR COMO ENTREGUE'}</Text>}
                    </TouchableOpacity>
                  )}

                  {canCancel && (
                    <TouchableOpacity style={styles.btnCancel} onPress={() => setCancelAlertVisible(true)} disabled={updating}>
                      <Feather name="x-circle" size={18} color="#EF4444" />
                      <Text style={styles.btnCancelText}>CANCELAR PEDIDO</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </View>
          </ScrollView>
        </View>
      </View>

      <CustomAlert
        visible={cancelAlertVisible}
        title="Cancelar Pedido?"
        message="Esta ação não pode ser desfeita."
        iconName="alert-triangle"
        iconColor="#EF4444"
        confirmText="SIM, CANCELAR"
        showCancel={true}
        onConfirm={() => { setCancelAlertVisible(false); updateStatus('CANCELLED'); }}
        onCancel={() => setCancelAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  mainWrapper: { flex: 1, alignItems: 'center' },
  container: { flex: 1, width: '100%', maxWidth: 1000, paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginLeft: 10 },

  printBtnSmall: { backgroundColor: '#171717', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 15, borderWidth: 1, borderColor: '#262626', flexDirection: 'row', alignItems: 'center' },
  printBtnText: { color: '#F59E0B', fontWeight: 'bold', marginLeft: 10 },

  desktopLayout: { flexDirection: 'row', gap: 20 },
  mobileLayout: { flexDirection: 'column' },
  leftColumn: { flex: 1 },
  rightColumn: { flex: 1.2 },
  fullWidth: { width: '100%' },

  card: { backgroundColor: '#141414', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  sectionTitle: { color: '#444', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1.5 },
  customerName: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  customerPhone: { color: '#666', marginLeft: 8, fontSize: 15 },

  mesaBadge: { backgroundColor: '#F59E0B10', borderWidth: 1, borderColor: '#F59E0B30', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center' },
  mesaText: { color: '#F59E0B', fontSize: 18, fontWeight: '900', marginLeft: 12 },

  detailText: { color: '#BBB', fontSize: 15, marginLeft: 10 },
  addressBox: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, marginTop: 12 },
  addressText: { color: '#888', fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 20 },

  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#1A1A1A', padding: 12, borderRadius: 16 },
  qtyBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 15 },
  itemQty: { color: '#F59E0B', fontWeight: 'bold', fontSize: 14 },
  itemName: { color: '#EEE', fontSize: 15, fontWeight: '600' },
  itemObs: { color: '#F59E0B', fontSize: 12, marginTop: 4 },
  itemPrice: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  totalRow: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 20, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#666', fontSize: 16, fontWeight: 'bold' },
  totalValue: { color: '#F59E0B', fontSize: 28, fontWeight: '900' },

  actions: { marginTop: 5 },
  btnPrimary: { backgroundColor: '#F59E0B', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  btnCancel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderWidth: 1, borderColor: '#EF444420', borderRadius: 20 },
  btnCancelText: { color: '#EF4444', fontWeight: 'bold', fontSize: 14, marginLeft: 10 }
});