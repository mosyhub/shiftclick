import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationDetailScreen({ route, navigation }) {
  // Kunin ang data na pinasa mula sa notification listener
  const { title, body, promoId } = route.params || {};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promotion Details</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="notifications-outline" size={40} color={COLORS.primary} />
        </View>
        
        <Text style={styles.title}>{title || 'Special Offer!'}</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.body}>
          {body || 'You have a new promotion from Shift & Click. Check our latest products for discounts!'}
        </Text>

        {promoId && (
          <View style={styles.promoBox}>
            <Text style={styles.promoLabel}>PROMO CODE</Text>
            <Text style={styles.promoCode}>{promoId.toUpperCase()}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.buttonText}>Shop Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, gap: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  card: { margin: 20, padding: 25, backgroundColor: COLORS.surface, borderRadius: 20, alignItems: 'center', elevation: 5 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  date: { fontSize: 12, color: COLORS.textMuted, marginTop: 5 },
  divider: { width: '100%', height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  body: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  promoBox: { marginTop: 25, padding: 15, backgroundColor: COLORS.primary + '10', borderRadius: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed' },
  promoLabel: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold', marginBottom: 5 },
  promoCode: { fontSize: 20, fontWeight: '800', color: COLORS.primary, letterSpacing: 2 },
  button: { marginTop: 30, backgroundColor: COLORS.primary, width: '100%', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
});