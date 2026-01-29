import api from './client.js';

export const proposalsApi = {
  getAll(params = {}) {
    return api.get('/proposals', params);
  },

  getById(id) {
    return api.get(`/proposals/${id}`);
  },

  create(data) {
    return api.post('/proposals', data);
  },

  update(id, data) {
    return api.patch(`/proposals/${id}`, data);
  },

  delete(id) {
    return api.delete(`/proposals/${id}`);
  },
};

export default proposalsApi;
