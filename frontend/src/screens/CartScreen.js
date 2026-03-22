import React, { useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { removeFromCart, updateQuantity, clearCart, setCart } from '../redux/slices/cartSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'shiftandclick.db';

let _db = null;
const getDB = () => {
  try {
    if (!_db) _db = SQLite.openDatabaseSync(DB_NAME);

    // Create table if it doesn't exist yet
    _db.execSync(`
      CREATE TABLE IF NOT EXISTS cart (
        id TEXT,
        user_id TEXT DEFAULT '',
        name TEXT,
        price REAL,
        image TEXT,
        quantity INTEGER,
        brand TEXT,
        category TEXT,
        PRIMARY KEY (id, user_id)
      );
    `);

    // Migration: add user_id column if it doesn't exist (for existing installs)
    try {
      _db.execSync(`ALTER TABLE cart ADD COLUMN user_id TEXT DEFAULT '';`);
      console.log('Migration: added user_id column');
    } catch (e) {
      // Column already exists — this is expected, ignore the error
    }

    return _db;
  } catch (e) {
    console.log('getDB error:', e);
    _db = null;
    return null;
  }
};

const mapRow = (r) => ({
  _id: r.id, id: r.id, name: r.name, price: r.price,
  quantity: r.quantity, brand: r.brand || '', category: r.category || '',
  image: r.image || '', images: r.image ? [{ url: r.image }] : [],
});

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items, total } = useSelector((s) => s.cart);
  const { user } = useSelector((s) => s.auth);
  const prevUserRef = useRef(undefined);

  // Load this user's cart on mount (if already logged in)
  useEffect(() => {
    if (!user) return;
    try {
      const db = getDB();
      if (!db) return;
      const rows = db.getAllSync('SELECT * FROM cart WHERE user_id = ?;', [user._id]);
      console.log('CartScreen mount - rows:', rows.length);
      if (rows.length > 0) dispatch(setCart(rows.map(mapRow)));
    } catch (e) {
      console.log('CartScreen mount error:', e);
    }
  }, []);

  // Watch user changes — load on login, clear Redux on logout
  useEffect(() => {
    if (prevUserRef.current === undefined) {
      prevUserRef.current = user;
      return;
    }
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (user && !prevUser) {
      // Logged in — load this user's cart from SQLite
      try {
        const db = getDB();
        if (!db) return;
        const rows = db.getAllSync('SELECT * FROM cart WHERE user_id = ?;', [user._id]);
        console.log('User logged in - loading cart:', rows.length);
        if (rows.length > 0) dispatch(setCart(rows.map(mapRow)));
      } catch (e) {
        console.log('Load cart on login error:', e);
      }
    }
    // On logout: just clear Redux — SQLite keeps the cart for next login
    // Each user only sees their own rows because of the user_id filter
  }, [user]);

  // Sync Redux → SQLite (only while logged in, keyed by user._id)
  useEffect(() => {
    if (!user) return; // never overwrite SQLite when logged out
    try {
      const db = getDB();
      if (!db) return;
      db.execSync('DELETE FROM cart WHERE user_id = ?;', [user._id]);
      items.forEach((item) => {
        db.runSync(
          'INSERT OR REPLACE INTO cart (id, user_id, name, price, image, quantity, brand, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
          [
            item._id || item.id,
            user._id,
            item.name,
            item.price,
            item.images?.[0]?.url || item.image || '',
            item.quantity,
            item.brand || '',
            item.category || '',
          ]
        );
      });
      console.log('Cart synced to SQLite:', items.length, 'items for user:', user._id);
    } catch (error) {
      console.log('SQLite sync error:', error);
    }
  }, [items]);

  const handleCheckout = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to checkout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    navigation.navigate('Orders', { screen: 'Checkout' });
  };

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      {item.images?.[0]?.url || item.image ? (
        <Image source={{ uri: item.images?.[0]?.url || item.image }} style={styles.itemImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={28} color={COLORS.textMuted} />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => {
              if (item.quantity <= 1) dispatch(removeFromCart(item._id || item.id));
              else dispatch(updateQuantity({ id: item._id || item.id, quantity: item.quantity - 1 }));
            }}
          >
            <Ionicons name="remove" size={14} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => dispatch(updateQuantity({ id: item._id || item.id, quantity: item.quantity + 1 }))}
          >
            <Ionicons name="add" size={14} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => dispatch(removeFromCart(item._id || item.id))}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item._id || item.id}
            contentContainerStyle={styles.list}
          />
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₱{total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <Ionicons name="card" size={18} color={COLORS.background} />
              <Text style={styles.checkoutText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 12 },
  cartItem: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  itemImage: { width: 80, height: 80, borderRadius: 8 },
  imagePlaceholder: { width: 80, height: 80, borderRadius: 8, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  itemPrice: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { backgroundColor: COLORS.surfaceLight, padding: 6, borderRadius: 6 },
  qtyText: { color: COLORS.text, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto', padding: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  shopBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  shopBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { color: COLORS.textMuted, fontSize: 12 },
  totalAmount: { color: COLORS.primary, fontSize: 22, fontWeight: '800' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  checkoutText: { color: COLORS.background, fontWeight: '800', fontSize: 15 },
});