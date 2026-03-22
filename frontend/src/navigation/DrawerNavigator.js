import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../redux/slices/authSlice';
import { COLORS } from '../constants/theme';

// Stacks
import ProductStack from './ProductStack';
import OrdersStack from './OrdersStack';
import AdminStack from './AdminStack';
import AuthStack from './AuthStack';

// Screens
import ProfileScreen from '../screens/ProfileScreen';
import CartScreen from '../screens/CartScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReviewScreen from '../screens/ReviewScreen';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { items: cartItems } = useSelector((s) => s.cart);

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: COLORS.surface }}
      contentContainerStyle={{ flex: 1 }}
    >
      {/* User Header */}
      <View style={styles.header}>
        {user?.avatar?.url ? (
          <Image source={{ uri: user.avatar.url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Guest'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email || 'Not logged in'}</Text>
          {user?.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu Items */}
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>

      {/* Cart Button - Only show when logged in */}
      {user && (
        <>
          <TouchableOpacity style={styles.cartBtn} onPress={() => props.navigation.navigate('Cart')}>
            <View>
              <Ionicons name="cart-outline" size={22} color={COLORS.textSecondary} />
              {cartItems.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cartBtnText}>Cart</Text>
            {cartItems.length > 0 && (
              <Text style={styles.cartCount}>{cartItems.length} item{cartItems.length > 1 ? 's' : ''}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />
        </>
      )}

      {/* Logout / Login */}
      {user ? (
        <TouchableOpacity style={styles.logoutBtn} onPress={() => { dispatch(logout());}}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.logoutBtn} onPress={() => props.navigation.navigate('Login')}>
          <Ionicons name="log-in-outline" size={22} color={COLORS.primary} />
          <Text style={[styles.logoutText, { color: COLORS.primary }]}>Login / Register</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 20 }} />
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { user } = useSelector((s) => s.auth);

  // ✅ These options apply to ALL screens in the drawer including nested stacks
  const drawerOptions = {
    headerStyle: { backgroundColor: COLORS.surface },
    headerTintColor: COLORS.text,
    headerTitleStyle: { fontWeight: '700', marginLeft: 10 },
    headerTitleContainerStyle: { paddingLeft: 10 },
    drawerActiveTintColor: COLORS.primary,
    drawerInactiveTintColor: COLORS.textSecondary,
    drawerActiveBackgroundColor: COLORS.primary + '20',
    drawerStyle: { backgroundColor: COLORS.surface, width: 280 },
    drawerLabelStyle: { fontSize: 14, fontWeight: '600', marginLeft: -10 },
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={drawerOptions}
    >
      <Drawer.Screen
        name="Home"
        component={ProductStack}
        options={{ headerShown: false, title: 'Products', drawerIcon: ({ color }) => <Ionicons name="storefront-outline" size={22} color={color} /> }}
      />
      {user && (
        <Drawer.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifications', drawerIcon: ({ color }) => <Ionicons name="notifications-outline" size={22} color={color} /> }}
        />
      )}
      {user && (
        <>
          <Drawer.Screen
            name="Orders"
            component={OrdersStack}
            options={{ headerShown: false, title: 'My Orders', drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} /> }}
          />
          <Drawer.Screen
            name="MyReviews"
            component={ReviewScreen}
            options={{ title: 'My Reviews', drawerIcon: ({ color }) => <Ionicons name="star-outline" size={22} color={color} /> }}
          />
          <Drawer.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'My Profile', drawerIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} /> }}
          />
        </>
      )}
      {user?.role === 'admin' && (
        <Drawer.Screen
          name="Admin"
          component={AdminStack}
          options={{ headerShown: false, title: 'Admin Panel', drawerIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" size={22} color={color} /> }}
        />
      )}
      <Drawer.Screen
        name="Login"
        component={AuthStack}
        options={{ headerShown: false, title: 'Login / Register', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'My Cart', drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8, gap: 14 },
  avatarImage: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: COLORS.primary },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.background, fontSize: 22, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  userEmail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  adminBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: COLORS.accent, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  adminBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cartBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  cartBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.primary, borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: COLORS.background, fontSize: 9, fontWeight: '800' },
  cartBtnText: { flex: 1, color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  cartCount: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16, marginVertical: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  logoutText: { color: COLORS.error, fontSize: 14, fontWeight: '600' },
});