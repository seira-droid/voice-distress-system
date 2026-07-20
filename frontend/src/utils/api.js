// API utility with automatic token refresh

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Store the refresh function globally so we can use it in interceptors
let refreshTokenFunction = null;

export const setRefreshTokenFunction = (refreshFn) => {
  refreshTokenFunction = refreshFn;
};

export const getAuthHeaders = async () => {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const refreshAccessToken = async () => {
  if (!refreshTokenFunction) {
    throw new Error('Refresh token function not initialized');
  }
  
  try {
    const newToken = await refreshTokenFunction();
    return newToken;
  } catch (err) {
    // Refresh failed, clear auth and redirect to login
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw err;
  }
};

export const fetchWithAuth = async (url, options = {}) => {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...(await getAuthHeaders()),
      ...options.headers,
    },
  });

  // If unauthorized, try to refresh token once
  if (response.status === 401) {
    try {
      await refreshAccessToken();
      
      // Retry the original request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...(await getAuthHeaders()),
          ...options.headers,
        },
      });
    } catch (err) {
      // Refresh failed, already redirected to login
      throw err;
    }
  }

  return response;
};

export const apiClient = {
  get: async (url) => {
    return fetchWithAuth(`${API_BASE}${url}`);
  },

  post: async (url, data) => {
    return fetchWithAuth(`${API_BASE}${url}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put: async (url, data) => {
    return fetchWithAuth(`${API_BASE}${url}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (url) => {
    return fetchWithAuth(`${API_BASE}${url}`, {
      method: 'DELETE',
    });
  },
};

export default API_BASE;