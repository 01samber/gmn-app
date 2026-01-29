import api from './client.js';

export const dashboardApi = {
  getStats() {
    return api.get('/dashboard/stats');
  },
};

export default dashboardApi;
