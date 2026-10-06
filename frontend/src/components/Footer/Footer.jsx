import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react';
import { FaInstagram, FaFacebookF, FaXTwitter, FaLinkedinIn, FaYoutube } from 'react-icons/fa6';
import { useSettings } from '../../context/SettingsContext';
import { SITE_CONFIG } from '../../utils/constants';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { settings } = useSettings();

  const storeName = settings?.store_name || 'Medicare PLUS';
  const storeTagline = settings?.store_tagline || settings?.store_description || SITE_CONFIG.tagline;
  const supportPhone = settings?.support_phone || settings?.store_phone || SITE_CONFIG.phone;
  const supportEmail = settings?.support_email || settings?.store_email || SITE_CONFIG.supportEmail;
  const address = settings?.business_address || SITE_CONFIG.address;

  // Build dynamic social links only if URL is configured
  const socialLinks = [];
  if (settings?.social_instagram) {
    socialLinks.push({
      name: 'Instagram',
      ariaLabel: 'Instagram',
      title: `Follow ${storeName} on Instagram`,
      url: settings.social_instagram,
      icon: FaInstagram,
      className: 'social-instagram',
    });
  }
  if (settings?.social_facebook) {
    socialLinks.push({
      name: 'Facebook',
      ariaLabel: 'Facebook',
      title: `Follow ${storeName} on Facebook`,
      url: settings.social_facebook,
      icon: FaFacebookF,
      className: 'social-facebook',
    });
  }
  if (settings?.social_twitter) {
    socialLinks.push({
      name: 'X',
      ariaLabel: 'X',
      title: `Follow ${storeName} on X`,
      url: settings.social_twitter,
      icon: FaXTwitter,
      className: 'social-x',
    });
  }
  if (settings?.social_linkedin) {
    socialLinks.push({
      name: 'LinkedIn',
      ariaLabel: 'LinkedIn',
      title: `Follow ${storeName} on LinkedIn`,
      url: settings.social_linkedin,
      icon: FaLinkedinIn,
      className: 'social-linkedin',
    });
  }
  if (settings?.social_youtube) {
    socialLinks.push({
      name: 'YouTube',
      ariaLabel: 'YouTube',
      title: `Follow ${storeName} on YouTube`,
      url: settings.social_youtube,
      icon: FaYoutube,
      className: 'social-youtube',
    });
  }

  return (
    <footer className="footer-area" role="contentinfo">
      <div className="container footer-container">
        {/* Top Footer: Multi-column brand & navigation links */}
        <div className="footer-top">
          
          {/* Column 1: Brand & Social */}
          <div className="footer-col brand-col">
            <Link to="/" className="footer-brand-logo" aria-label={`${storeName} Home`}>
              <div className="footer-brand-icon" aria-hidden="true">
                <span className="footer-brand-cross">+</span>
              </div>
              <div className="footer-brand-text">
                <span className="footer-brand-title">Medicare</span>
                <span className="footer-brand-plus">PLUS</span>
              </div>
            </Link>

            <p className="footer-desc">
              {storeTagline}
            </p>

            {/* Social Media Links - Only rendered if link is defined */}
            {socialLinks.length > 0 && (
              <div className="footer-social-links" role="list" aria-label="Social media links">
                {socialLinks.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <a
                      key={item.name}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`footer-social-btn ${item.className}`}
                      aria-label={item.ariaLabel}
                      title={item.title}
                      role="listitem"
                    >
                      <IconComponent className="social-icon" aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Shop */}
          <div className="footer-col link-col">
            <h4 className="footer-heading">Shop</h4>
            <ul className="footer-links">
              <li><Link to="/category/medicines">Medicines</Link></li>
              <li><Link to="/category/vitamins">Vitamins & Supplements</Link></li>
              <li><Link to="/category/personal-care">Personal Care</Link></li>
              <li><Link to="/category/medical-devices">Medical Devices</Link></li>
              <li><Link to="/category/wellness">Health & Wellness</Link></li>
            </ul>
          </div>

          {/* Column 3: Customer Support */}
          <div className="footer-col link-col">
            <h4 className="footer-heading">Customer Support</h4>
            <ul className="footer-links">
              <li><Link to="/contact">Help Center</Link></li>
              <li><Link to="/shipping">Shipping Information</Link></li>
              <li><Link to="/returns">Returns & Refunds</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div className="footer-col link-col">
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/careers">Careers</Link></li>
              <li><Link to="/blog">Health Blog</Link></li>
              <li><Link to="/account/orders">Track Your Order</Link></li>
            </ul>
          </div>

          {/* Column 5: Contact Info */}
          <div className="footer-col contact-col">
            <h4 className="footer-heading">Get In Touch</h4>
            <ul className="contact-list">
              <li>
                <MapPin size={18} className="contact-icon" aria-hidden="true" />
                <span>{address}</span>
              </li>
              <li>
                <Phone size={18} className="contact-icon" aria-hidden="true" />
                <a href={`tel:${supportPhone}`} className="contact-link">
                  {supportPhone}
                </a>
              </li>
              <li>
                <Mail size={18} className="contact-icon" aria-hidden="true" />
                <a href={`mailto:${supportEmail}`} className="contact-link">
                  {supportEmail}
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Footer: Copyright & Badges */}
        <div className="footer-bottom">
          <div className="copyright">
            &copy; {currentYear} {storeName}. All rights reserved.
          </div>
          
          <div className="footer-badges">
            <div className="security-badges">
              <span className="badge-item"><ShieldCheck size={16} /> SSL Secured</span>
              <span className="badge-item"><CheckCircle2 size={16} /> Verified Pharmacy</span>
            </div>
            
            <div className="payment-icons" aria-label="Accepted payment methods">
              <div className="pay-icon" title="Credit Card"><CreditCard size={22} /></div>
              <div className="pay-icon pay-text" title="PayPal">PayPal</div>
              <div className="pay-icon pay-text" title="Google Pay">GPay</div>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
