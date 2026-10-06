import { useEffect, useRef } from 'react';

/**
 * Custom hook to apply Intersection Observer to DOM elements.
 * Adds the 'is-revealed' class when the element enters the viewport.
 * 
 * Usage:
 * const revealRef = useScrollReveal();
 * <div ref={revealRef} className="reveal-on-scroll">Content</div>
 */
export default function useScrollReveal(options = { threshold: 0.1, triggerOnce: true }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    
    // Fallback if IntersectionObserver is not supported
    if (!('IntersectionObserver' in window)) {
      if (element) element.classList.add('is-revealed');
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        if (options.triggerOnce) {
          observer.unobserve(entry.target);
        }
      } else if (!options.triggerOnce) {
        entry.target.classList.remove('is-revealed');
      }
    }, options);

    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [options.threshold, options.triggerOnce]);

  return ref;
}
