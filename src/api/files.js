import api from './client.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const filesApi = {
  getAll(params = {}) {
    return api.get('/files', params);
  },

  upload(file, workOrderId = null) {
    return api.upload('/files', file, { workOrderId });
  },

  update(id, data) {
    return api.patch(`/files/${id}`, data);
  },

  delete(id) {
    return api.delete(`/files/${id}`);
  },

  getUrl(path) {
    return `${API_URL.replace('/api', '')}${path}`;
  },
};

export default filesApi;
