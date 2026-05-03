import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import api from '../../services/api';
import { generateOrderHtml } from '../../utils/printTemplate';

export default function OrderDetailsScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  
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
      await Print.printAsync({ html });
    } catch (e) {
      console.error(e);
      alert("Erro ao abrir gerenciador de impressão");
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
      alert("Erro ao atualizar status do pedido");
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
      
      <View style={styles.container}>
        {/* HEADER COM BOTÃO DE VOLTAR E REIMPRIMIR */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={30} color="#F59E0B" />
            <Text style={styles.headerTitle}>Pedido #{order?.displayId}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleRePrint} 
            style={styles.printBtnSmall}
            activeOpacity={0.7}
          >
            <Feather name="printer" size={22} color="#F59E0B" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* CARD DO CLIENTE */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <Text style={styles.customerName}>{order?.customerName}</Text>
            <View style={styles.infoRow}>
              <Feather name="phone" size={14} color="#666" />
              <Text style={styles.customerPhone}>{order?.customerPhone}</Text>
            </View>
          </View>

          {/* CARD DE ENTREGA E PAGAMENTO */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Entrega e Pagamento</Text>
            
            {/* LÓGICA NOVA: SE TIVER MESA, EXIBE EM DESTAQUE E ESCONDE O ENDEREÇO */}
            {order?.mesa || order?.deliveryMethod === 'MESA' ? (
              <View style={styles.mesaBadge}>
                <Feather name="coffee" size={20} color="#F59E0B" />
                <Text style={styles.mesaText}>ATENDIMENTO: MESA {order.mesa || order.address.replace('Mesa ', '')}</Text>
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
                    <Feather name="map-pin" size={14} color="#888" />
                    <Text style={styles.addressText}>{order.address}</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Feather name="dollar-sign" size={16} color="#10B981" />
              <Text style={styles.detailText}>
                Pagamento: <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{order?.paymentMethod || 'Não informado'}</Text>
              </Text>
            </View>
          </View>

          {/* CARD DE ITENS */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Itens do Pedido</Text>
            {order?.items?.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.qtyBadge}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.observation ? (
                    <Text style={styles.itemObs}>Obs: {item.observation}</Text>
                  ) : null}
                </View>
                <Text style={styles.itemPrice}>
                  R$ {(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total do Pedido</Text>
              <Text style={styles.totalValue}>R$ {order?.total?.toFixed(2)}</Text>
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
                {updating ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>ACEITAR E PREPARAR</Text>}
              </TouchableOpacity>
            )}

            {order?.status === 'PREPARING' && (
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: '#3B82F6' }]}
                onPress={() => updateStatus('DISPATCHED')}
                disabled={updating}
              >
                {/* Texto dinâmico: Se for mesa, "Pronto para Servir" faz mais sentido que "Saiu para Entrega" */}
                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.btnText, { color: '#FFF' }]}>{order?.mesa ? 'PRONTO PARA SERVIR' : 'SAIU PARA ENTREGA'}</Text>}
              </TouchableOpacity>
            )}

            {order?.status === 'DISPATCHED' && (
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: '#10B981' }]}
                onPress={() => updateStatus('DELIVERED')}
                disabled={updating}
              >
                {updating ? <ActivityIndicator color="#FFF" /> : <Text style={[styles.btnText, { color: '#FFF' }]}>{order?.mesa ? 'CONCLUIR ATENDIMENTO' : 'MARCAR COMO ENTREGUE'}</Text>}
              </TouchableOpacity>
            )}

            {/* CANCELAMENTO */}
            {canCancel && (
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setCancelAlertVisible(true)}
                disabled={updating}
              >
                <Feather name="x-circle" size={18} color="#EF4444" />
                <Text style={styles.btnCancelText}>CANCELAR PEDIDO</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      <CustomAlert 
        visible={cancelAlertVisible}
        title="Cancelar Pedido?"
        message="Esta ação não pode ser desfeita. O cliente será notificado sobre o cancelamento."
        iconName="alert-triangle"
        iconColor="#EF4444"
        confirmText="SIM, CANCELAR"
        cancelText="VOLTAR"
        showCancel={true}
        onConfirm={() => {
          setCancelAlertVisible(false);
          updateStatus('CANCELLED');
        }}
        onCancel={() => setCancelAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  container: { flex: 1, paddingHorizontal: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },
  
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 20 
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginLeft: 10 },
  printBtnSmall: { 
    backgroundColor: '#171717', 
    padding: 12, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#262626' 
  },

  card: { 
    backgroundColor: '#171717', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#262626' 
  },
  sectionTitle: { 
    color: '#666', 
    fontSize: 12, 
    fontWeight: 'bold', 
    textTransform: 'uppercase', 
    marginBottom: 15,
    letterSpacing: 1
  },
  customerName: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  customerPhone: { color: '#888', marginLeft: 6, fontSize: 14 },

  /* Estilos para Mesa (Novo) */
  mesaBadge: {
    backgroundColor: '#F59E0B15',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  mesaText: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 10,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },

  /* Estilos para Entrega e Pagamento */
  detailText: { color: '#DDD', fontSize: 15, marginLeft: 8 },
  addressBox: { 
    backgroundColor: '#26262640', 
    padding: 12, 
    borderRadius: 12, 
    marginTop: 10, 
    flexDirection: 'row', 
    alignItems: 'flex-start' 
  },
  addressText: { color: '#AAA', fontSize: 13, marginLeft: 8, flex: 1, lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#262626', marginVertical: 15 },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  qtyBadge: { 
    backgroundColor: '#F59E0B15', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    marginRight: 12 
  },
  itemQty: { color: '#F59E0B', fontWeight: 'bold', fontSize: 14 },
  itemName: { color: '#DDD', fontSize: 16, fontWeight: '600' },
  itemObs: { color: '#F59E0B', fontSize: 12, marginTop: 4, fontStyle: 'italic', opacity: 0.9 },
  itemPrice: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginLeft: 10 },

  totalRow: { 
    borderTopWidth: 1, 
    borderTopColor: '#262626', 
    paddingTop: 20, 
    marginTop: 10, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  totalLabel: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  totalValue: { color: '#F59E0B', fontSize: 24, fontWeight: '900' },

  actions: { marginTop: 10, marginBottom: 30 },
  btnPrimary: { 
    backgroundColor: '#F59E0B', 
    padding: 18, 
    borderRadius: 18, 
    alignItems: 'center', 
    marginBottom: 15,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  btnText: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  
  btnCancel: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#EF444430',
    borderRadius: 18
  },
  btnCancelText: { 
    color: '#EF4444', 
    fontWeight: 'bold', 
    fontSize: 14, 
    marginLeft: 8 
  }
});