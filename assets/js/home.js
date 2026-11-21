/**
 * 홈 페이지 — 신상품 목록과 뉴스레터 폼
 */
(function () {
  'use strict';

  const AP = window.AP;
  if (!AP) return;

  // 홈에 보여 줄 신상품 (이 순서대로, 없는 id는 건너뜀)
  const FEATURED_IDS = ['AP-001', 'AP-005', 'AP-002', 'AP-003'];
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const newList = document.querySelector('[data-product-list="new"]');
  if (newList) {
    const featured = FEATURED_IDS.map((id) => AP.productById.get(id)).filter(Boolean);
    AP.renderProductList(newList, featured);
  }

  // 뉴스레터: 형식만 검사하고 실제로는 어디에도 보내거나 저장하지 않음 (데모)
  const form = document.querySelector('[data-newsletter]');
  if (!form) return;

  const input = form.querySelector('input[type="email"]');
  const errorMessage = document.querySelector('[data-newsletter-error]');
  const doneMessage = document.querySelector('[data-newsletter-done]');
  if (!input || !errorMessage || !doneMessage) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const isValid = EMAIL_PATTERN.test(input.value.trim());
    errorMessage.hidden = isValid;
    doneMessage.hidden = !isValid;
    if (isValid) {
      input.removeAttribute('aria-invalid');
      form.reset();
    } else {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
  });

  input.addEventListener('input', () => {
    errorMessage.hidden = true;
    doneMessage.hidden = true;
    input.removeAttribute('aria-invalid');
  });
})();
