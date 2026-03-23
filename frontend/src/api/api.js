import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Use production/preview backend deployed on Render
const BASE_URL = 'https://shiftclick.onrender.com/api/';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});


api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;