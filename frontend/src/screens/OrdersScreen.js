import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyOrders } from '../redux/slices/orderSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';

const STATUS_COLORS = {
  Pending: '#FFB800',
  Processing: '#7B61FF',
  Shipped: '#3B82F6',
  Delivered: '#00FF88',
  Cancelled: '#FF3C3C',
};

export default function OrdersScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  // ✅ Redux — orders from store instead of local useState
  const { items: orders, loading } = useSelector((s) => s.orders);

  useEffect(() => {
    if (!user) { navigation.navigate('Login'); return; }
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 14 }} onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={26} color={COLORS.text} />
        </TouchableOpacity>
      ),
    });
    // ✅ Redux dispatch instead of direct api.get()
    dispatch(fetchMyOrders());
  }, [user]);

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item._id.toString().slice(-6).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '25' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.itemCount}>{item.items.length} item{item.items.length > 1 ? 's' : ''}</Text>
        <Text style={styles.total}>₱{item.total.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        // ✅ Redux dispatch on refresh
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => dispatch(fetchMyOrders())}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No orders yet</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.shopBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  list: { padding: 12 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  date: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCount: { color: COLORS.textSecondary, fontSize: 13 },
  total: { color: COLORS.primary, fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', marginTop: 80, gap: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  shopBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  shopBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
});