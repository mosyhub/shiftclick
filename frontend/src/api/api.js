import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// 🔧 Change YOUR_LOCAL_IP to your actual IP address
// Windows: run `ipconfig` in terminal → look for IPv4 Address
// e.g. http://192.168.1.5:5000/api
const BASE_URL = 'http://192.168.100.244:5000/api/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;