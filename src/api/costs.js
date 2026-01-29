import api from './client.js';

export const costsApi = {
  getAll(params = {}) {
    return api.get('/costs', params);
  },

  getById(id) {
    return api.get(`/costs/${id}`);
  },

  create(data) {
    return api.post('/costs', data);
  },

  update(id, data) {
    return api.patch(`/costs/${id}`, data);
  },

  delete(id) {
    return api.delete(`/costs/${id}`);
  },
};

export default costsApi;
