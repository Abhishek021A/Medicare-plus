import axios from 'axios';

// The base URL for the PHP backend API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/pharmacy_api/api/index.php';

// Create an Axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach authentication token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling auth tokens and global errors
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/* 
 * API SERVICE ENDPOINTS
 * --------------------------------------------------
 * Connected to PHP backend REST endpoints
 */
const api = {
  
  // --- PRODUCTS ---
  getProducts: (params = {}) => {
    return apiClient.get('/products', { params });
  },

  getProduct: (id) => {
    return apiClient.get(`/products/${id}`);
  },

  // --- CATEGORIES ---
  getCategories: () => {
    return apiClient.get('/categories');
  },

  getCategoryBySlug: (slug) => {
    return apiClient.get(`/categories/${slug}`);
  },

  // --- BRANDS ---
  getBrands: (params = {}) => {
    return apiClient.get('/brands', { params });
  },

  // --- CART ---
  getCart: () => {
    return apiClient.get('/cart');
  },

  addToCart: (payload) => {
    return apiClient.post('/cart', payload);
  },
  
  removeFromCart: (cartItemId) => {
    return apiClient.delete(`/cart/${cartItemId}`);
  },

  // --- ORDERS ---
  createOrder: (orderData) => {
    if (orderData.prescriptionFile) {
      const formData = new FormData();
      Object.keys(orderData).forEach(key => {
        if (key === 'items') {
          formData.append(key, JSON.stringify(orderData[key]));
        } else {
          formData.append(key, orderData[key]);
        }
      });
      return apiClient.post('/orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return apiClient.post('/orders', orderData);
  },

  getOrders: () => {
    return apiClient.get('/orders');
  },

  getOrderDetails: (orderId) => {
    return apiClient.get(`/orders/${orderId}`);
  },

  // --- PRESCRIPTIONS ---
  getPrescriptions: (params = {}) => {
    return apiClient.get('/prescriptions', { params });
  },

  getPrescriptionDetails: (id) => {
    return apiClient.get(`/prescriptions/${id}`);
  },

  uploadPrescription: (formData) => {
    return apiClient.post('/prescriptions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // --- ADDRESSES ---
  getAddresses: () => {
    return apiClient.get('/addresses');
  },

  addAddress: (addressData) => {
    return apiClient.post('/addresses', addressData);
  },

  updateAddress: (id, addressData) => {
    return apiClient.put(`/addresses/${id}`, addressData);
  },

  deleteAddress: (id) => {
    return apiClient.delete(`/addresses/${id}`);
  },

  // --- WISHLIST ---
  getWishlist: () => {
    return apiClient.get('/wishlist');
  },

  addToWishlist: (productId) => {
    return apiClient.post('/wishlist', { productId });
  },

  removeFromWishlist: (productId) => {
    return apiClient.delete(`/wishlist/${productId}`);
  },

  login: (credentials) => {
    return apiClient.post('/auth/login', credentials);
  },
  
  register: (userData) => {
    return apiClient.post('/auth/register', userData);
  },

  forgotPassword: (email) => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: (payload) => {
    return apiClient.post('/auth/reset-password', payload);
  },

  getCurrentUser: () => {
    return apiClient.get('/auth/me');
  },

  updateProfile: (profileData) => {
    return apiClient.put('/user/profile', profileData);
  },

  logout: () => {
    return apiClient.post('/auth/logout');
  },

  // --- LOCATION ---
  reverseGeocode: (lat, lng) => {
    return apiClient.get(`/location/geocode?lat=${lat}&lng=${lng}`);
  },

  // --- COUPONS ---
  applyCoupon: (code, cartItems = [], subtotal = 0) => {
    return apiClient.post('/coupons/apply', { code, cart_items: cartItems, subtotal });
  },

  // --- BANNERS ---
  getBanners: (position = '') => {
    return apiClient.get('/banners', { params: { position, public: true } });
  },

  // --- BLOG ---
  getBlogPosts: (params = {}) => {
    return apiClient.get('/blog', { params });
  },

  getBlogPost: (slugOrId) => {
    return apiClient.get(`/blog/${slugOrId}`);
  },

  getBlogCategories: () => {
    return apiClient.get('/blog/categories');
  },

  // --- PRODUCT REVIEWS & RATINGS ---
  getProductReviews: (productId, params = {}) => {
    return apiClient.get(`/products/${productId}/reviews`, { params });
  },

  createProductReview: (productId, data) => {
    return apiClient.post(`/products/${productId}/reviews`, data);
  },

  // --- SETTINGS ---
  getPublicSettings: () => {
    return apiClient.get('/settings/public');
  }
};

export default api;
