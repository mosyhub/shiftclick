import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

const STATUS_COLORS = {
  Pending: '#FFB800',
  Processing: '#7B61FF',
  Shipped: '#3B82F6',
  Delivered: '#00FF88',
  Cancelled: '#FF3C3C',
};

const ALL_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function AdminOrders({ navigation }) {
  const { user } = useSelector((s) => s.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigation.navigate('ProductList');
      return;
    }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = (orderId, currentStatus) => {
    Alert.alert(
      'Update Order Status',
      'Select new status:',
      [
        ...ALL_STATUSES
          .filter((s) => s !== currentStatus)
          .map((s) => ({
            text: s,
            onPress: async () => {
              try {
                await api.put(`/orders/${orderId}/status`, {
                  status: s,
                  note: `Status updated to ${s} by admin`,
                });
                fetchOrders();
                Alert.alert('Updated ✅', `Order status changed to ${s}`);
              } catch (error) {
                Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
              }
            },
          })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteOrder = (orderId) => {
    Alert.alert('Delete Order', 'Are you sure you want to delete this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/orders/${orderId}`);
            setOrders((prev) => prev.filter((o) => o._id !== orderId));
            Alert.alert('Deleted ✅', 'Order deleted successfully');
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete order');
          }
        },
      },
    ]);
  };

  const filteredOrders = filterStatus
    ? orders.filter((o) => o.status === filterStatus)
    : orders;

  const renderOrder = ({ item }) => (
    <View style={styles.card}>
      {/* Order Header */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderId}>#{item._id.toString().slice(-6).toUpperCase()}</Text>
          <Text style={styles.customerName}>👤 {item.user?.name || 'Unknown'}</Text>
          <Text style={styles.customerEmail}>{item.user?.email || ''}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '25' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {item.status}
          </Text>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.itemsContainer}>
        {item.items.map((orderItem, idx) => (
          <Text key={idx} style={styles.itemText} numberOfLines={1}>
            • {orderItem.name} x{orderItem.quantity} — ₱{(orderItem.price * orderItem.quantity).toFixed(2)}
          </Text>
        ))}
      </View>

      {/* Order Footer */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('en-PH', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </Text>
          <Text style={styles.total}>₱{item.total.toFixed(2)}</Text>
          <Text style={styles.payment}>{item.paymentMethod} · {item.paymentStatus}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
          >
            <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={() => handleUpdateStatus(item._id, item.status)}
          >
            <Ionicons name="refresh-outline" size={16} color={COLORS.accent} />
            <Text style={styles.updateBtnText}>Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteOrder(item._id)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        {ALL_STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statPill, filterStatus === s && { backgroundColor: STATUS_COLORS[s] }]}
            onPress={() => setFilterStatus(filterStatus === s ? '' : s)}
          >
            <Text style={[styles.statPillText, filterStatus === s && { color: '#fff' }]}>
              {s} ({orders.filter((o) => o.status === s).length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.countText}>
        {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
        {filterStatus ? ` — ${filterStatus}` : ' total'}
      </Text>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchOrders(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12 },
  statPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  statPillText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  countText: { color: COLORS.textMuted, fontSize: 12, paddingHorizontal: 14, marginBottom: 4 },
  list: { padding: 12 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderId: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  customerName: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  customerEmail: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  itemsContainer: { backgroundColor: COLORS.surfaceLight, borderRadius: 8, padding: 10, marginBottom: 10 },
  itemText: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 3 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  date: { color: COLORS.textMuted, fontSize: 11 },
  total: { color: COLORS.primary, fontSize: 18, fontWeight: '800', marginTop: 2 },
  payment: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  viewBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  updateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent },
  updateBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  deleteBtn: { backgroundColor: COLORS.surface, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.error },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
});