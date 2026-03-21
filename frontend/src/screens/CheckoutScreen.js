import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart } from '../redux/slices/cartSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import * as SQLite from 'expo-sqlite';

const PAYMENT_METHODS = ['COD', 'GCash', 'Credit Card', 'PayPal'];

export default function CheckoutScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items, total } = useSelector((s) => s.cart);
  const { user } = useSelector((s) => s.auth);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [address, setAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    province: user?.address?.province || '',
    zip: user?.address?.zip || '',
  });

  const shippingFee = 99;
  const orderTotal = total + shippingFee;

  const handlePlaceOrder = async () => {
    if (!address.street || !address.city || !address.province || !address.zip) {
      return Alert.alert('Missing Address', 'Please fill in your complete shipping address.');
    }

    if (items.length === 0) {
      return Alert.alert('Empty Cart', 'Your cart is empty.');
    }

    setLoading(true);
    try {
      // Build order items — use _id or id as product reference
      const orderItems = items.map((item) => ({
        product: item._id || item.id,
        name: item.name,
        image: item.images?.[0]?.url || item.image || '',
        price: Number(item.price),
        quantity: Number(item.quantity),
      }));

      const payload = {
        items: orderItems,
        shippingAddress: address,
        paymentMethod,
        subtotal: Number(total.toFixed(2)),
        shippingFee: Number(shippingFee),
        total: Number(orderTotal.toFixed(2)),
      };

      console.log('Sending order:', JSON.stringify(payload));

      const { data } = await api.post('/orders', payload);

      // Clear cart from SQLite and Redux
      try {
        const db = SQLite.openDatabaseSync('shiftandclick.db');
        db.execSync('DELETE FROM cart;');
      } catch (e) {
        console.log('SQLite clear error:', e);
      }
      dispatch(clearCart());

      Alert.alert(
        'Order Placed! ✅',
        `Order #${data._id.toString().slice(-6).toUpperCase()} placed successfully!`,
        [{ text: 'View Order', onPress: () => navigation.replace('OrderDetail', { orderId: data._id }) }]
      );
    } catch (error) {
      console.log('Order error:', error.response?.data || error.message);
      Alert.alert(
        'Order Failed',
        error.response?.data?.message || error.message || 'Failed to place order. Check your connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary ({items.length} items)</Text>
        {items.map((item) => (
          <View key={item._id || item.id} style={styles.orderItem}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
            <Text style={styles.itemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Subtotal</Text>
          <Text style={styles.feeValue}>₱{total.toFixed(2)}</Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Shipping Fee</Text>
          <Text style={styles.feeValue}>₱{shippingFee.toFixed(2)}</Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₱{orderTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* Shipping Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        {[
          { key: 'street', label: 'Street Address', placeholder: '123 Main St' },
          { key: 'city', label: 'City', placeholder: 'Cagayan de Oro' },
          { key: 'province', label: 'Province', placeholder: 'Misamis Oriental' },
          { key: 'zip', label: 'ZIP Code', placeholder: '9000' },
        ].map((field) => (
          <View key={field.key}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              style={styles.input}
              placeholder={field.placeholder}
              placeholderTextColor={COLORS.textMuted}
              value={address[field.key]}
              onChangeText={(val) => setAddress((prev) => ({ ...prev, [field.key]: val }))}
            />
          </View>
        ))}
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method}
              style={[styles.paymentBtn, paymentMethod === method && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod(method)}
            >
              <Text style={[styles.paymentText, paymentMethod === method && styles.paymentTextActive]}>
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Place Order */}
      <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
            <Text style={styles.placeOrderText}>Place Order — ₱{orderTotal.toFixed(2)}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  section: { margin: 12, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  itemName: { flex: 1, color: COLORS.textSecondary, fontSize: 13 },
  itemQty: { color: COLORS.textMuted, fontSize: 13, marginHorizontal: 8 },
  itemPrice: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  feeLabel: { color: COLORS.textMuted, fontSize: 13 },
  feeValue: { color: COLORS.textSecondary, fontSize: 13 },
  totalLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: COLORS.primary, fontSize: 15, fontWeight: '800' },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceLight, color: COLORS.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  paymentBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  paymentText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  paymentTextActive: { color: COLORS.background },
  placeOrderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 12, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16 },
  placeOrderText: { color: COLORS.background, fontWeight: '800', fontSize: 16 },
});