import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Image, FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import {
  fetchProductReviews,
  fetchMyReviews,
  createReview,
  updateReviewThunk,
  checkCanReview,
} from '../redux/slices/reviewSlice';
import api from '../api/api';

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Highest', value: 'highest' },
  { label: 'Lowest', value: 'lowest' },
];

function StarRow({ rating, onPress, size = 28, color = '#FFB800' }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onPress && onPress(s)} disabled={!onPress}>
          <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={size} color={s <= rating ? color : COLORS.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function RatingSummary({ summary }) {
  return (
    <View style={styles.summaryBox}>
      <View style={styles.summaryLeft}>
        <Text style={styles.avgNumber}>{summary.average}</Text>
        <StarRow rating={Math.round(summary.average)} size={18} />
        <Text style={styles.totalReviews}>{summary.total} review{summary.total !== 1 ? 's' : ''}</Text>
      </View>
      <View style={styles.summaryBars}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary[star] || 0;
          const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
          return (
            <View key={star} style={styles.barRow}>
              <Text style={styles.barLabel}>{star}</Text>
              <Ionicons name="star" size={11} color="#FFB800" />
              <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ReviewCard({ review, isOwn, onEdit, displayOnly }) {
  const avatarUrl = review.user?.avatar?.url;
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.reviewAvatar} />
          ) : (
            <View style={styles.reviewAvatarPlaceholder}>
              <Text style={styles.reviewAvatarText}>{review.user?.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View>
            <Text style={styles.reviewerName}>{review.user?.name || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          </View>
        </View>
        <View style={styles.reviewHeaderRight}>
          <StarRow rating={review.rating} size={14} />
          {isOwn && !displayOnly && (
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(review)}>
              <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {review.title ? <Text style={styles.reviewTitle}>{review.title}</Text> : null}
      <Text style={styles.reviewComment}>{review.comment}</Text>
      {isOwn && !displayOnly && (
        <View style={styles.ownBadge}>
          <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
          <Text style={styles.ownBadgeText}>Your review</Text>
        </View>
      )}
    </View>
  );
}

export default function ReviewScreen({ productId, displayOnly = false }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  // ✅ Redux state
  const { items: reviews, myReviews, summary, canReviewStatus, loading } = useSelector((s) => s.reviews);

  const [filterRating, setFilterRating] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // My Reviews mode edit state
  const [editingMyReview, setEditingMyReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [mySubmitting, setMySubmitting] = useState(false);

  const isMyReviewsMode = !productId;
  const myUserId = user?._id || user?.id;

  useEffect(() => {
    if (isMyReviewsMode) {
      // ✅ Redux dispatch
      dispatch(fetchMyReviews());
    }
  }, []);

  useEffect(() => {
    if (!isMyReviewsMode) {
      // ✅ Redux dispatch
      dispatch(fetchProductReviews({ productId, rating: filterRating || undefined, sort: sortBy }));
      if (user && !displayOnly) dispatch(checkCanReview(productId));
    }
  }, [productId, filterRating, sortBy]);

  const openEditForm = (review) => {
    setEditingReview(review);
    setRating(review.rating);
    setTitle(review.title || '');
    setComment(review.comment);
    setShowForm(true);
  };

  const openNewForm = () => {
    setEditingReview(null);
    setRating(5); setTitle(''); setComment('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!comment.trim()) return Alert.alert('Missing', 'Please write a comment.');
    try {
      setSubmitting(true);
      if (editingReview) {
        // ✅ Redux dispatch
        await dispatch(updateReviewThunk({ id: editingReview._id, reviewData: { rating, title, comment } })).unwrap();
        Alert.alert('Updated ✅', 'Your review has been updated.');
      } else {
        // ✅ Redux dispatch
        await dispatch(createReview({ productId, orderId: canReviewStatus?.orderId, rating, title, comment })).unwrap();
        Alert.alert('Submitted ✅', 'Your review has been posted!');
      }
      setShowForm(false);
      dispatch(fetchProductReviews({ productId, rating: filterRating || undefined, sort: sortBy }));
      dispatch(checkCanReview(productId));
    } catch (error) {
      Alert.alert('Error', error || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMyReviewUpdate = async () => {
    if (!editComment.trim()) return Alert.alert('Missing', 'Please write a comment.');
    try {
      setMySubmitting(true);
      // ✅ Redux dispatch
      await dispatch(updateReviewThunk({ id: editingMyReview._id, reviewData: { rating: editRating, title: editTitle, comment: editComment } })).unwrap();
      Alert.alert('Updated ✅', 'Your review has been updated.');
      setEditingMyReview(null);
      dispatch(fetchMyReviews());
    } catch (error) {
      Alert.alert('Error', error || 'Failed to update review.');
    } finally {
      setMySubmitting(false);
    }
  };

  const canReview = canReviewStatus?.canReview;
  const alreadyReviewed = canReviewStatus?.alreadyReviewed;

  // ── MY REVIEWS MODE ──
  if (isMyReviewsMode) {
    if (editingMyReview) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.sectionTitle}>Edit Review</Text>
          <Text style={styles.editProductName}>{editingMyReview.product?.name}</Text>
          <Text style={styles.formLabel}>Your Rating</Text>
          <StarRow rating={editRating} onPress={setEditRating} size={32} />
          <Text style={[styles.formLabel, { marginTop: 16 }]}>Title (optional)</Text>
          <TextInput style={styles.input} placeholder="Summarize your experience" placeholderTextColor={COLORS.textMuted} value={editTitle} onChangeText={setEditTitle} maxLength={80} />
          <Text style={styles.formLabel}>Comment</Text>
          <TextInput style={[styles.input, styles.commentInput]} placeholder="Share your experience..." placeholderTextColor={COLORS.textMuted} value={editComment} onChangeText={setEditComment} multiline maxLength={500} />
          <Text style={styles.charCount}>{editComment.length}/500</Text>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingMyReview(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleMyReviewUpdate} disabled={mySubmitting}>
              {mySubmitting ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.submitBtnText}>Update</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
      <FlatList
        style={styles.container}
        data={myReviews}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={<Text style={styles.countText}>{myReviews.length} review{myReviews.length !== 1 ? 's' : ''}</Text>}
        renderItem={({ item }) => {
          const productImage = item.product?.images?.[0]?.url;
          return (
            <View style={styles.reviewCard}>
              <View style={styles.reviewerInfo}>
                {productImage ? (
                  <Image source={{ uri: productImage }} style={styles.productThumb} />
                ) : (
                  <View style={[styles.productThumb, { backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="cube-outline" size={18} color={COLORS.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewerName} numberOfLines={1}>{item.product?.name || 'Unknown Product'}</Text>
                  <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingMyReview(item); setEditRating(item.rating); setEditTitle(item.title || ''); setEditComment(item.comment); }}>
                  <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <StarRow rating={item.rating} size={14} />
              {item.title ? <Text style={[styles.reviewTitle, { marginTop: 6 }]}>{item.title}</Text> : null}
              <Text style={[styles.reviewComment, { marginTop: 4 }]}>{item.comment}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyReviews}>
            <Ionicons name="star-outline" size={60} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>You haven't reviewed anything yet.</Text>
            <Text style={styles.emptySubText}>Reviews appear here after you receive an order.</Text>
          </View>
        }
      />
    );
  }

  // ── PRODUCT REVIEWS MODE ──
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
      {summary && summary.total > 0 && <RatingSummary summary={summary} />}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
        <TouchableOpacity style={[styles.filterPill, filterRating === 0 && styles.filterPillActive]} onPress={() => setFilterRating(0)}>
          <Text style={[styles.filterPillText, filterRating === 0 && styles.filterPillTextActive]}>All</Text>
        </TouchableOpacity>
        {[5, 4, 3, 2, 1].map((s) => (
          <TouchableOpacity key={s} style={[styles.filterPill, filterRating === s && styles.filterPillActive]} onPress={() => setFilterRating(filterRating === s ? 0 : s)}>
            <Ionicons name="star" size={12} color={filterRating === s ? '#fff' : '#FFB800'} />
            <Text style={[styles.filterPillText, filterRating === s && styles.filterPillTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.value} style={[styles.sortPill, sortBy === opt.value && styles.sortPillActive]} onPress={() => setSortBy(opt.value)}>
            <Text style={[styles.sortPillText, sortBy === opt.value && styles.sortPillTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!displayOnly && user && canReview && !showForm && (
        <TouchableOpacity style={styles.writeBtn} onPress={openNewForm}>
          <Ionicons name="create-outline" size={18} color={COLORS.background} />
          <Text style={styles.writeBtnText}>Write a Review</Text>
        </TouchableOpacity>
      )}
      {!displayOnly && user && alreadyReviewed && !showForm && (
        <TouchableOpacity style={[styles.writeBtn, { backgroundColor: COLORS.accent }]} onPress={() => openEditForm(reviews.find(r => (r.user?._id || r.user) === myUserId))}>
          <Ionicons name="pencil-outline" size={18} color={COLORS.background} />
          <Text style={styles.writeBtnText}>Edit Your Review</Text>
        </TouchableOpacity>
      )}

      {!displayOnly && showForm && (
        <View style={styles.formBox}>
          <Text style={styles.formTitle}>{editingReview ? 'Edit Your Review' : 'Write a Review'}</Text>
          <Text style={styles.formLabel}>Your Rating</Text>
          <StarRow rating={rating} onPress={setRating} size={32} />
          <Text style={[styles.formLabel, { marginTop: 14 }]}>Title (optional)</Text>
          <TextInput style={styles.input} placeholder="Summarize your experience" placeholderTextColor={COLORS.textMuted} value={title} onChangeText={setTitle} maxLength={80} />
          <Text style={styles.formLabel}>Comment</Text>
          <TextInput style={[styles.input, styles.commentInput]} placeholder="Share your experience..." placeholderTextColor={COLORS.textMuted} value={comment} onChangeText={setComment} multiline maxLength={500} />
          <Text style={styles.charCount}>{comment.length}/500</Text>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.submitBtnText}>{editingReview ? 'Update' : 'Submit'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.emptyReviews}>
          <Ionicons name="chatbubble-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>{filterRating > 0 ? `No ${filterRating}-star reviews yet` : 'No reviews yet.'}</Text>
        </View>
      ) : (
        reviews.map((review) => (
          <ReviewCard key={review._id} review={review} isOwn={myUserId && review.user?._id?.toString() === myUserId.toString()} onEdit={openEditForm} displayOnly={displayOnly} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  countText: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  editProductName: { color: COLORS.textMuted, fontSize: 13, marginBottom: 20 },
  summaryBox: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, gap: 16 },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', minWidth: 80 },
  avgNumber: { color: COLORS.text, fontSize: 40, fontWeight: '800' },
  totalReviews: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  summaryBars: { flex: 1, gap: 5, justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barLabel: { color: COLORS.textMuted, fontSize: 11, width: 8 },
  barTrack: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#FFB800', borderRadius: 3 },
  barCount: { color: COLORS.textMuted, fontSize: 11, width: 16, textAlign: 'right' },
  filterRow: { marginBottom: 10 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterPillActive: { backgroundColor: '#FFB800', borderColor: '#FFB800' },
  filterPillText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },
  sortPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  sortPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortPillText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  sortPillTextActive: { color: '#fff' },
  writeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, marginBottom: 14 },
  writeBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 14 },
  formBox: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  formTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  formLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: COLORS.surfaceLight, color: COLORS.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  commentInput: { height: 100, textAlignVertical: 'top' },
  charCount: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginBottom: 14 },
  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitBtnText: { color: COLORS.background, fontWeight: '700' },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { color: COLORS.background, fontWeight: '700', fontSize: 14 },
  productThumb: { width: 44, height: 44, borderRadius: 8 },
  reviewerName: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  reviewDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  reviewHeaderRight: { alignItems: 'flex-end', gap: 6 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary },
  editBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  reviewTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  reviewComment: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  ownBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  ownBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  emptyReviews: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  emptySubText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});