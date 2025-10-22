import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

// Componente simple inline
const SimpleScreen = ({ title }: { title: string }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{title}</Text>
  </View>
);

export const SimpleTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        children={() => <SimpleScreen title="Home" />}
        options={{
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        children={() => <SimpleScreen title="Profile" />}
        options={{
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 18,
    color: '#333',
  },
});