import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { COLORS } from '../constants/theme';
import AdminDashboard from '../screens/AdminDashboard';
import AdminUsers from '../screens/AdminUsers';
import AdminProducts from '../screens/AdminProducts';
import AdminOrders from '../screens/AdminOrders';
import AdminReviews from '../screens/AdminReviews';
import ProductFormScreen from '../screens/ProductFormScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import AdminDrawerContent from './AdminDrawer';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const options = { 
  headerStyle: { backgroundColor: COLORS.surface }, 
  headerTintColor: COLORS.text, 
  headerTitleStyle: { fontWeight: '700' } 
};

function AdminStackNavigator() {
  return (
    <Stack.Navigator screenOptions={options}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="AdminUsers" component={AdminUsers} options={{ title: 'Manage Users' }} />
      <Stack.Screen name="AdminProducts" component={AdminProducts} options={{ title: 'Manage Products' }} />
      <Stack.Screen name="AdminOrders" component={AdminOrders} options={{ title: 'Manage Orders' }} />
      <Stack.Screen name="AdminReviews" component={AdminReviews} options={{ title: 'Manage Reviews' }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Product Form' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Details' }} />
    </Stack.Navigator>
  );
}

export default function AdminStack() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AdminDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.textSecondary,
        drawerActiveBackgroundColor: COLORS.primary + '20',
        drawerStyle: { backgroundColor: COLORS.surface, width: 280 },
        drawerLabelStyle: { fontSize: 14, fontWeight: '600', marginLeft: -10 },
      }}
    >
      <Drawer.Screen
        name="AdminStackNavigator"
        component={AdminStackNavigator}
        options={{ headerShown: false }}
      />
    </Drawer.Navigator>
  );
}