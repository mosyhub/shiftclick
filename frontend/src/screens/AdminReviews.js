import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Image,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Highest', value: 'highest' },
  { label: 'Lowest', value: 'lowest' },
];

function StarRow({ rating, size = 13 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= rating ? 'star' : 'star-outline'} size={size} color={s <= rating ? '#FFB800' : COLORS.textMuted} />
      ))}
    </View>
  );
}

export default function AdminReviews({ navigation }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState(0);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => { fetchReviews(); }, [filterRating, sortBy]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy };
      if (filterRating > 0) params.rating = filterRating;
      const { data } = await api.get('/reviews', { params });
      setReviews(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (reviewId) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/reviews/${reviewId}`);
            setReviews((prev) => prev.filter((r) => r._id !== reviewId));
            Alert.alert('Deleted ✅', 'Review removed successfully.');
          } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete review.');
          }
        },
      },
    ]);
  };

  const renderReview = ({ item }) => {
    const avatarUrl = item.user?.avatar?.url;
    return (
      <View style={styles.card}>
        {/* User + Product */}
        <View style={styles.cardHeader}>
          <View style={styles.userRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.user?.name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.user?.name || 'Unknown'}</Text>
              <Text style={styles.userEmail}>{item.user?.email || ''}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product */}
        <View style={styles.productRow}>
          <Ionicons name="cube-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.productName} numberOfLines={1}>{item.product?.name || 'Unknown Product'}</Text>
        </View>

        {/* Rating + Date */}
        <View style={styles.ratingRow}>
          <StarRow rating={item.rating} />
          <Text style={styles.ratingNum}>{item.rating}/5</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        {/* Title + Comment */}
        {item.title ? <Text style={styles.reviewTitle}>{item.title}</Text> : null}
        <Text style={styles.reviewComment}>{item.comment}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Star Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by stars:</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterRating === 0 && styles.filterPillActive]}
            onPress={() => setFilterRating(0)}
          >
            <Text style={[styles.filterPillText, filterRating === 0 && styles.filterPillTextActive]}>All</Text>
          </TouchableOpacity>
          {[5, 4, 3, 2, 1].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterPill, filterRating === s && styles.filterPillActive]}
              onPress={() => setFilterRating(filterRating === s ? 0 : s)}
            >
              <Ionicons name="star" size={11} color={filterRating === s ? '#fff' : '#FFB800'} />
              <Text style={[styles.filterPillText, filterRating === s && styles.filterPillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sort */}
        <Text style={[styles.filterLabel, { marginTop: 8 }]}>Sort by:</Text>
        <View style={styles.filterRow}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortPill, sortBy === opt.value && styles.sortPillActive]}
              onPress={() => setSortBy(opt.value)}
            >
              <Text style={[styles.sortPillText, sortBy === opt.value && styles.sortPillTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.countText}>
        {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        {filterRating > 0 ? ` — ${filterRating} star` : ''}
      </Text>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReview}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchReviews(); }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={60} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No reviews found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterSection: { backgroundColor: COLORS.surface, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  filterPillActive: { backgroundColor: '#FFB800', borderColor: '#FFB800' },
  filterPillText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },
  sortPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  sortPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortPillText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  sortPillTextActive: { color: '#fff' },
  countText: { color: COLORS.textMuted, fontSize: 12, paddingHorizontal: 14, paddingVertical: 8 },
  list: { padding: 12 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  userName: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  userEmail: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 8, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.error },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  productName: { color: COLORS.textSecondary, fontSize: 12, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ratingNum: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  date: { color: COLORS.textMuted, fontSize: 11, marginLeft: 'auto' },
  reviewTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  reviewComment: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
});