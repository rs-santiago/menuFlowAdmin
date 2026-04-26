import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import { useColorScheme } from '@/components/useColorScheme';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#F59E0B', tabBarStyle: { backgroundColor: '#0A0A0A', borderTopColor: '#262626' } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />, // Pode mudar o ícone depois
        }}
      />
      <Tabs.Screen
        name="settings" // <--- Nome exato do arquivo que você renomeou
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <TabBarIcon name="gear" color={color} />, // Ícone de engrenagem
        }}
      />
    </Tabs>
  );
}
