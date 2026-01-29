import { useState, useCallback, useEffect, useRef } from 'react';

export function useApi(apiFunc, { immediate = false, params = null } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      if (mountedRef.current) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'An error occurred');
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [apiFunc]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      execute(params);
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset, setData };
}

export function usePaginatedApi(apiFunc) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc({ page: pagination.page, limit: pagination.limit, ...params });
      setItems(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunc, pagination.page, pagination.limit]);

  const setPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => fetch(), [fetch]);

  return { items, pagination, loading, error, fetch, setPage, refresh, setItems };
}

export default useApi;
