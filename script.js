// Ripple Effect
(function attachRipples(sel = '[data-ripple], .btn') {
  document.querySelectorAll(sel).forEach(btn => {
    btn.addEventListener('click', function (e) {
      // Create ripple element
      const r = document.createElement('span');
      
      // Base styles
      r.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,.35) 0, rgba(255,255,255,.15) 40%, transparent 70%);
        transform: scale(0);
        animation: rip .6s ease-out;
        pointer-events: none;
        mix-blend-mode: screen;
      `;
      
      // Calculate size and position
      const rect = this.getBoundingClientRect();
      const d = Math.max(rect.width, rect.height);
      r.style.width = r.style.height = d + 'px';
      r.style.left = (e.clientX - rect.left - d / 2) + 'px';
      r.style.top = (e.clientY - rect.top - d / 2) + 'px';
      
      // Append and self-destruct
      this.appendChild(r);
      setTimeout(() => r.remove(), 600);
    });
  });

  // Add keyframe animation to the document
  const style = document.createElement('style');
  style.innerHTML = `@keyframes rip { to { transform: scale(4); opacity: 0; } }`;
  document.head.appendChild(style);
})();

// Global Toast Function
window.toast = function (msg, ms = 2200) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast glass';
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.opacity = .0;
    t.style.transform = 'translateY(12px)';
    setTimeout(() => t.remove(), 300);
  }, ms);
};

// Modal Handling
document.addEventListener('click', e => {
  // Open modal
  const openBtn = e.target.closest('.js-open-modal');
  if (openBtn) {
    e.preventDefault();
    const modal = document.querySelector(openBtn.dataset.target);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  }

  // Close modal via button or clicking the backdrop
  const closeBtn = e.target.closest('.js-modal-close');
  const modalBackdrop = e.target.classList.contains('modal');
  if (closeBtn || modalBackdrop) {
    e.preventDefault();
    const modal = closeBtn ? closeBtn.closest('.modal') : e.target;
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = ''; // Restore scrolling
    }
  }
});