import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, clearError } from '../redux/slices/authSlice';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error, user } = useSelector((s) => s.auth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user) navigation.navigate('Home');
  }, [user]);

  useEffect(() => {
    if (error) { Alert.alert('Registration Failed', error); dispatch(clearError()); }
  }, [error]);

  const handleRegister = () => {
    if (!name || !email || !password || !confirm) return Alert.alert('Missing Fields', 'Please fill in all fields.');
    if (password !== confirm) return Alert.alert('Password Mismatch', 'Passwords do not match.');
    if (password.length < 6) return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    dispatch(registerUser({ name: name.trim(), email: email.trim().toLowerCase(), password }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logoIcon}>🎮</Text>
          <Text style={styles.logoText}>Create Account</Text>
          <Text style={styles.logoSub}>Join Shift & Click today</Text>
        </View>

        <View style={styles.form}>
          {[
            { label: 'Full Name', value: name, set: setName, placeholder: 'John Doe', type: 'default' },
            { label: 'Email', value: email, set: setEmail, placeholder: 'you@email.com', type: 'email-address' },
          ].map((field) => (
            <View key={field.label}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.textMuted}
                value={field.value}
                onChangeText={field.set}
                keyboardType={field.type}
                autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
              />
            </View>
          ))}

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Min 6 characters"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor={COLORS.textMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPass}
          />

          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.registerText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginBold}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoIcon: { fontSize: 48, marginBottom: 10 },
  logoText: { color: COLORS.primary, fontSize: 26, fontWeight: '800' },
  logoSub: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  form: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceLight, color: COLORS.text, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { backgroundColor: COLORS.surfaceLight, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  registerBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16, marginTop: 4,
  },
  registerText: { color: COLORS.background, fontWeight: '800', fontSize: 16 },
  loginLink: { alignItems: 'center' },
  loginLinkText: { color: COLORS.textMuted, fontSize: 14 },
  loginBold: { color: COLORS.primary, fontWeight: '700' },
});