import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Award, CheckCircle2, ChevronRight, Activity, Heart, Users } from 'lucide-react';
import './About.css';

export default function About() {
  return (
    <div className="about-page">
      
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <div className="breadcrumbs mb-20 text-white" style={{ opacity: 0.8 }}>
            <Link to="/" style={{ color: 'white' }}>Home</Link>
            <ChevronRight size={14} />
            <span>About Us</span>
          </div>
          <h1 className="hero-title">Your Trusted Partner in Health & Wellness</h1>
          <p className="hero-subtitle">
            We are dedicated to providing high-quality healthcare products, reliable services, and expert guidance to help you live your healthiest life.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="about-stats section-padding">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><Package size={30} /></div>
              <h2>10K+</h2>
              <p>Products Available</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Users size={30} /></div>
              <h2>50K+</h2>
              <p>Happy Customers</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Activity size={30} /></div>
              <h2>24/7</h2>
              <p>Customer Support</p>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Heart size={30} /></div>
              <h2>100%</h2>
              <p>Quality Guaranteed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Two Column Info Section */}
      <section className="about-info-split section-padding bg-light">
        <div className="container">
          <div className="info-grid">
            <div className="info-content">
              <span className="badge-primary mb-15">Who We Are</span>
              <h2 className="mb-20">Committed to Excellence in Healthcare Delivery</h2>
              <p className="text-muted mb-20">
                Founded with a vision to make healthcare accessible to everyone, we have grown into one of the most trusted digital pharmacies. Our platform connects you with verified medicines, wellness products, and essential healthcare devices from the comfort of your home.
              </p>
              <p className="text-muted mb-30">
                We believe that health should never be compromised. That's why every product on our platform undergoes rigorous quality checks, ensuring that what reaches you is 100% genuine and safe.
              </p>
              <ul className="check-list">
                <li><CheckCircle2 className="text-primary" size={20} /> Licensed & Certified Pharmacy</li>
                <li><CheckCircle2 className="text-primary" size={20} /> Stringent Quality Control</li>
                <li><CheckCircle2 className="text-primary" size={20} /> Data Privacy & Secure Payments</li>
              </ul>
            </div>
            <div className="info-image-wrapper">
              {/* Mock Image Placeholder using CSS */}
              <div className="premium-image-placeholder">
                <div className="floating-card">
                  <ShieldCheck size={24} className="text-primary mb-10" />
                  <h4>Verified Quality</h4>
                  <p>100% Genuine Products</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-mission section-padding text-center">
        <div className="container max-w-800">
          <Heart size={50} className="text-primary mb-20 mx-auto" />
          <h2 className="mb-20">Our Mission</h2>
          <p className="lead-text text-muted">
            "To empower individuals and families by providing seamless access to reliable, affordable, and high-quality healthcare solutions, fostering a healthier and happier world."
          </p>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="about-features section-padding bg-light">
        <div className="container">
          <div className="section-header text-center mb-50">
            <h2>Why Choose Us?</h2>
            <p className="text-muted mt-10 max-w-600 mx-auto">We go above and beyond to ensure you receive the best care, products, and service possible.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><ShieldCheck size={32} /></div>
              <h3>Trusted Healthcare</h3>
              <p className="text-muted">We partner only with verified brands and authorized distributors to guarantee the authenticity of every single product.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Truck size={32} /></div>
              <h3>Fast Delivery</h3>
              <p className="text-muted">Your health can't wait. Our optimized logistics network ensures your essential medicines and products reach you rapidly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Award size={32} /></div>
              <h3>Quality Products</h3>
              <p className="text-muted">From storage to transit, we maintain strict temperature controls and quality standards to preserve product efficacy.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// Quick fallback for the Package icon missing from lucide-react import
const Package = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);
