import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

export default function AdminUsers({ navigation }) {
  const { user, loading } = useSelector((s) => s.auth);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (loading) return;

    if (!user) {
      Alert.alert('Login Required', 'Please login to access admin panel.');
      navigation.navigate('Login');
      return;
    }

    if (user.role !== 'admin') {
      Alert.alert('Access Denied', 'You must be an admin to access this page.');
      navigation.navigate('ProductList');
      return;
    }

    loadUsers();
  }, [user, loading]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const { data } = await api.get('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setUsersLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('UserDetail', { userId: item._id })}
    >
      <View style={[styles.avatar, { backgroundColor: item.role === 'admin' ? COLORS.primary : COLORS.success }]}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.roleContainer}>
          <Text style={[styles.roleTag, { backgroundColor: item.role === 'admin' ? COLORS.error + '20' : COLORS.success + '20' }]}>
            {item.role === 'admin' ? '🔐 Admin' : '👤 User'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  if (usersLoading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Double-check admin status
  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <Ionicons name="close-circle" size={60} color={COLORS.error} />
        <Text style={styles.errorText}>Access Denied</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Users</Text>
          <Text style={styles.summaryValue}>{users.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Admins</Text>
          <Text style={styles.summaryValue}>{users.filter((u) => u.role === 'admin').length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Regular</Text>
          <Text style={styles.summaryValue}>{users.filter((u) => u.role === 'user').length}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.error, fontSize: 16, fontWeight: '600', marginTop: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    margin: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  list: { padding: 12 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.background, fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  userEmail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  roleContainer: { marginTop: 4 },
  roleTag: { color: COLORS.text, fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  summary: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  summaryValue: { color: COLORS.primary, fontSize: 18, fontWeight: '800', marginTop: 4 },
});
