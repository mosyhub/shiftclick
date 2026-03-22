import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../redux/slices/authSlice';
import { COLORS } from '../constants/theme';

const adminMenuItems = [
  { label: 'Dashboard', icon: 'bar-chart-outline', screen: 'AdminDashboard' },
  { label: 'Manage Users', icon: 'people-outline', screen: 'AdminUsers' },
  { label: 'Manage Products', icon: 'cube-outline', screen: 'AdminProducts' },
  { label: 'Manage Orders', icon: 'receipt-outline', screen: 'AdminOrders' },
  { label: 'Manage Reviews', icon: 'star-outline', screen: 'AdminReviews' },
];

export default function AdminDrawerContent(props) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const currentRoute = props.state?.routes[props.state.index]?.name;

  const handleNavigate = (screenName) => {
    props.navigation.navigate('AdminStackNavigator', { screen: screenName });
    props.navigation.closeDrawer();
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: COLORS.surface }}
      contentContainerStyle={{ flex: 1 }}
    >
      {/* User Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.avatar?.url ? (
            <Image source={{ uri: user.avatar.url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'A'}</Text>
            </View>
          )}
          <View style={styles.adminBadgeIcon}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
          </View>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Admin'}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={{ flex: 1 }}>
        {adminMenuItems.map((item, index) => {
          const isActive = currentRoute === item.screen;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => handleNavigate(item.screen)}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(logout())}>
        <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.background,
    fontSize: 22,
    fontWeight: '800',
  },
  adminBadgeIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  adminBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
    gap: 14,
  },
  menuItemActive: {
    backgroundColor: COLORS.primary + '20',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: -4,
  },
  menuLabelActive: {
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
});