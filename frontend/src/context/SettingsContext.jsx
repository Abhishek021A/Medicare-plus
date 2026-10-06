import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { SITE_CONFIG } from '../utils/constants';
import { Wrench, Clock, ShieldCheck, Mail, Phone } from 'lucide-react';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const location = useLocation();
  const [settings, setSettings] = useState({
    store_name: SITE_CONFIG.name,
    store_tagline: SITE_CONFIG.tagline,
    store_description: 'Medicare PLUS is a certified healthcare and pharmacy platform.',
    store_phone: SITE_CONFIG.phone,
    support_phone: SITE_CONFIG.phone,
    store_email: SITE_CONFIG.supportEmail,
    support_email: SITE_CONFIG.supportEmail,
    business_address: SITE_CONFIG.address,
    social_instagram: SITE_CONFIG.socialLinks.instagram,
    social_facebook: SITE_CONFIG.socialLinks.facebook,
    social_x: SITE_CONFIG.socialLinks.x,
    social_linkedin: 'https://linkedin.com/company/medicareplus',
    social_youtube: 'https://youtube.com/@medicareplus',
    delivery_charge: 50,
    free_delivery_above: 499,
    min_order_amount: 50,
    max_order_amount: 50000,
    enable_cod: true,
    enable_online_payment: true,
    enable_razorpay: true,
    razorpay_key_id: 'rzp_test_medicareplus123',
    maintenance_mode: false,
    maintenance_message: "We'll be back shortly. Our store is currently undergoing scheduled maintenance. Please check back soon.",
    maintenance_estimated_end: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchPublicSettings = useCallback(async () => {
    try {
      const response = await api.getPublicSettings();
      if (response && response.success && response.data) {
        setSettings(prev => ({
          ...prev,
          ...response.data
        }));
      }
    } catch (err) {
      console.warn('Could not fetch public settings, using defaults:', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicSettings();

    const handleSync = () => fetchPublicSettings();
    window.addEventListener('medicare_settings_updated', handleSync);
    return () => window.removeEventListener('medicare_settings_updated', handleSync);
  }, [fetchPublicSettings]);

  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  // If maintenance mode is active and user is on a customer route, show Maintenance Page
  if (settings.maintenance_mode && !isAdminRoute) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFB',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          maxWidth: '560px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: '#E6F7F5',
            color: '#087F73',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <Wrench size={32} />
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1E293B', margin: '0 0 12px' }}>
            Medicare <span style={{ color: '#087F73' }}>PLUS</span>
          </h1>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#334155', margin: '0 0 12px' }}>
            We'll be back shortly
          </h2>

          <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, margin: '0 0 24px' }}>
            {settings.maintenance_message}
          </p>

          {settings.maintenance_estimated_end && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F1F5F9',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '24px'
            }}>
              <Clock size={16} />
              Estimated return: {settings.maintenance_estimated_end}
            </div>
          )}

          <div style={{
            borderTop: '1px solid #E2E8F0',
            paddingTop: '20px',
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            fontSize: '13px',
            color: '#64748B'
          }}>
            {settings.support_email && (
              <a href={`mailto:${settings.support_email}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#087F73', textDecoration: 'none' }}>
                <Mail size={15} /> {settings.support_email}
              </a>
            )}
            {settings.support_phone && (
              <a href={`tel:${settings.support_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#087F73', textDecoration: 'none' }}>
                <Phone size={15} /> {settings.support_phone}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refreshSettings: fetchPublicSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
