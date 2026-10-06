import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, ChevronRight, Send } from 'lucide-react';
import GoogleMap from '../components/GoogleMap/GoogleMap';
import './Contact.css';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Message sent:", formData);
    alert("Thank you! Your message has been sent successfully. We will get back to you soon.");
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="contact-page">
      
      {/* Page Header */}
      <div className="page-header-bg">
        <div className="container">
          <div className="breadcrumbs text-muted mb-10">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <span>Contact Us</span>
          </div>
          <h1 className="page-title">Get In Touch</h1>
          <p className="text-muted mt-10 max-w-600">
            Have questions about our products, your order, or need health advice? Our team is here to help you 24/7.
          </p>
        </div>
      </div>

      <div className="container section-padding">
        <div className="contact-layout">
          
          {/* Left: Contact Information */}
          <div className="contact-info-column">
            <h2>Contact Information</h2>
            <p className="text-muted mb-40">Fill out the form and our team will get back to you within 24 hours.</p>
            
            <div className="info-item">
              <div className="info-icon">
                <MapPin size={24} />
              </div>
              <div className="info-content">
                <h3>Our Location</h3>
                <p>123 Health Avenue, Medical District<br />Mumbai, Maharashtra 400001, India</p>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon">
                <Phone size={24} />
              </div>
              <div className="info-content">
                <h3>Phone Number</h3>
                <p>+91 98765 43210<br />+91 1800 123 4567 (Toll Free)</p>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon">
                <Mail size={24} />
              </div>
              <div className="info-content">
                <h3>Email Address</h3>
                <p>support@pharmacystore.com<br />info@pharmacystore.com</p>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon">
                <Clock size={24} />
              </div>
              <div className="info-content">
                <h3>Working Hours</h3>
                <p>Monday - Saturday: 8:00 AM - 10:00 PM<br />Sunday: 9:00 AM - 8:00 PM</p>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="contact-form-column">
            <div className="contact-card">
              <h2 className="mb-30">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="contact-form">
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Your Name *</label>
                    <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="Enter your full name" />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} placeholder="yourname@domain.com" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group">
                    <label>Subject *</label>
                    <input type="text" name="subject" required value={formData.subject} onChange={handleInputChange} placeholder="How can we help?" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Your Message *</label>
                  <textarea name="message" required value={formData.message} onChange={handleInputChange} placeholder="Write your message here..." rows="5"></textarea>
                </div>

                <button type="submit" className="btn-primary mt-10" style={{width: '100%', justifyContent: 'center'}}>
                  <Send size={18} className="mr-10" /> SEND MESSAGE
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* Map Section */}
        <div className="map-section mt-60 mb-60">
          <GoogleMap />
        </div>

      </div>
    </div>
  );
}
