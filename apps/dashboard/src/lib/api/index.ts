import axios from 'axios';
import { getCookie } from '../cookies';

export const api = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  transformRequest: [
    (d, h) => {
      const token = getCookie('token');
      if (token) {
        h.Authorization = `Bearer ${token}`;
      }
      return JSON.stringify(d);
    }
  ],
  validateStatus(status) {
    return true;
  }
});
