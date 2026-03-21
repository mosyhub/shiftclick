import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS } from '../constants/theme';

// Admin Route Guard - Only admins can access
export function AdminGuard({ children, navigation }) {
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    if (user.role !== 'admin') {
      navigation.navigate('Home', { screen: 'ProductList' });
      return;
    }
  }, [user, navigation]);

  if (!user || user.role !== 'admin') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return children;
}

// User Route Guard - Only regular users can access (not admins)
export function UserGuard({ children, navigation }) {
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    if (user.role === 'admin') {
      navigation.navigate('Admin', { screen: 'AdminDashboard' });
      return;
    }
  }, [user, navigation]);

  if (!user || user.role === 'admin') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return children;
}