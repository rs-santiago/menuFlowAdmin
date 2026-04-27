import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../../components/CustomAlert';
import api from '../../../services/api';

// Tipagem baseada no retorno do nosso backend
interface UserBrand {
  brand: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  brands: UserBrand[];
}

export default function UsersListScreen() {
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', iconName: 'info' as any, iconColor: '#F59E0B'
  });

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      setAlertConfig({
        visible: true, title: 'Erro', message: 'Não foi possível carregar os usuários.',
        iconName: 'x-circle', iconColor: '#EF4444'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#F59E0B" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: 'Usuários do Sistema', 
          headerTintColor: '#F59E0B', 
          headerStyle: { backgroundColor: '#0A0A0A' } 
        }} 
      />

      <View style={styles.container}>
        
        {/* CABEÇALHO COM BOTÃO DE ADICIONAR */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Gerenciar Acessos</Text>
            <Text style={styles.subtitle}>{users.length} {users.length === 1 ? 'cadastrado' : 'cadastrados'}</Text>
          </View>

          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => router.push('/admin/users/form')} // Futura tela de criação
          >
            <Feather name="user-plus" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* LISTA DE USUÁRIOS */}
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
          renderItem={({ item }) => {
            const isSuper = item.role === 'SUPER_ADMIN';

            return (
              <TouchableOpacity 
                style={styles.userCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/admin/users/form?id=${item.id}`)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#444" />
                </View>

                {/* RODAPÉ DO CARD: MOSTRA PERMISSÕES */}
                <View style={styles.cardBottom}>
                  {isSuper ? (
                    <View style={[styles.roleBadge, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B50' }]}>
                      <Feather name="shield" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={[styles.roleText, { color: '#F59E0B' }]}>Acesso Total (Super Admin)</Text>
                    </View>
                  ) : (
                    <View style={styles.brandsContainer}>
                      <Feather name="briefcase" size={12} color="#888" style={{ marginRight: 6 }} />
                      {item.brands.length > 0 ? (
                        <Text style={styles.brandsText} numberOfLines={1}>
                          {item.brands.map(b => b.brand.name).join(', ')}
                        </Text>
                      ) : (
                        <Text style={[styles.brandsText, { color: '#EF4444' }]}>Sem lojas vinculadas</Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={40} color="#333" />
              <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
            </View>
          }
        />

      </View>

      <CustomAlert {...alertConfig} onConfirm={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingHorizontal: 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 25 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  subtitle: { color: '#888', fontSize: 13, marginTop: 2 },
  addBtn: { backgroundColor: '#F59E0B', width: 45, height: 45, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  listContent: { paddingBottom: 40 },
  
  userCard: { backgroundColor: '#121212', borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#262626', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  userEmail: { color: '#888', fontSize: 13, marginTop: 2 },
  
  cardBottom: { backgroundColor: '#171717', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#262626', flexDirection: 'row', alignItems: 'center' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  
  brandsContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  brandsText: { color: '#AAA', fontSize: 13, flex: 1 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', marginTop: 15, fontSize: 14 },
});