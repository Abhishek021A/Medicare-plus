import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './PrivacyPolicy.css'; // Reusing the identical legal document styling

export default function Terms() {
  return (
    <div className="legal-page section-padding">
      <div className="container max-w-800">
        
        {/* Breadcrumbs */}
        <div className="breadcrumbs text-muted mb-30">
          <Link to="/">Home</Link>
          <ChevronRight size={14} />
          <span>Terms & Conditions</span>
        </div>

        <div className="legal-header mb-40">
          <h1 className="page-title">Terms & Conditions</h1>
          <p className="text-muted mt-10">Last updated: September 11, 2026</p>
        </div>

        <div className="legal-content">
          <p>
            Welcome to Pharmacy Store. These Terms & Conditions govern your use of our website and services. By accessing or using our platform, you agree to be bound by these terms.
          </p>

          <h2>1. Use of the Website</h2>
          <p>
            By accessing this website, you warrant and represent to the website owner that you are legally entitled to do so and to make use of information made available via the website. You must be at least 18 years of age to purchase prescription medications through our platform.
          </p>

          <h2>2. Medical Disclaimer</h2>
          <p>
            The content provided on this website, including articles, product descriptions, and advice, is for informational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>

          <h2>3. Prescription Policy</h2>
          <p>
            Certain medications require a valid prescription from a registered medical practitioner. We strictly adhere to local and national laws regarding the dispensing of prescription drugs. 
          </p>
          <ul>
            <li>You must upload a clear, legible copy of your valid prescription when adding restricted items to your cart.</li>
            <li>Our licensed pharmacists reserve the right to reject any prescription that appears fraudulent, expired, or invalid.</li>
            <li>The original prescription must be presented at the time of delivery if requested.</li>
          </ul>

          <h2>4. Pricing and Availability</h2>
          <p>
            All prices are subject to change without notice. We make every effort to ensure that the pricing displayed on our website is accurate. However, in the event of a pricing error, we reserve the right to cancel any orders placed for the item at the incorrect price.
          </p>

          <h2>5. Returns and Refunds</h2>
          <p>
            Due to the nature of medical products, we cannot accept returns on prescription medications once they have been dispatched. For over-the-counter products, returns are accepted within 7 days of delivery, provided the items are unopened and in their original packaging.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            Pharmacy Store shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services or products.
          </p>

          <h2>7. Contact Information</h2>
          <p>
            If you have any questions or concerns regarding these Terms & Conditions, please contact our legal team:
          </p>
          <address className="mt-15">
            <strong>Legal Department</strong><br />
            123 Health Avenue, Medical District<br />
            Mumbai, Maharashtra 400001, India<br />
            Email: <a href="mailto:legal@pharmacystore.com">legal@pharmacystore.com</a>
          </address>
        </div>

      </div>
    </div>
  );
}
