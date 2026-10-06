import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import { SettingsProvider } from './context/SettingsContext';
import { AdminAuthProvider } from './context/AdminAuthContext';

// Fallback Loader for Suspense
const PageLoader = () => (
  <div className="container section-padding" style={{ display: 'flex', justifyContent: 'center', minHeight: '50vh', alignItems: 'center' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <style>{`
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

// Lazy-loaded pages
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const Category = lazy(() => import('./pages/Category'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Account = lazy(() => import('./pages/Account'));
const OrderDetails = lazy(() => import('./pages/OrderDetails'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Categories = lazy(() => import('./pages/Categories'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogDetails = lazy(() => import('./pages/BlogDetails'));
const Faq = lazy(() => import('./pages/Faq'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Prescriptions = lazy(() => import('./pages/Prescriptions'));

// Admin Pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/products/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/products/AdminProductForm'));

const AdminCategories = lazy(() => import('./pages/admin/categories/AdminCategories'));
const AdminCategoryForm = lazy(() => import('./pages/admin/categories/AdminCategoryForm'));
const AdminSubcategories = lazy(() => import('./pages/admin/categories/AdminSubcategories'));
const AdminBrands = lazy(() => import('./pages/admin/brands/AdminBrands'));
const AdminInventory = lazy(() => import('./pages/admin/inventory/AdminInventory'));

const AdminOrders = lazy(() => import('./pages/admin/orders/AdminOrders'));
const AdminOrderDetails = lazy(() => import('./pages/admin/orders/AdminOrderDetails'));
const AdminPrescriptions = lazy(() => import('./pages/admin/prescriptions/AdminPrescriptions'));
const AdminPrescriptionDetails = lazy(() => import('./pages/admin/prescriptions/AdminPrescriptionDetails'));

const AdminCustomers = lazy(() => import('./pages/admin/customers/AdminCustomers'));
const AdminCustomerDetails = lazy(() => import('./pages/admin/customers/AdminCustomerDetails'));

const AdminCoupons = lazy(() => import('./pages/admin/coupons/AdminCoupons'));
const AdminCouponForm = lazy(() => import('./pages/admin/coupons/AdminCouponForm'));
const AdminBanners = lazy(() => import('./pages/admin/banners/AdminBanners'));

const AdminBlog = lazy(() => import('./pages/admin/blog/AdminBlog'));
const AdminBlogForm = lazy(() => import('./pages/admin/blog/AdminBlogForm'));
const AdminReviews = lazy(() => import('./pages/admin/reviews/AdminReviews'));

const AdminReports = lazy(() => import('./pages/admin/reports/AdminReports'));
const AdminNotifications = lazy(() => import('./pages/admin/notifications/AdminNotifications'));
const AdminManagers = lazy(() => import('./pages/admin/managers/AdminManagers'));
const AdminSettings = lazy(() => import('./pages/admin/settings/AdminSettings'));
const AdminProfile = lazy(() => import('./pages/admin/profile/AdminProfile'));

export default function App() {
  return (
    <Router>
      <SettingsProvider>
        <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={
            <Suspense fallback={<PageLoader />}><Home /></Suspense>
          } />
          <Route path="shop" element={
            <Suspense fallback={<PageLoader />}><Shop /></Suspense>
          } />
          <Route path="category/:slug" element={
            <Suspense fallback={<PageLoader />}><Category /></Suspense>
          } />
          <Route path="search" element={
            <Suspense fallback={<PageLoader />}><SearchResults /></Suspense>
          } />
          <Route path="product/:slug" element={
            <Suspense fallback={<PageLoader />}><ProductDetails /></Suspense>
          } />
          <Route path="cart" element={
            <Suspense fallback={<PageLoader />}><Cart /></Suspense>
          } />
          <Route path="checkout" element={
            <Suspense fallback={<PageLoader />}><Checkout /></Suspense>
          } />
          <Route path="prescriptions" element={
            <Suspense fallback={<PageLoader />}><Prescriptions /></Suspense>
          } />


          
          {/* Account Routes */}
          <Route path="account" element={
            <Suspense fallback={<PageLoader />}><Account /></Suspense>
          } />
          <Route path="account/:tab" element={
            <Suspense fallback={<PageLoader />}><Account /></Suspense>
          } />
          <Route path="account/orders/:id" element={
            <Suspense fallback={<PageLoader />}><OrderDetails /></Suspense>
          } />
          
          <Route path="wishlist" element={
            <Suspense fallback={<PageLoader />}><Wishlist /></Suspense>
          } />
          <Route path="categories" element={
            <Suspense fallback={<PageLoader />}><Categories /></Suspense>
          } />
          <Route path="about" element={
            <Suspense fallback={<PageLoader />}><About /></Suspense>
          } />
          <Route path="contact" element={
            <Suspense fallback={<PageLoader />}><Contact /></Suspense>
          } />
          <Route path="blog" element={
            <Suspense fallback={<PageLoader />}><Blog /></Suspense>
          } />
          <Route path="blog/:slug" element={
            <Suspense fallback={<PageLoader />}><BlogDetails /></Suspense>
          } />
          <Route path="faq" element={
            <Suspense fallback={<PageLoader />}><Faq /></Suspense>
          } />
          <Route path="privacy-policy" element={
            <Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>
          } />
          <Route path="terms" element={
            <Suspense fallback={<PageLoader />}><Terms /></Suspense>
          } />
          
          <Route path="*" element={
            <Suspense fallback={<PageLoader />}><NotFound /></Suspense>
          } />
        </Route>

        {/* Independent Full-Screen Pages */}
        <Route path="/login" element={
          <Suspense fallback={<PageLoader />}><Login /></Suspense>
        } />
        <Route path="/register" element={
          <Suspense fallback={<PageLoader />}><Register /></Suspense>
        } />
        <Route path="/forgot-password" element={
          <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>
        } />

        {/* Admin Public Route */}
        <Route path="/admin/login" element={
          <Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>
        } />

        {/* Admin Protected Routes */}
        <Route path="/admin" element={
          <AdminAuthProvider>
            <AdminLayout />
          </AdminAuthProvider>
        }>
          <Route index element={
            <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
          } />
          
          {/* Products */}
          <Route path="products" element={<Suspense fallback={<PageLoader />}><AdminProducts /></Suspense>} />
          <Route path="products/create" element={<Suspense fallback={<PageLoader />}><AdminProductForm /></Suspense>} />
          <Route path="products/edit/:id" element={<Suspense fallback={<PageLoader />}><AdminProductForm /></Suspense>} />
          
          {/* Categories & Brands */}
          <Route path="categories" element={<Suspense fallback={<PageLoader />}><AdminCategories /></Suspense>} />
          <Route path="categories/create" element={<Suspense fallback={<PageLoader />}><AdminCategoryForm /></Suspense>} />
          <Route path="categories/edit/:id" element={<Suspense fallback={<PageLoader />}><AdminCategoryForm /></Suspense>} />
          <Route path="subcategories" element={<Suspense fallback={<PageLoader />}><AdminSubcategories /></Suspense>} />
          <Route path="brands" element={<Suspense fallback={<PageLoader />}><AdminBrands /></Suspense>} />
          
          {/* Inventory */}
          <Route path="inventory" element={<Suspense fallback={<PageLoader />}><AdminInventory /></Suspense>} />
          
          {/* Orders & Prescriptions */}
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><AdminOrders /></Suspense>} />
          <Route path="orders/:id" element={<Suspense fallback={<PageLoader />}><AdminOrderDetails /></Suspense>} />
          <Route path="prescriptions" element={<Suspense fallback={<PageLoader />}><AdminPrescriptions /></Suspense>} />
          <Route path="prescriptions/:id" element={<Suspense fallback={<PageLoader />}><AdminPrescriptionDetails /></Suspense>} />
          
          {/* Customers */}
          <Route path="customers" element={<Suspense fallback={<PageLoader />}><AdminCustomers /></Suspense>} />
          <Route path="customers/:id" element={<Suspense fallback={<PageLoader />}><AdminCustomerDetails /></Suspense>} />
          
          {/* Marketing */}
          <Route path="coupons" element={<Suspense fallback={<PageLoader />}><AdminCoupons /></Suspense>} />
          <Route path="coupons/create" element={<Suspense fallback={<PageLoader />}><AdminCouponForm /></Suspense>} />
          <Route path="coupons/edit/:id" element={<Suspense fallback={<PageLoader />}><AdminCouponForm /></Suspense>} />
          <Route path="banners" element={<Suspense fallback={<PageLoader />}><AdminBanners /></Suspense>} />
          
          {/* Content */}
          <Route path="blog" element={<Suspense fallback={<PageLoader />}><AdminBlog /></Suspense>} />
          <Route path="blog/create" element={<Suspense fallback={<PageLoader />}><AdminBlogForm /></Suspense>} />
          <Route path="blog/new" element={<Suspense fallback={<PageLoader />}><AdminBlogForm /></Suspense>} />
          <Route path="blog/edit/:id" element={<Suspense fallback={<PageLoader />}><AdminBlogForm /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<PageLoader />}><AdminReviews /></Suspense>} />
          
          {/* System */}
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><AdminReports /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><AdminNotifications /></Suspense>} />
          <Route path="managers" element={<Suspense fallback={<PageLoader />}><AdminManagers /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><AdminSettings /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><AdminProfile /></Suspense>} />
        </Route>
      </Routes>
    </SettingsProvider>
  </Router>
);
}
