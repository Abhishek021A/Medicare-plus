import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, FolderTree, Tag, Box, 
  ShoppingCart, Pill, Users, Ticket, Image, FileText, 
  Star, BarChart2, Bell, Settings, LogOut, X, UserCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { adminStatsService } from '../../services/adminApi';
import { useToast } from '../../context/ToastContext';
import './AdminSidebar.css';

export default function AdminSidebar({ isMobileOpen, setIsMobileOpen, isCollapsed, setIsCollapsed }) {
  const [badges, setBadges] = useState({ orders: 0, prescriptions: 0 });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    // Get user from local storage
    const storedUser = localStorage.getItem('adminUser');
    if (storedUser) {
      setAdminUser(JSON.parse(storedUser));
    }

    // Fetch badges
    const fetchBadges = async () => {
      try {
        const response = await adminStatsService.getBadges();
        if (response.success && response.data) {
          setBadges({
            orders: response.data.pending_orders,
            prescriptions: response.data.pending_prescriptions,
            reviews: response.data.pending_reviews,
            notifications: response.data.unread_notifications || 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch sidebar badges', err);
      }
    };
    
    fetchBadges();

    const handleSync = () => fetchBadges();
    window.addEventListener('medicare_notifications_updated', handleSync);
    const interval = setInterval(fetchBadges, 45000);

    return () => {
      window.removeEventListener('medicare_notifications_updated', handleSync);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    addToast('success', 'Logged out successfully');
    navigate('/admin/login');
  };

  // Role & Granular Permissions checking
  const hasPermission = (item) => {
    if (!adminUser) return false;
    const role = adminUser.role || '';
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;

    // Strict Super Admin / Admin only routes
    if (item.name === 'Managers' || item.name === 'Settings') {
      return false;
    }

    // Check granular module permissions if configured for staff manager
    if (adminUser.permissions && item.module) {
      const modPerm = adminUser.permissions[item.module];
      if (modPerm !== undefined) {
        return !!modPerm.can_view;
      }
    }

    // Fallback role check
    if (role === 'MANAGER') {
      return item.roles.includes('MANAGER') || item.roles.length > 0;
    }

    return item.roles.includes(role);
  };

  const navGroups = [
    {
      title: 'MAIN',
      items: [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, module: 'dashboard', roles: ['MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER'] },
        { name: 'Products', path: '/admin/products', icon: ShoppingBag, module: 'products', roles: ['MANAGER', 'PHARMACY_MANAGER'] },
        { name: 'Categories', path: '/admin/categories', icon: FolderTree, module: 'categories', roles: ['MANAGER', 'PHARMACY_MANAGER'] },
        { name: 'Brands', path: '/admin/brands', icon: Tag, module: 'brands', roles: ['MANAGER', 'PHARMACY_MANAGER'] },
        { name: 'Inventory', path: '/admin/inventory', icon: Box, module: 'inventory', roles: ['MANAGER', 'PHARMACY_MANAGER'] },
        { name: 'Orders', path: '/admin/orders', icon: ShoppingCart, module: 'orders', badge: badges.orders, roles: ['MANAGER', 'ORDER_MANAGER'] },
        { name: 'Prescriptions', path: '/admin/prescriptions', icon: Pill, module: 'prescriptions', badge: badges.prescriptions, roles: ['MANAGER', 'PHARMACY_MANAGER'] },
        { name: 'Customers', path: '/admin/customers', icon: Users, module: 'customers', roles: ['MANAGER', 'ORDER_MANAGER'] },
        { name: 'Coupons', path: '/admin/coupons', icon: Ticket, module: 'coupons', roles: ['MANAGER', 'ORDER_MANAGER', 'PHARMACY_MANAGER'] },
        { name: 'Banners', path: '/admin/banners', icon: Image, module: 'banners', roles: ['MANAGER', 'CONTENT_MANAGER'] },
        { name: 'Blog', path: '/admin/blog', icon: FileText, module: 'blog', roles: ['MANAGER', 'CONTENT_MANAGER'] },
        { name: 'Reviews', path: '/admin/reviews', icon: Star, module: 'reviews', badge: badges.reviews, roles: ['MANAGER', 'CONTENT_MANAGER'] },
        { name: 'Reports', path: '/admin/reports', icon: BarChart2, module: 'reports', roles: ['MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER'] },
        { name: 'Notifications', path: '/admin/notifications', icon: Bell, module: 'notifications', badge: badges.notifications, roles: ['MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER'] },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Managers', path: '/admin/managers', icon: Users, module: 'managers', roles: [] }, // Only SUPER_ADMIN and ADMIN
        { name: 'Settings', path: '/admin/settings', icon: Settings, module: 'settings', roles: [] }, // Only SUPER_ADMIN and ADMIN
        { name: 'Admin Profile', path: '/admin/profile', icon: UserCircle, module: 'profile', roles: ['MANAGER', 'PHARMACY_MANAGER', 'ORDER_MANAGER', 'CONTENT_MANAGER'] },
      ]
    }
  ];

  const renderNavGroup = (group) => {
    // Filter items based on role and permissions
    const allowedItems = group.items.filter(item => hasPermission(item));
    
    if (allowedItems.length === 0) return null;

    return (
      <div className="nav-group" key={group.title}>
        {!isCollapsed && <div className="nav-group-title">{group.title}</div>}
        <ul>
          {allowedItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name} title={isCollapsed ? item.name : ''}>
                <NavLink 
                  to={item.path} 
                  end={item.path === '/admin'}
                  className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <div className="nav-link-content">
                    <Icon size={20} className="nav-icon" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {item.badge > 0 && !isCollapsed && (
                    <span className="sidebar-badge badge-animate">{item.badge}</span>
                  )}
                  {item.badge > 0 && isCollapsed && (
                    <span className="sidebar-badge-dot"></span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <>
      <aside className={`admin-sidebar ${isMobileOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="brand-logo">
            <div className="brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            {!isCollapsed && (
              <div className="brand-text">
                <span className="brand-primary">Medicare</span>
                <span className="brand-secondary">PLUS ADMIN</span>
              </div>
            )}
          </div>
          
          {/* Mobile close button */}
          <button className="mobile-close-btn" onClick={() => setIsMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <div className="admin-sidebar-scroll-area">
          <div className="admin-sidebar-nav">
            {navGroups.map(group => renderNavGroup(group))}
          </div>
        </div>

        <div className="admin-sidebar-footer">
          <button className="collapse-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          
          <button className="logout-btn" onClick={() => setShowLogoutModal(true)} title={isCollapsed ? "Logout" : ""}>
            <LogOut size={20} className="nav-icon" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout of the admin portal?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
