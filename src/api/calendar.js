import api from './client.js';

export const calendarApi = {
  getAll(params = {}) {
    return api.get('/calendar', { ...params, includeWorkOrders: 'true' });
  },

  getById(id) {
    return api.get(`/calendar/${id}`);
  },

  create(data) {
    return api.post('/calendar', data);
  },

  update(id, data) {
    return api.patch(`/calendar/${id}`, data);
  },

  delete(id) {
    return api.delete(`/calendar/${id}`);
  },
};

export default calendarApi;
