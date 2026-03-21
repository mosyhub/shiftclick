import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../redux/slices/authSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error, user } = useSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigation.replace('Admin', { screen: 'AdminDashboard' });
      } else {
        navigation.replace('Home', { screen: 'ProductList' });
      }
    }
  }, [user]);

  useEffect(() => {
    if (error) { Alert.alert('Login Failed', error); dispatch(clearError()); }
  }, [error]);

  const handleLogin = () => {
    if (!email || !password) return Alert.alert('Missing Fields', 'Please enter email and password.');
    dispatch(loginUser({ email: email.trim().toLowerCase(), password }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logoIcon}>🎮</Text>
          <Text style={styles.logoText}>Shift & Click</Text>
          <Text style={styles.logoSub}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.loginText}>Login</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>Don't have an account? <Text style={styles.registerBold}>Register</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { fontSize: 56, marginBottom: 10 },
  logoText: { color: COLORS.primary, fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  logoSub: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  form: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceLight, color: COLORS.text, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  eyeBtn: { backgroundColor: COLORS.surfaceLight, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  loginBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16,
  },
  loginText: { color: COLORS.background, fontWeight: '800', fontSize: 16 },
  registerLink: { alignItems: 'center' },
  registerText: { color: COLORS.textMuted, fontSize: 14 },
  registerBold: { color: COLORS.primary, fontWeight: '700' },
});