import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar/AdminSidebar';
import AdminHeader from '../components/AdminHeader/AdminHeader';
import './AdminLayout.css';

export default function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Authentication check
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    if (!adminToken || !adminUser) {
      navigate('/admin/login', { state: { from: location.pathname } });
    }
  }, [navigate, location.pathname]);

  // Close mobile drawer on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className={`admin-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="admin-sidebar-overlay" 
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}
      
      <AdminSidebar 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      
      <div className="admin-main">
        <AdminHeader toggleSidebar={() => setIsMobileOpen(!isMobileOpen)} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
