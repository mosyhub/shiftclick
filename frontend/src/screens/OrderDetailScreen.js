import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity, TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrderById, updateOrderStatusThunk } from '../redux/slices/orderSlice';
import { createReview, updateReviewThunk } from '../redux/slices/reviewSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

const STATUS_COLORS = {
  Pending: '#FFB800', Processing: '#7B61FF',
  Shipped: '#3B82F6', Delivered: '#00FF88', Cancelled: '#FF3C3C',
};
const STATUS_ICONS = {
  Pending: 'time-outline', Processing: 'construct-outline',
  Shipped: 'bicycle-outline', Delivered: 'checkmark-circle-outline', Cancelled: 'close-circle-outline',
};

function StarRow({ rating, onPress, size = 28 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onPress && onPress(s)} disabled={!onPress}>
          <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={size} color={s <= rating ? '#FFB800' : COLORS.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  // ✅ Redux — order from store
  const { selectedOrder: order, loading } = useSelector((s) => s.orders);

  const [reviewStatuses, setReviewStatuses] = useState({});
  const [activeReviewProductId, setActiveReviewProductId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // ✅ Redux dispatch instead of direct api.get()
    dispatch(fetchOrderById(orderId));
  }, [orderId]);

  useEffect(() => {
    if (order?.status === 'Delivered' && user?.role !== 'admin') {
      checkReviewStatuses(order.items);
    }
  }, [order]);

  const checkReviewStatuses = async (items) => {
    const statuses = {};
    await Promise.all(items.map(async (item) => {
      const productId = item.product?._id || item.product;
      if (!productId) return;
      try {
        const { data } = await api.get(`/reviews/my/${productId}`);
        statuses[productId] = { reviewed: !!data, reviewData: data || null };
      } catch {
        statuses[productId] = { reviewed: false, reviewData: null };
      }
    }));
    setReviewStatuses(statuses);
  };

  const openReviewForm = (item) => {
    const productId = item.product?._id || item.product;
    const existing = reviewStatuses[productId]?.reviewData;
    setActiveReviewProductId(productId);
    setReviewRating(existing?.rating || 5);
    setReviewTitle(existing?.title || '');
    setReviewComment(existing?.comment || '');
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) return Alert.alert('Missing', 'Please write a comment.');
    const productId = activeReviewProductId;
    const existing = reviewStatuses[productId]?.reviewData;
    try {
      setSubmittingReview(true);
      if (existing) {
        // ✅ Redux dispatch for update review
        await dispatch(updateReviewThunk({
          id: existing._id,
          reviewData: { rating: reviewRating, title: reviewTitle, comment: reviewComment },
        })).unwrap();
        Alert.alert('Updated ✅', 'Your review has been updated.');
      } else {
        // ✅ Redux dispatch for create review
        await dispatch(createReview({
          productId, orderId,
          rating: reviewRating, title: reviewTitle, comment: reviewComment,
        })).unwrap();
        Alert.alert('Submitted ✅', 'Your review has been posted!');
      }
      setActiveReviewProductId(null);
      checkReviewStatuses(order.items);
    } catch (error) {
      Alert.alert('Error', error || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpdateStatus = (newStatus) => {
    Alert.alert('Update Status', `Change order status to "${newStatus}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update', onPress: async () => {
          try {
            setUpdating(true);
            // ✅ Redux dispatch for update status
            await dispatch(updateOrderStatusThunk({
              id: orderId,
              status: newStatus,
              note: `Status updated to ${newStatus} by admin`,
            })).unwrap();
            Alert.alert('Updated ✅', `Order is now ${newStatus}`);
          } catch (error) {
            Alert.alert('Error', error || 'Failed to update status');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const handleMarkReceived = () => {
    Alert.alert('Confirm Receipt', 'Have you received your order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Received', onPress: async () => {
          try {
            setUpdating(true);
            // ✅ Redux dispatch
            await dispatch(updateOrderStatusThunk({
              id: orderId,
              status: 'Delivered',
              note: 'Order confirmed received by customer',
            })).unwrap();
            Alert.alert('Thank you! 🎉', 'Your order has been marked as received.');
          } catch (error) {
            Alert.alert('Error', error || 'Failed to update');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  if (loading || !order) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const isDelivered = order.status === 'Delivered';
  const isCustomer = user?.role !== 'admin';

  return (
    <ScrollView style={styles.container}>
      {/* Order Header */}
      <View style={styles.section}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{order._id.toString().slice(-6).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] + '25' }]}>
            <Ionicons name={STATUS_ICONS[order.status]} size={14} color={STATUS_COLORS[order.status]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}>{order.status}</Text>
          </View>
        </View>
      </View>

      {/* Admin status update */}
      {user?.role === 'admin' && !['Delivered', 'Cancelled'].includes(order.status) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          {updating ? <ActivityIndicator color={COLORS.primary} /> : (
            <View style={styles.statusRow}>
              {['Processing', 'Shipped'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, order.status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }]}
                  onPress={() => s !== order.status && handleUpdateStatus(s)}
                  disabled={order.status === s}
                >
                  <Text style={[styles.statusBtnText, order.status === s && { color: COLORS.background }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Customer: Mark as Received */}
      {isCustomer && order.status === 'Shipped' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confirm Receipt</Text>
          <Text style={styles.receiptHint}>
            {order.paymentMethod === 'COD'
              ? 'Once confirmed, your order will be marked as Delivered and payment as Paid.'
              : 'Tap below to confirm you have received your order.'}
          </Text>
          {updating
            ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
            : (
              <TouchableOpacity style={styles.receivedBtn} onPress={handleMarkReceived}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.receivedBtnText}>Mark as Received</Text>
              </TouchableOpacity>
            )}
        </View>
      )}

      {/* Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items Ordered</Text>
        {order.items.map((item, idx) => {
          const productId = item.product?._id || item.product;
          const status = reviewStatuses[productId];
          const isReviewed = status?.reviewed;
          const isActiveForm = activeReviewProductId === productId;

          return (
            <View key={idx}>
              <View style={styles.item}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={styles.itemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
                  {isCustomer && isDelivered && (
                    <TouchableOpacity
                      style={[styles.reviewItemBtn, isReviewed && styles.reviewItemBtnDone]}
                      onPress={() => isActiveForm ? setActiveReviewProductId(null) : openReviewForm(item)}
                    >
                      <Ionicons name={isReviewed ? 'star' : 'star-outline'} size={13} color={isReviewed ? '#FFB800' : COLORS.primary} />
                      <Text style={[styles.reviewItemBtnText, isReviewed && { color: '#FFB800' }]}>
                        {isActiveForm ? 'Cancel' : isReviewed ? 'Reviewed' : 'Review'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {isActiveForm && (
                <View style={styles.reviewForm}>
                  <Text style={styles.reviewFormTitle}>{status?.reviewed ? 'Edit Your Review' : 'Write a Review'}</Text>
                  <Text style={styles.formLabel}>Rating</Text>
                  <StarRow rating={reviewRating} onPress={setReviewRating} size={30} />
                  <Text style={[styles.formLabel, { marginTop: 12 }]}>Title (optional)</Text>
                  <TextInput style={styles.input} placeholder="Summarize your experience" placeholderTextColor={COLORS.textMuted} value={reviewTitle} onChangeText={setReviewTitle} maxLength={80} />
                  <Text style={styles.formLabel}>Comment</Text>
                  <TextInput style={[styles.input, styles.commentInput]} placeholder="Share your experience..." placeholderTextColor={COLORS.textMuted} value={reviewComment} onChangeText={setReviewComment} multiline maxLength={500} />
                  <Text style={styles.charCount}>{reviewComment.length}/500</Text>
                  <TouchableOpacity style={styles.submitReviewBtn} onPress={handleSubmitReview} disabled={submittingReview}>
                    {submittingReview ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.submitReviewBtnText}>{status?.reviewed ? 'Update Review' : 'Submit Review'}</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
        {isCustomer && isDelivered && (
          <Text style={styles.reviewPrompt}>⭐ Tap "Review" next to each item to share your experience!</Text>
        )}
      </View>

      {/* Shipping Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        <Text style={styles.addressText}>{order.shippingAddress.street}</Text>
        <Text style={styles.addressText}>{order.shippingAddress.city}, {order.shippingAddress.province}</Text>
        <Text style={styles.addressText}>{order.shippingAddress.zip}</Text>
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.row}><Text style={styles.label}>Method</Text><Text style={styles.value}>{order.paymentMethod}</Text></View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.value, { color: order.paymentStatus === 'Paid' ? COLORS.success : COLORS.warning }]}>{order.paymentStatus}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>₱{order.subtotal.toFixed(2)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Shipping</Text><Text style={styles.value}>₱{order.shippingFee.toFixed(2)}</Text></View>
        <View style={styles.row}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>₱{order.total.toFixed(2)}</Text></View>
      </View>

      {/* Status History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status History</Text>
        {order.statusHistory.map((h, idx) => (
          <View key={idx} style={styles.historyItem}>
            <View style={[styles.historyDot, { backgroundColor: STATUS_COLORS[h.status] || COLORS.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyStatus}>{h.status}</Text>
              {h.note && <Text style={styles.historyNote}>{h.note}</Text>}
              <Text style={styles.historyDate}>{new Date(h.updatedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  section: { margin: 12, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  orderDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceLight },
  statusBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  receiptHint: { color: COLORS.textMuted, fontSize: 12, marginBottom: 12, lineHeight: 18 },
  receivedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: STATUS_COLORS.Delivered, paddingVertical: 12, borderRadius: 10 },
  receivedBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemInfo: { flex: 1 },
  itemName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  itemQty: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  itemRight: { alignItems: 'flex-end', gap: 6 },
  itemPrice: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  reviewItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary },
  reviewItemBtnDone: { borderColor: '#FFB800' },
  reviewItemBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  reviewPrompt: { color: COLORS.textMuted, fontSize: 12, marginTop: 12, textAlign: 'center' },
  reviewForm: { backgroundColor: COLORS.surfaceLight, borderRadius: 12, padding: 14, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  reviewFormTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  formLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  commentInput: { height: 90, textAlignVertical: 'top' },
  charCount: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginBottom: 12 },
  submitReviewBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  submitReviewBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 14 },
  addressText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: COLORS.textMuted, fontSize: 13 },
  value: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: COLORS.primary, fontSize: 15, fontWeight: '800' },
  historyItem: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  historyDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  historyStatus: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  historyNote: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  historyDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
});