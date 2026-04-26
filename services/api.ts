// services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  // Se estiver no emulador Android: http://10.0.2.2:3000/api
  // Se estiver no celular físico (mesmo Wi-Fi): http://SEU_IP_LOCAL:3000/api
  // Se for testar direto no ar: https://menu-flow-app.vercel.app/api
  baseURL: 'https://menu-flow-app.vercel.app/api', 
//   baseURL: 'http://localhost:3000/api', 
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('menuflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;