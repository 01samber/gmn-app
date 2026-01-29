import api from './client.js';

export const techniciansApi = {
  getAll(params = {}) {
    return api.get('/technicians', params);
  },

  getById(id) {
    return api.get(`/technicians/${id}`);
  },

  create(data) {
    return api.post('/technicians', data);
  },

  update(id, data) {
    return api.patch(`/technicians/${id}`, data);
  },

  delete(id) {
    return api.delete(`/technicians/${id}`);
  },

  getTrades() {
    return api.get('/technicians/meta/trades');
  },
};

export default techniciansApi;
