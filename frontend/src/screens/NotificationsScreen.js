import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setRefreshing(true);
      const presented = await Notifications.getPresentedNotificationsAsync();
      setNotifications(presented.reverse());
    } catch (error) {
      console.log('Error loading notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = (notification) => {
    const data = notification.request.content.data;
    if (data?.orderId) {
      navigation.navigate('OrderDetail', { orderId: data.orderId });
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleNotificationPress(item)}>
      <View style={styles.iconContainer}>
        <Ionicons name="notifications" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.request.content.title}</Text>
        <Text style={styles.body}>{item.request.content.body}</Text>
        {item.request.content.data?.orderId && (
          <Text style={styles.tap}>Tap to view order details →</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.request.identifier}
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
            <Text style={styles.emptyText}>You'll see order updates here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 12 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, gap: 12,
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
  empty: { alignItems: 'center', marginTop: 100, gap: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});