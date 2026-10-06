import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './PrivacyPolicy.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page section-padding">
      <div className="container max-w-800">
        
        {/* Breadcrumbs */}
        <div className="breadcrumbs text-muted mb-30">
          <Link to="/">Home</Link>
          <ChevronRight size={14} />
          <span>Privacy Policy</span>
        </div>

        <div className="legal-header mb-40">
          <h1 className="page-title">Privacy Policy</h1>
          <p className="text-muted mt-10">Last updated: September 11, 2026</p>
        </div>

        <div className="legal-content">
          <p>
            This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from our platform.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            When you visit the site, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device.
          </p>
          <p>
            Additionally, when you make a purchase or attempt to make a purchase through the site, we collect certain information from you, including your name, billing address, shipping address, payment information, email address, phone number, and medical prescriptions (if applicable). We refer to this information as "Order Information".
          </p>

          <h2>2. How Do We Use Your Personal Information?</h2>
          <p>
            We use the Order Information that we collect generally to fulfill any orders placed through the site (including processing your payment information, arranging for shipping, validating medical prescriptions, and providing you with invoices and/or order confirmations).
          </p>
          <ul>
            <li>Communicate with you regarding your order.</li>
            <li>Screen our orders for potential risk or fraud.</li>
            <li>When in line with the preferences you have shared with us, provide you with information or advertising relating to our products or services.</li>
          </ul>

          <h2>3. Sharing Your Personal Information</h2>
          <p>
            We share your Personal Information with third parties to help us use your Personal Information, as described above. We use standard secure payment gateways which may collect your payment data. We may also share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.
          </p>

          <h2>4. Data Retention</h2>
          <p>
            When you place an order through the site, we will maintain your Order Information and Prescription Data for our records unless and until you ask us to delete this information, as required by medical compliance laws.
          </p>

          <h2>5. Your Rights</h2>
          <p>
            If you are a resident of certain jurisdictions, you have the right to access personal information we hold about you and to ask that your personal information be corrected, updated, or deleted. If you would like to exercise this right, please contact us through the contact information below.
          </p>

          <h2>6. Changes</h2>
          <p>
            We may update this privacy policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal or regulatory reasons.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at <a href="mailto:privacy@pharmacystore.com">privacy@pharmacystore.com</a> or by mail using the details provided below:
          </p>
          <address className="mt-15">
            <strong>Pharmacy Store Privacy Team</strong><br />
            123 Health Avenue, Medical District<br />
            Mumbai, Maharashtra 400001, India
          </address>
        </div>

      </div>
    </div>
  );
}
