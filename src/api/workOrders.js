import api from './client.js';

export const workOrdersApi = {
  getAll(params = {}) {
    return api.get('/work-orders', params);
  },

  getById(id) {
    return api.get(`/work-orders/${id}`);
  },

  create(data) {
    return api.post('/work-orders', data);
  },

  update(id, data) {
    return api.patch(`/work-orders/${id}`, data);
  },

  delete(id) {
    return api.delete(`/work-orders/${id}`);
  },
};

export default workOrdersApi;
