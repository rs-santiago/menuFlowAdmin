import { Feather } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../../components/CustomAlert';
import api from '../../../services/api';

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
  empty?: boolean; // Propriedade para o item fantasma
}

export default function UsersListScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  
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

  // Função para evitar que o último card estique no Desktop
  const formatData = (dataList: any[], numColumns: number) => {
    const totalRows = Math.floor(dataList.length / numColumns);
    let totalLastRow = dataList.length - (totalRows * numColumns);
    const formattedList = [...dataList];
    while (totalLastRow !== 0 && totalLastRow !== numColumns) {
      formattedList.push({ id: `blank-${totalLastRow}`, empty: true });
      totalLastRow++;
    }
    return formattedList;
  };

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
          title: 'Usuários', 
          headerTintColor: '#F59E0B', 
          headerStyle: { backgroundColor: '#0A0A0A' } 
        }} 
      />

      <View style={styles.mainWrapper}>
        <View style={styles.container}>
          
          {/* CABEÇALHO */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Gerenciar Acessos</Text>
              <Text style={styles.subtitle}>{users.length} {users.length === 1 ? 'cadastrado' : 'cadastrados'}</Text>
            </View>

            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => router.push('/admin/users/form')}
            >
              <Feather name="user-plus" size={20} color="#000" />
              {isLargeScreen && <Text style={styles.addBtnText}>Novo Usuário</Text>}
            </TouchableOpacity>
          </View>

          {/* LISTA DE USUÁRIOS EM GRID NO PC */}
          <FlatList
            data={isLargeScreen ? formatData(users, 2) : users}
            keyExtractor={(item) => item.id}
            numColumns={isLargeScreen ? 2 : 1}
            key={isLargeScreen ? 'h-users' : 'v-users'}
            columnWrapperStyle={isLargeScreen ? { gap: 16 } : null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />}
            renderItem={({ item }) => {
              if (item.empty) {
                return <View style={{ flex: 1, backgroundColor: 'transparent', marginBottom: 15 }} />;
              }

              const isSuper = item.role === 'SUPER_ADMIN';

              return (
                <TouchableOpacity 
                  style={[styles.userCard, isLargeScreen && { flex: 1 }]}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/admin/users/form?id=${item.id}`)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                    </View>
                    <Feather name="edit-3" size={18} color="#444" />
                  </View>

                  <View style={styles.cardBottom}>
                    {isSuper ? (
                      <View style={[styles.roleBadge, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B30' }]}>
                        <Feather name="shield" size={12} color="#F59E0B" style={{ marginRight: 6 }} />
                        <Text style={[styles.roleText, { color: '#F59E0B' }]}>SUPER ADMIN</Text>
                      </View>
                    ) : (
                      <View style={styles.brandsContainer}>
                        <Feather name="briefcase" size={12} color="#888" style={{ marginRight: 8 }} />
                        <Text style={styles.brandsText} numberOfLines={1}>
                          {item.brands.length > 0 
                            ? item.brands.map((b: any) => b.brand.name).join(', ') 
                            : 'Nenhuma loja vinculada'}
                        </Text>
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
      </View>

      <CustomAlert {...alertConfig} onConfirm={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  centered: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  mainWrapper: { flex: 1, alignItems: 'center' },
  container: { flex: 1, width: '100%', maxWidth: 1100, paddingHorizontal: 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 25 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  subtitle: { color: '#888', fontSize: 13, marginTop: 2 },
  addBtn: { 
    backgroundColor: '#F59E0B', 
    paddingHorizontal: 15,
    height: 45, 
    borderRadius: 14, 
    flexDirection: 'row',
    justifyContent: 'center', 
    alignItems: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  addBtnText: { color: '#000', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },

  listContent: { paddingBottom: 40 },
  
  userCard: { backgroundColor: '#121212', borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#262626', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  userEmail: { color: '#666', fontSize: 13, marginTop: 2 },
  
  cardBottom: { backgroundColor: '#171717', paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#262626', flexDirection: 'row', alignItems: 'center', minHeight: 45 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  roleText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  brandsContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  brandsText: { color: '#888', fontSize: 12, flex: 1 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#444', marginTop: 15, fontSize: 14 },
});