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
  const [deactivatingId, setDeactivatingId] = useState(null);

  useEffect(() => {
    if (loading) return;
    // No redirects needed — DrawerNavigator + AdminStack already restrict access
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

  const toggleUserStatus = async (userId, userName, isActive) => {
    const action = isActive ? 'deactivate' : 'activate';
    const title = isActive ? 'Deactivate User' : 'Activate User';
    const message = isActive 
      ? `Are you sure you want to deactivate ${userName}'s account? They won't be able to login.`
      : `Are you sure you want to activate ${userName}'s account?`;

    Alert.alert(title, message, [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      {
        text: action === 'deactivate' ? 'Deactivate' : 'Activate',
        onPress: async () => {
          try {
            setDeactivatingId(userId);
            const { data } = await api.put(`/users/${userId}/toggle-status`);
            
            // Update the users list
            setUsers(users.map(u => u._id === userId ? { ...u, isActive: data.isActive } : u));
            
            Alert.alert('Success', data.message);
          } catch (error) {
            console.error('Error toggling user status:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update user status');
          } finally {
            setDeactivatingId(null);
          }
        },
        style: isActive ? 'destructive' : 'default',
      },
    ]);
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const renderUserItem = ({ item }) => (
    <View style={styles.userCardContainer}>
      <View style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: item.role === 'admin' ? COLORS.primary : COLORS.success }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.roleContainer}>
            <Text style={[styles.roleTag, { backgroundColor: item.role === 'admin' ? COLORS.error + '20' : COLORS.success + '20' }]}>
              {item.role === 'admin' ? '🔐 Admin' : '👤 User'}
            </Text>
            {!item.isActive && (
              <Text style={[styles.roleTag, { backgroundColor: COLORS.error + '20', marginLeft: 6 }]}>
                Inactive
              </Text>
            )}
          </View>
        </View>
      </View>
      
      {/* Deactivate/Activate Button */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: item.isActive ? COLORS.error + '20' : COLORS.success + '20' }]}
        onPress={() => toggleUserStatus(item._id, item.name, item.isActive)}
        disabled={deactivatingId === item._id}
      >
        {deactivatingId === item._id ? (
          <ActivityIndicator size="small" color={item.isActive ? COLORS.error : COLORS.success} />
        ) : (
          <Ionicons 
            name={item.isActive ? 'power-outline' : 'checkmark-circle-outline'} 
            size={20} 
            color={item.isActive ? COLORS.error : COLORS.success} 
          />
        )}
      </TouchableOpacity>
    </View>
  );

  if (usersLoading && !refreshing) {
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

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Users</Text>
          <Text style={styles.summaryValue}>{users.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Active</Text>
          <Text style={styles.summaryValue}>{users.filter((u) => u.isActive).length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Inactive</Text>
          <Text style={styles.summaryValue}>{users.filter((u) => !u.isActive).length}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.error, fontSize: 16, fontWeight: '600', marginTop: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, margin: 12, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  searchInput: { flex: 1, color: COLORS.text, paddingVertical: 10, fontSize: 14 },
  list: { padding: 12 },
  userCardContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  userCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.background, fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  userEmail: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  roleContainer: { marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  roleTag: { color: COLORS.text, fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  actionBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 80 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  summary: { flexDirection: 'row', backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 16, paddingHorizontal: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  summaryValue: { color: COLORS.primary, fontSize: 18, fontWeight: '800', marginTop: 4 },
});