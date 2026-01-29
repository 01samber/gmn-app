import api from './client.js';

export const authApi = {
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    api.setToken(data.token);
    localStorage.setItem('gmn_user', JSON.stringify(data.user));
    return data;
  },

  async register(email, password, name, role) {
    const data = await api.post('/auth/register', { email, password, name, role });
    api.setToken(data.token);
    localStorage.setItem('gmn_user', JSON.stringify(data.user));
    return data;
  },

  async getMe() {
    return api.get('/auth/me');
  },

  async updateProfile(data) {
    const result = await api.patch('/auth/me', data);
    localStorage.setItem('gmn_user', JSON.stringify(result.user));
    return result;
  },

  logout() {
    api.setToken(null);
    localStorage.removeItem('gmn_user');
    localStorage.removeItem('gmn_token');
  },

  isAuthenticated() {
    return !!api.getToken();
  },

  getUser() {
    try {
      const user = localStorage.getItem('gmn_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
};

export default authApi;
