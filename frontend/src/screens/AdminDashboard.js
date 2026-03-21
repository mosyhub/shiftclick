import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { triggerLocalPromo } from '../utils/notifications';

export default function AdminDashboard({ navigation }) {
  const { user, loading } = useSelector((s) => s.auth);
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, reviews: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    // No redirects needed — DrawerNavigator already restricts access to admin only
    loadDashboardStats();
  }, [user, loading]);

  const loadDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (error) {
      console.log('Stats error:', error.response?.data || error.message);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading || statsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Ionicons name="close-circle" size={60} color={COLORS.error} />
        <Text style={styles.errorText}>Access Denied</Text>
      </View>
    );
  }

  const StatCard = ({ icon, label, value, color, onPress }) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.adminName}>{user?.name} 👨‍💼</Text>
        </View>
        <Ionicons name="shield-checkmark" size={40} color={COLORS.primary} />
      </View>

      <View style={styles.statsContainer}>
        <StatCard icon="people" label="Total Users" value={stats.users} color="#3B82F6" onPress={() => navigation.navigate('AdminUsers')} />
        <StatCard icon="cube" label="Products" value={stats.products} color="#10B981" onPress={() => navigation.navigate('AdminProducts')} />
        <StatCard icon="receipt" label="Orders" value={stats.orders} color="#F59E0B" onPress={() => navigation.navigate('AdminOrders')} />
        <StatCard icon="star" label="Reviews" value={stats.reviews} color="#8B5CF6" onPress={() => navigation.navigate('AdminReviews')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('ProductForm', { product: null })}>
            <Ionicons name="add-circle" size={32} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminProducts')}>
            <Ionicons name="list" size={32} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Manage Products</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminOrders')}>
            <Ionicons name="receipt" size={32} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Manage Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminUsers')}>
            <Ionicons name="people" size={32} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Manage Users</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color={COLORS.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Admin Panel</Text>
          <Text style={styles.infoText}>Manage products, users, orders and reviews.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.error, fontSize: 16, fontWeight: '600', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 20 },
  greeting: { color: COLORS.textMuted, fontSize: 14 },
  adminName: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  statsContainer: { gap: 12, marginBottom: 24 },
  statCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, borderLeftWidth: 4, gap: 12 },
  iconContainer: { padding: 12, borderRadius: 10 },
  statInfo: { flex: 1 },
  statLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  statValue: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flex: 1, minWidth: '48%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border },
  actionLabel: { color: COLORS.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  infoBox: { flexDirection: 'row', backgroundColor: COLORS.primary + '15', borderRadius: 12, padding: 16, alignItems: 'center', gap: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  infoTitle: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  infoText: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
});