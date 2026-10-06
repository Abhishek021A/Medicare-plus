import doctorImg from '../../assets/images/doctor-illustration.jpg';
import './Newsletter.css';

export default function Newsletter() {
  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you for subscribing!");
  };

  return (
    <section className="newsletter-section section-padding">
      <div className="container">
        <div className="newsletter-wrapper">
          <div className="newsletter-content">
            <h2>Get Healthier Together</h2>
            <p>Subscribe for wellness tips, healthcare information and exclusive offers delivered straight to your inbox.</p>
            
            <form className="newsletter-form" onSubmit={handleSubmit}>
              <input 
                type="email" 
                placeholder="Enter your email address" 
                required 
                className="newsletter-input"
              />
              <button type="submit" className="btn-primary newsletter-btn">
                SUBSCRIBE
              </button>
            </form>
            <p className="newsletter-disclaimer">We respect your privacy. No spam ever.</p>
          </div>
          
          <div className="newsletter-image">
            <img src={doctorImg} alt="Healthcare Professional" />
          </div>
        </div>
      </div>
    </section>
  );
}
