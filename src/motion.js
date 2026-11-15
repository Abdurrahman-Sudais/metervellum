// MeterVellum motion: the meter's digits roll up to the reading, location bars fill like gauges, and bill
// stubs tear in. Nothing moves when reduced motion is requested.
export function startMotion() {
  if (typeof window === 'undefined' || window.__mvMotion) return;
  window.__mvMotion = true;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof IntersectionObserver === 'undefined') return;
  document.documentElement.classList.add('mv-js');
  const els = [...document.querySelectorAll('[data-read]')];
  const show = (el) => el.classList.add('in');
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), {rootMargin: '0px 0px -6% 0px', threshold: 0.1});
  els.forEach((el, i) => { el.style.setProperty('--d', `${(i % 5) * 80}ms`); io.observe(el); });
  let t = 0;
  addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(() => els.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) show(el); }), 150); }, {passive: true});
}
