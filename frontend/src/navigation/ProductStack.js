import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ProductFormScreen from '../screens/ProductFormScreen';
import NotificationDetailScreen from '../screens/NotificationDetailScreen';

const Stack = createNativeStackNavigator();
const options = { headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.text, headerTitleStyle: { fontWeight: '700' } };

export default function ProductStack() {
  return (
    <Stack.Navigator screenOptions={options}>
      <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Shift & Click' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Product Form' }} />

      <Stack.Screen 
        name="PromoDetail" 
        component={NotificationDetailScreen} 
        options={{ title: 'Exclusive Promo 🎁' }} 
      />
      
    </Stack.Navigator>
  );
}