/* ============================================================
   CARD VAULT — Shared JS
   ============================================================ */

/* ── Scroll-triggered animations ────────────────────────────── */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.anim').forEach((el) => observer.observe(el));

/* ── Nav scroll state ────────────────────────────────────────── */
const nav = document.querySelector('nav');
if (nav) {
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Mobile nav toggle ───────────────────────────────────────── */
const mobileToggle = document.querySelector('.nav-mobile-toggle');
const navLinks = document.querySelector('.nav-links');
if (mobileToggle && navLinks) {
  mobileToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('mobile-open');
    mobileToggle.setAttribute('aria-expanded', open);
  });
}

/* ── Smooth scroll for anchor links ─────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks?.classList.remove('mobile-open');
    }
  });
});

/* ── Animated stat counters ──────────────────────────────────── */
function animateCounter(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1600;
  const start = performance.now();

  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        counterObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll('[data-count]').forEach((el) =>
  counterObserver.observe(el)
);

/* ── Screenshot carousel (mobile only) ──────────────────────── */
function initScreenshotCarousel() {
  if (window.innerWidth > 768) return;

  const row = document.querySelector('.phones-row');
  if (!row) return;

  const scenes = Array.from(row.querySelectorAll('.phone-scene'));
  const PEEK = 36; // must match scroll-padding-left in CSS

  // Returns the scrollLeft that snaps a given scene into view
  const snapLeft = (scene) => scene.offsetLeft - PEEK;

  // Build dot indicators and insert after the row
  const dotsWrap = document.createElement('div');
  dotsWrap.className = 'carousel-dots';
  scenes.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === 1 ? ' active' : '');
    dot.addEventListener('click', () => {
      row.scrollTo({ left: snapLeft(scenes[i]), behavior: 'smooth' });
    });
    dotsWrap.appendChild(dot);
  });
  row.parentNode.insertBefore(dotsWrap, row.nextSibling);

  const dots = Array.from(dotsWrap.querySelectorAll('.carousel-dot'));

  // Jump to slide 1 (Home screen) instantly — no animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      row.scrollLeft = snapLeft(scenes[1]);
    });
  });

  // Update active dot as user scrolls
  let scrollTimer;
  let currentIdx = 1;

  const getActiveIdx = () => {
    let activeIdx = 0, minDist = Infinity;
    scenes.forEach((scene, i) => {
      const dist = Math.abs(snapLeft(scene) - row.scrollLeft);
      if (dist < minDist) { minDist = dist; activeIdx = i; }
    });
    return activeIdx;
  };

  row.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      currentIdx = getActiveIdx();
      dots.forEach((d, i) => d.classList.toggle('active', i === currentIdx));
    }, 50);
  }, { passive: true });

  // Auto-advance
  let autoTimer;
  let paused = false;

  const advance = () => {
    if (paused) return;
    currentIdx = (currentIdx + 1) % scenes.length;
    row.scrollTo({ left: snapLeft(scenes[currentIdx]), behavior: 'smooth' });
    dots.forEach((d, i) => d.classList.toggle('active', i === currentIdx));
  };

  const startAuto = () => { autoTimer = setInterval(advance, 3000); };
  const stopAuto = () => clearInterval(autoTimer);

  const pauseAuto = () => {
    paused = true;
    stopAuto();
  };
  const resumeAuto = () => {
    paused = false;
    stopAuto();
    startAuto();
  };

  row.addEventListener('touchstart', pauseAuto, { passive: true });
  row.addEventListener('touchend', () => setTimeout(resumeAuto, 2500), { passive: true });

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopAuto() : startAuto();
  });

  startAuto();
}

initScreenshotCarousel();
