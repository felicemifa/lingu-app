import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          borderTopColor: '#EEEEEE',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '練習',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📝</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="cross"
        options={{
          title: 'クロス',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>🔀</Text>
          ),
        }}
      />
    </Tabs>
  );
}
