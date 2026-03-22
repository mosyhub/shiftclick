import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/notifications/my-notifications?limit=50');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.log('Error loading notifications:', error.message);
      // Fallback to local notifications if API fails
      const presented = await Notifications.getPresentedNotificationsAsync();
      setNotifications(presented.reverse());
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleNotificationPress = (notification) => {
    const data = notification.data;
    if (data?.orderId) {
      navigation.navigate('Orders', { screen: 'OrderDetail', params: { orderId: data.orderId } });
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      // Update local state
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error.message);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error.message);
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, !item.isRead && styles.unread]} 
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={item.type === 'order' ? 'bag-check' : 'notifications'} 
          size={24} 
          color={COLORS.primary} 
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        {item.data?.orderId && (
          <Text style={styles.tap}>Tap to view order details →</Text>
        )}
        <Text style={styles.time}>{new Date(item.sentAt).toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity 
        style={styles.deleteBtn}
        onPress={() => deleteNotification(item._id)}
      >
        <Ionicons name="close" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadNotifications}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>You'll see order updates and promotions here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, gap: 12,
  },
  unread: {
    backgroundColor: COLORS.primary + '10',
    borderColor: COLORS.primary + '40',
  },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1 },
  title: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  body: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  tap: { color: COLORS.primary, fontSize: 12, marginTop: 6, fontWeight: '600' },
  time: { color: COLORS.textMuted, fontSize: 11, marginTop: 8 },
  deleteBtn: { justifyContent: 'center', paddingLeft: 8 },
  empty: { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});