import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import AdminDashboard from '../screens/AdminDashboard';
import AdminUsers from '../screens/AdminUsers';
import AdminProducts from '../screens/AdminProducts';
import AdminOrders from '../screens/AdminOrders';
import AdminReviews from '../screens/AdminReviews';
import ProductFormScreen from '../screens/ProductFormScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';


const Stack = createNativeStackNavigator();
const options = { headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.text, headerTitleStyle: { fontWeight: '700' } };

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={options}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Admin Dashboard 🔐' }} />
      <Stack.Screen name="AdminUsers" component={AdminUsers} options={{ title: 'Manage Users' }} />
      <Stack.Screen name="AdminProducts" component={AdminProducts} options={{ title: 'Manage Products' }} />
      <Stack.Screen name="AdminOrders" component={AdminOrders} options={{ title: 'Manage Orders' }} />
      <Stack.Screen name="AdminReviews" component={AdminReviews} options={{ title: 'Manage Reviews' }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Product Form' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
    </Stack.Navigator>
  );
}