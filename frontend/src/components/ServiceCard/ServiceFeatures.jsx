import { HeartPulse, TestTube, Stethoscope, Store, Pill } from 'lucide-react';
import './ServiceFeatures.css';

const services = [
  { icon: <HeartPulse size={24} />, title: 'Healthcare', desc: 'Quality products' },
  { icon: <TestTube size={24} />, title: 'Lab Tests', desc: 'Trusted diagnostics' },
  { icon: <Stethoscope size={24} />, title: 'Consultation', desc: 'Quick consultation' },
  { icon: <Store size={24} />, title: 'Local Pharmacy', desc: 'Fast delivery' },
  { icon: <Pill size={24} />, title: 'Medicine', desc: 'Reliable healthcare' },
];

export default function ServiceFeatures() {
  return (
    <section className="service-features" style={{ padding: '40px 0', backgroundColor: 'var(--background)' }}>
      <div className="container">
        <div className="service-features-grid">
          {services.map((service, idx) => (
            <div key={idx} className="service-card">
              <div className="service-icon-wrapper">
                {service.icon}
              </div>
              <div>
                <h4 className="service-title">{service.title}</h4>
                <p className="service-desc">{service.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
