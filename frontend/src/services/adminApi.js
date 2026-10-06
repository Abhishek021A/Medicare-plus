import axios from 'axios';

// Configure the base URL for the admin API
const API_URL = 'http://localhost:8080/pharmacy_api/api/index.php';

const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the JWT token and handle FormData Content-Type
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || 'mock-admin-token-123';
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If sending FormData, delete the Content-Type so Axios sets it automatically with the boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Service
export const adminAuthService = {
  login: async (credentials) => {
    // const response = await adminApi.post('/login.php', credentials);
    // return response.data;
    
    // MOCK RESPONSE FOR FRONTEND DEVELOPMENT
    return new Promise((resolve, reject) => setTimeout(() => {
      if (credentials.email === 'admin@medicareplus.com' && credentials.password === 'admin123') {
        resolve({ 
          success: true, 
          token: 'mock-admin-token-123',
          user: { id: 1, name: 'Super Admin', role: 'SUPER_ADMIN' }
        });
      } else {
        reject({
          response: {
            data: {
              message: 'Invalid administrator credentials. Please use admin@medicareplus.com and admin123'
            }
          }
        });
      }
    }, 1000));
  },
  logout: () => {
    localStorage.removeItem('adminToken');
  }
};

// Products Service
export const adminProductService = {
  getProducts: async (params) => {
    // const response = await adminApi.get('/products.php', { params });
    // return response.data;
    
    const response = await adminApi.get('/products', { params });
    return response.data;
  },
  
  getProduct: async (id) => {
    const response = await adminApi.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await adminApi.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await adminApi.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await adminApi.delete(`/products/${id}`);
    return response.data;
  }
};

// Categories Service
export const adminCategoryService = {
  getCategories: async (params) => {
    const response = await adminApi.get('/categories', { params });
    return response.data;
  },
  
  getCategory: async (id) => {
    const response = await adminApi.get(`/categories/${id}`);
    return response.data;
  },

  createCategory: async (categoryData) => {
    // Axios automatically sets the correct Content-Type (with boundary) when passing FormData
    const response = await adminApi.post('/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    // If it's FormData, we need to send as POST with _method=PUT to bypass PHP's multipart/form-data PUT limitation
    if (categoryData instanceof FormData) {
      categoryData.append('_method', 'PUT');
      const response = await adminApi.post(`/categories/${id}`, categoryData);
      return response.data;
    } else {
      const response = await adminApi.put(`/categories/${id}`, categoryData);
      return response.data;
    }
  },

  deleteCategory: async (id) => {
    const response = await adminApi.delete(`/categories/${id}`);
    return response.data;
  }
};

// Brands Service
export const adminBrandService = {
  getBrands: async (params) => {
    const response = await adminApi.get('/brands', { params });
    return response.data;
  },
  
  getBrand: async (id) => {
    const response = await adminApi.get(`/brands/${id}`);
    return response.data;
  },

  createBrand: async (brandData) => {
    const response = await adminApi.post('/brands', brandData);
    return response.data;
  },

  updateBrand: async (id, brandData) => {
    if (brandData instanceof FormData) {
      brandData.append('_method', 'PUT');
      const response = await adminApi.post(`/brands/${id}`, brandData);
      return response.data;
    } else {
      const response = await adminApi.put(`/brands/${id}`, brandData);
      return response.data;
    }
  },

  deleteBrand: async (id) => {
    const response = await adminApi.delete(`/brands/${id}`);
    return response.data;
  },

  updateBrandStatus: async (id, status) => {
    const response = await adminApi.patch(`/brands/${id}/status`, { status });
    return response.data;
  },

  updateBrandFeatured: async (id, featured) => {
    const response = await adminApi.patch(`/brands/${id}/featured`, { featured });
    return response.data;
  }
};

// Stats Service
export const adminStatsService = {
  getBadges: async () => {
    const response = await adminApi.get('/stats');
    return response.data;
  }
};
// Inventory Service
export const adminInventoryService = {
  getInventory: async (params = {}) => {
    const response = await adminApi.get('/inventory', { params });
    return response.data;
  },
  getSummary: async () => {
    const response = await adminApi.get('/inventory/summary');
    return response.data;
  },
  getHistory: async (productId = null, params = {}) => {
    const url = productId ? `/inventory/${productId}/history` : '/inventory/history';
    const response = await adminApi.get(url, { params });
    return response.data;
  },
  adjustStock: async (data) => {
    const response = await adminApi.post('/inventory/adjust', data);
    return response.data;
  },
  bulkAdjustStock: async (data) => {
    const response = await adminApi.post('/inventory/bulk-adjust', data);
    return response.data;
  },
  exportInventory: async (params = {}) => {
    const response = await adminApi.get('/inventory/export', { params });
    return response.data;
  }
};

// Orders Service
export const adminOrderService = {
  getOrders: async (params = {}) => {
    const response = await adminApi.get('/orders', { params });
    return response.data;
  },
  getOrderSummary: async () => {
    const response = await adminApi.get('/orders/summary');
    return response.data;
  },
  getOrderDetails: async (orderId) => {
    const response = await adminApi.get(`/orders/${orderId}`);
    return response.data;
  },
  updateOrderStatus: async (orderId, data) => {
    const response = await adminApi.put(`/orders/${orderId}`, data);
    return response.data;
  },
  updatePaymentStatus: async (orderId, data) => {
    const response = await adminApi.put(`/orders/${orderId}/payment`, data);
    return response.data;
  },
  getOrderHistory: async (orderId) => {
    const response = await adminApi.get(`/orders/${orderId}/history`);
    return response.data;
  },
  cancelOrder: async (orderId, data = {}) => {
    const response = await adminApi.post(`/orders/${orderId}/cancel`, data);
    return response.data;
  },
  exportOrders: async (params = {}) => {
    const response = await adminApi.get('/orders/export', { params });
    return response.data;
  }
};

// Prescriptions Service
export const adminPrescriptionService = {
  getPrescriptions: async (params = {}) => {
    const response = await adminApi.get('/prescriptions', { params });
    return response.data;
  },
  getSummary: async () => {
    const response = await adminApi.get('/prescriptions/summary');
    return response.data;
  },
  getPrescriptionDetails: async (id) => {
    const response = await adminApi.get(`/prescriptions/${id}`);
    return response.data;
  },
  updateStatus: async (id, data) => {
    const response = await adminApi.put(`/prescriptions/${id}`, data);
    return response.data;
  },
  approvePrescription: async (id, notes = '') => {
    const response = await adminApi.put(`/prescriptions/${id}`, {
      status: 'APPROVED',
      decision: 'approved',
      notes,
      admin_notes: notes
    });
    return response.data;
  },
  rejectPrescription: async (id, reason, notes = '') => {
    const response = await adminApi.put(`/prescriptions/${id}`, {
      status: 'REJECTED',
      decision: 'rejected',
      reason,
      rejection_reason: reason,
      notes,
      admin_notes: notes
    });
    return response.data;
  },
  exportPrescriptions: async (params = {}) => {
    const response = await adminApi.get('/prescriptions/export', { params });
    return response.data;
  }
};

// Customers Service
export const adminCustomerService = {
  getCustomers: async (params = {}) => {
    const response = await adminApi.get('/customers', { params });
    return response.data;
  },
  getSummary: async () => {
    const response = await adminApi.get('/customers/summary');
    return response.data;
  },
  getCustomerDetails: async (id) => {
    const response = await adminApi.get(`/customers/${id}`);
    return response.data;
  },
  getCustomerOrders: async (id) => {
    const response = await adminApi.get(`/customers/${id}/orders`);
    return response.data;
  },
  getCustomerPrescriptions: async (id) => {
    const response = await adminApi.get(`/customers/${id}/prescriptions`);
    return response.data;
  },
  getCustomerWishlist: async (id) => {
    const response = await adminApi.get(`/customers/${id}/wishlist`);
    return response.data;
  },
  getCustomerAddresses: async (id) => {
    const response = await adminApi.get(`/customers/${id}/addresses`);
    return response.data;
  },
  getCustomerReviews: async (id) => {
    const response = await adminApi.get(`/customers/${id}/reviews`);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await adminApi.post(`/customers/${id}/status`, { status });
    return response.data;
  },
  blockCustomer: async (id) => {
    const response = await adminApi.post(`/customers/${id}/status`, { status: 'BLOCKED' });
    return response.data;
  },
  unblockCustomer: async (id) => {
    const response = await adminApi.post(`/customers/${id}/status`, { status: 'ACTIVE' });
    return response.data;
  },
  updateCustomer: async (id, data) => {
    const response = await adminApi.put(`/customers/${id}`, data);
    return response.data;
  },
  deleteCustomer: async (id) => {
    const response = await adminApi.delete(`/customers/${id}`);
    return response.data;
  },
  exportCustomers: async (params = {}) => {
    const response = await adminApi.get('/customers/export', { params });
    return response.data;
  }
};

// Coupons Service
export const adminCouponService = {
  getCoupons: async (params = {}) => {
    const response = await adminApi.get('/coupons', { params });
    return response.data;
  },
  getSummary: async () => {
    const response = await adminApi.get('/coupons/summary');
    return response.data;
  },
  getMeta: async () => {
    const response = await adminApi.get('/coupons/meta');
    return response.data;
  },
  getCoupon: async (id) => {
    const response = await adminApi.get(`/coupons/${id}`);
    return response.data;
  },
  createCoupon: async (data) => {
    const response = await adminApi.post('/coupons', data);
    return response.data;
  },
  updateCoupon: async (id, data) => {
    const response = await adminApi.put(`/coupons/${id}`, data);
    return response.data;
  },
  toggleStatus: async (id, status) => {
    const response = await adminApi.post(`/coupons/${id}/status`, { status });
    return response.data;
  },
  deleteCoupon: async (id) => {
    const response = await adminApi.delete(`/coupons/${id}`);
    return response.data;
  },
  getCouponUsage: async (id) => {
    const response = await adminApi.get(`/coupons/${id}/usage`);
    return response.data;
  },
  exportCoupons: async (params = {}) => {
    const response = await adminApi.get('/coupons/export', { params });
    return response.data;
  }
};

// Banners Service
export const adminBannerService = {
  getBanners: async (params = {}) => {
    const response = await adminApi.get('/banners', { params: { admin: true, ...params } });
    return response.data;
  },
  getSummary: async () => {
    const response = await adminApi.get('/banners/summary');
    return response.data;
  },
  getBanner: async (id) => {
    const response = await adminApi.get(`/banners/${id}`);
    return response.data;
  },
  createBanner: async (formData) => {
    const isFormData = formData instanceof FormData;
    const response = await adminApi.post('/banners', formData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
  },
  updateBanner: async (id, formData) => {
    const isFormData = formData instanceof FormData;
    const response = await adminApi.post(`/banners/${id}`, formData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
  },
  toggleStatus: async (id, status) => {
    const response = await adminApi.post(`/banners/${id}/status`, { status });
    return response.data;
  },
  duplicateBanner: async (id) => {
    const response = await adminApi.post(`/banners/${id}/duplicate`);
    return response.data;
  },
  reorderBanners: async (items) => {
    const response = await adminApi.post('/banners/reorder', { items });
    return response.data;
  },
  deleteBanner: async (id) => {
    const response = await adminApi.delete(`/banners/${id}`);
    return response.data;
  },
  exportBanners: async (params = {}) => {
    const response = await adminApi.get('/banners/export', { params });
    return response.data;
  }
};

// Blog CMS Service
export const adminBlogService = {
  getPosts: async (params = {}) => {
    const response = await adminApi.get('/blog', { params: { admin: true, ...params } });
    return response.data;
  },
  getSummary: async () => {
    const response = await adminApi.get('/blog/summary');
    return response.data;
  },
  getCategories: async () => {
    const response = await adminApi.get('/blog/categories');
    return response.data;
  },
  getPost: async (id) => {
    const response = await adminApi.get(`/blog/${id}`);
    return response.data;
  },
  createPost: async (formData) => {
    const isFormData = formData instanceof FormData;
    const response = await adminApi.post('/blog', formData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
  },
  updatePost: async (id, formData) => {
    const isFormData = formData instanceof FormData;
    const response = await adminApi.post(`/blog/${id}`, formData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await adminApi.post(`/blog/${id}/status`, { status });
    return response.data;
  },
  duplicatePost: async (id) => {
    const response = await adminApi.post(`/blog/${id}/duplicate`);
    return response.data;
  },
  deletePost: async (id) => {
    const response = await adminApi.delete(`/blog/${id}`);
    return response.data;
  },
  exportPosts: async (params = {}) => {
    const response = await adminApi.get('/blog/export', { params });
    return response.data;
  }
};

// Reviews & Ratings Management Service
export const adminReviewService = {
  getReviews: async (params = {}) => {
    const response = await adminApi.get('/reviews', { params: { admin: true, ...params } });
    return response.data;
  },
  getSummary: async () => {
    const response = await adminApi.get('/reviews/summary');
    return response.data;
  },
  getReviewDetails: async (id) => {
    const response = await adminApi.get(`/reviews/${id}`);
    return response.data;
  },
  approveReview: async (id) => {
    const response = await adminApi.post(`/reviews/${id}/approve`);
    return response.data;
  },
  rejectReview: async (id, reason) => {
    const response = await adminApi.post(`/reviews/${id}/reject`, { reason });
    return response.data;
  },
  hideReview: async (id) => {
    const response = await adminApi.post(`/reviews/${id}/hide`);
    return response.data;
  },
  restoreReview: async (id) => {
    const response = await adminApi.post(`/reviews/${id}/restore`);
    return response.data;
  },
  deleteReview: async (id) => {
    const response = await adminApi.delete(`/reviews/${id}`);
    return response.data;
  },
  exportReviews: async (params = {}) => {
    const response = await adminApi.get('/reviews/export', { params });
    return response.data;
  }
};

// Reports & Analytics Service
export const adminReportService = {
  getDashboardReports: async (params = {}) => {
    const response = await adminApi.get('/reports', { params });
    return response.data;
  },
  exportReports: async (params = {}) => {
    const response = await adminApi.get('/reports/export', { params });
    return response.data;
  }
};

// Notification Center Service
export const adminNotificationService = {
  getNotifications: async (params = {}) => {
    const response = await adminApi.get('/notifications', { params });
    return response.data;
  },
  getRecentNotifications: async () => {
    const response = await adminApi.get('/notifications/recent');
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await adminApi.get('/notifications/unread-count');
    return response.data;
  },
  getNotification: async (id) => {
    const response = await adminApi.get(`/notifications/${id}`);
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await adminApi.patch(`/notifications/${id}/read`);
    return response.data;
  },
  markAsUnread: async (id) => {
    const response = await adminApi.patch(`/notifications/${id}/unread`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await adminApi.patch('/notifications/read-all');
    return response.data;
  },
  deleteNotification: async (id) => {
    const response = await adminApi.delete(`/notifications/${id}`);
    return response.data;
  },
  clearReadNotifications: async () => {
    const response = await adminApi.post('/notifications/clear-read');
    return response.data;
  }
};

// Settings & Configuration Service
export const adminSettingsService = {
  getSettings: async () => {
    const response = await adminApi.get('/settings');
    return response.data;
  },
  getPublicSettings: async () => {
    const response = await adminApi.get('/settings/public');
    return response.data;
  },
  updateSettings: async (settingsData) => {
    const response = await adminApi.put('/settings', { settings: settingsData });
    return response.data;
  },
  uploadAsset: async (formData) => {
    const response = await adminApi.post('/settings/upload', formData);
    return response.data;
  },
  resetSettings: async () => {
    const response = await adminApi.post('/settings/reset');
    return response.data;
  }
};

// Admin Profile Service
export const adminProfileService = {
  getProfile: async () => {
    const response = await adminApi.get('/profile');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await adminApi.put('/profile', profileData);
    return response.data;
  },
  changePassword: async (passwordData) => {
    const response = await adminApi.post('/profile/password', passwordData);
    return response.data;
  },
  uploadAvatar: async (formData) => {
    const response = await adminApi.post('/profile/avatar', formData);
    return response.data;
  },
  removeAvatar: async () => {
    const response = await adminApi.delete('/profile/avatar');
    return response.data;
  },
  getActivity: async () => {
    const response = await adminApi.get('/profile/activity');
    return response.data;
  },
  getSessions: async () => {
    const response = await adminApi.get('/profile/sessions');
    return response.data;
  }
};

// Managers Service
export const adminManagerService = {
  getSummary: async () => {
    const response = await adminApi.get('/managers/summary');
    return response.data;
  },
  getManagers: async (params = {}) => {
    const response = await adminApi.get('/managers', { params });
    return response.data;
  },
  getManager: async (id) => {
    const response = await adminApi.get(`/managers/${id}`);
    return response.data;
  },
  createManager: async (data) => {
    const response = await adminApi.post('/managers', data);
    return response.data;
  },
  updateManager: async (id, data) => {
    const response = await adminApi.put(`/managers/${id}`, data);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await adminApi.patch(`/managers/${id}/status`, { status });
    return response.data;
  },
  resetPassword: async (id, data) => {
    const response = await adminApi.post(`/managers/${id}/reset-password`, data);
    return response.data;
  },
  getPermissions: async (id) => {
    const response = await adminApi.get(`/managers/${id}/permissions`);
    return response.data;
  },
  savePermissions: async (id, permissions) => {
    const response = await adminApi.post(`/managers/${id}/permissions`, { permissions });
    return response.data;
  },
  getActivity: async (id) => {
    const response = await adminApi.get(`/managers/${id}/activity`);
    return response.data;
  },
  deleteManager: async (id) => {
    const response = await adminApi.delete(`/managers/${id}`);
    return response.data;
  },
  exportManagers: async (params = {}) => {
    const response = await adminApi.get('/managers/export', { params, responseType: 'blob' });
    return response.data;
  }
};

export default adminApi;
