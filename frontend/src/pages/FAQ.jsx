import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import './Faq.css';

const FAQ_DATA = [
  {
    id: 1,
    question: "How do I order medicine?",
    answer: "You can easily order medicine by browsing our categories or using the search bar. Once you find the product, click 'Add to Cart'. If the medicine requires a prescription, you will be prompted to upload it during checkout. Finally, enter your delivery details and choose your payment method."
  },
  {
    id: 2,
    question: "How long does delivery take?",
    answer: "Standard delivery typically takes 24-48 hours within major cities and 3-5 business days for other locations. We also offer an express delivery option for urgent needs in select zip codes."
  },
  {
    id: 3,
    question: "Can I cancel an order?",
    answer: "Yes, you can cancel your order at any time before it is marked as 'Shipped'. Go to 'My Account' > 'My Orders', select the order, and click the 'Cancel Order' button. If the order has already shipped, please contact our support team."
  },
  {
    id: 4,
    question: "How do I upload a prescription?",
    answer: "If you add a prescription-required medicine to your cart, a mandatory 'Prescription Upload' step will appear during checkout. You can upload a clear photo or PDF (up to 5MB). Our certified pharmacists will review and approve it before your order is processed."
  },
  {
    id: 5,
    question: "How can I track my order?",
    answer: "Once your order is dispatched, you will receive a tracking link via email and SMS. You can also view real-time tracking updates by logging into your account and visiting the 'My Orders' section."
  },
  {
    id: 6,
    question: "How do I apply a coupon?",
    answer: "You can apply a coupon code on the Cart page or during Checkout. Simply enter your code (e.g., MED10) into the 'Coupon Code' input box and click 'Apply'. The discount will instantly be reflected in your order summary."
  }
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0); // First item open by default

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <div className="faq-page">
      
      {/* Header */}
      <div className="page-header-bg">
        <div className="container">
          <div className="breadcrumbs text-muted mb-10">
            <Link to="/">Home</Link>
            <ChevronRight size={14} />
            <span>FAQ</span>
          </div>
          <h1 className="page-title">Frequently Asked Questions</h1>
          <p className="text-muted mt-10 max-w-600">
            Find answers to the most common questions about our products, shipping, prescriptions, and more.
          </p>
        </div>
      </div>

      <div className="container section-padding">
        <div className="faq-layout">
          
          <div className="faq-sidebar desktop-only">
            <div className="support-card">
              <div className="icon-wrapper mb-15">
                <HelpCircle size={40} className="text-primary" />
              </div>
              <h3>Still need help?</h3>
              <p className="text-muted mb-20">If you couldn't find the answer to your question, our support team is available 24/7.</p>
              <Link to="/contact" className="btn-primary" style={{display: 'inline-block', width: '100%', textAlign: 'center'}}>Contact Support</Link>
            </div>
          </div>

          <div className="faq-content">
            <div className="accordion-container">
              {FAQ_DATA.map((faq, index) => {
                const isOpen = openIndex === index;
                
                return (
                  <div key={faq.id} className={`accordion-item ${isOpen ? 'open' : ''}`}>
                    <button 
                      className="accordion-header" 
                      onClick={() => toggleAccordion(index)}
                      aria-expanded={isOpen}
                    >
                      <span className="question-text">{faq.question}</span>
                      <ChevronDown 
                        size={20} 
                        className={`accordion-icon ${isOpen ? 'rotated' : ''}`} 
                      />
                    </button>
                    
                    <div 
                      className="accordion-collapse"
                      style={{ height: isOpen ? 'auto' : '0' }}
                    >
                      <div className="accordion-body">
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mobile-only mt-40 text-center">
              <h3 className="mb-10">Still need help?</h3>
              <Link to="/contact" className="btn-outline">Contact Support</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
