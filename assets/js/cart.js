/**
 * 장바구니 페이지 — 담긴 상품 목록, 수량 변경·삭제, 합계와 배송비 계산
 */
(function () {
  'use strict';

  const AP = window.AP;
  if (!AP) return;

  const esc = AP.escapeHtml;
  const pick = (selector) => document.querySelector(selector);
  const el = {
    filled: pick('[data-cart-filled]'),
    empty: pick('[data-cart-empty]'),
    list: pick('[data-cart-list]'),
    summary: pick('[data-cart-summary]'),
    subtotal: pick('[data-cart-subtotal]'),
    shipping: pick('[data-cart-shipping]'),
    total: pick('[data-cart-total]'),
    needMore: pick('[data-cart-need-more]'),
    remaining: pick('[data-cart-remaining]'),
    progress: pick('[data-cart-progress]'),
    free: pick('[data-cart-free]'),
    checkout: pick('[data-checkout]'),
    checkoutMessage: pick('[data-checkout-message]'),
    live: pick('[data-cart-live]'),
    title: pick('#cart-title')
  };
  if (!el.list || !el.filled || !el.empty) return;

  const MINUS_ICON = '<svg class="icon icon--small" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12 H19"/></svg>';
  const PLUS_ICON = '<svg class="icon icon--small" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5 V19 M5 12 H19"/></svg>';

  function findLine(items, key) {
    return items.find((item) => AP.makeLineKey(item.productId, item.colorId, item.size) === key);
  }

  function lineHtml(item) {
    const product = AP.productById.get(item.productId);
    if (!product) return '';
    const color = AP.getColor(product, item.colorId);
    const key = esc(AP.makeLineKey(item.productId, item.colorId, item.size));
    const name = esc(product.name);
    const url = AP.productUrl(product.id);
    return `<li class="cart-item" data-line="${key}">`
      + `<a class="cart-item__media" href="${url}" tabindex="-1" aria-hidden="true">${AP.garmentSvg(product, color, { strokeWidth: 1.4 })}</a>`
      + '<div class="cart-item__body">'
      + `<div class="cart-item__top"><a class="cart-item__name" href="${url}">${name}</a>`
      + `<span class="cart-item__total">${AP.formatPrice(product.price * item.qty)}</span></div>`
      + `<span class="cart-item__meta">${esc(color.name)} / ${esc(item.size)}</span>`
      + `<span class="cart-item__meta">개당 ${AP.formatPrice(product.price)}</span>`
      + '<div class="cart-item__bottom">'
      + `<div class="qty-stepper" role="group" aria-label="${name} 수량">`
      + `<button type="button" data-action="decrease" data-key="${key}" aria-label="수량 줄이기"${item.qty <= 1 ? ' disabled' : ''}>${MINUS_ICON}</button>`
      + `<span class="qty-stepper__value">${item.qty}</span>`
      + `<button type="button" data-action="increase" data-key="${key}" aria-label="수량 늘리기"${item.qty >= AP.MAX_QTY_PER_ITEM ? ' disabled' : ''}>${PLUS_ICON}</button>`
      + '</div>'
      + `<button type="button" class="text-button" data-action="remove" data-key="${key}" aria-label="${name} 삭제">삭제</button>`
      + '</div></div></li>';
  }

  function render() {
    const items = AP.readCart();
    const isEmpty = items.length === 0;
    el.filled.hidden = isEmpty;
    el.empty.hidden = !isEmpty;
    if (el.summary) el.summary.textContent = `${items.length}개 상품`;
    if (isEmpty) {
      el.list.innerHTML = '';
      return;
    }

    el.list.innerHTML = items.map(lineHtml).join('');

    const totals = AP.getCartTotals(items);
    el.subtotal.textContent = AP.formatPrice(totals.subtotal);
    el.shipping.textContent = totals.shipping === 0 ? '무료' : AP.formatPrice(totals.shipping);
    el.total.textContent = AP.formatPrice(totals.total);

    const needsMore = totals.remainingForFree > 0;
    el.needMore.hidden = !needsMore;
    el.free.hidden = needsMore;
    el.remaining.textContent = AP.formatPrice(totals.remainingForFree);
    const progress = Math.min(100, Math.round((totals.subtotal / AP.FREE_SHIPPING_MIN) * 100));
    el.progress.style.width = `${progress}%`;
  }

  // 스크린리더에 변경 내용을 알려 줌 (같은 문구가 반복돼도 다시 읽히도록 비운 뒤 채움)
  function announce(message) {
    if (!el.live) return;
    el.live.textContent = '';
    window.requestAnimationFrame(() => {
      el.live.textContent = message;
    });
  }

  // 목록을 다시 그리면 누른 버튼이 사라지므로, 포커스를 같은 자리(또는 대신할 곳)로 돌려놓음
  function restoreFocus(action, key) {
    const line = el.list.querySelector(`[data-line="${CSS.escape(key)}"]`);
    if (!line) {
      const fallback = el.list.querySelector('.cart-item__name') || el.title;
      if (fallback) fallback.focus();
      return;
    }
    const sameButton = line.querySelector(`[data-action="${action}"]`);
    const target = sameButton && !sameButton.disabled
      ? sameButton
      : line.querySelector('[data-action]:not(:disabled)');
    if (target) target.focus();
  }

  el.list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const { action, key } = button.dataset;
    const before = findLine(AP.readCart(), key);
    if (!before) return;
    const product = AP.productById.get(before.productId);

    if (action === 'increase') AP.changeQuantity(key, 1);
    else if (action === 'decrease') AP.changeQuantity(key, -1);
    else if (action === 'remove') AP.removeFromCart(key);
    else return;

    // 이 시점엔 cart:change 이벤트로 목록이 이미 다시 그려져 있음
    const after = findLine(AP.readCart(), key);
    announce(action === 'remove'
      ? `장바구니에서 ${product.name} 상품을 뺐어요.`
      : `${product.name} 수량 ${after ? after.qty : before.qty}개`);
    restoreFocus(action, key);
  });

  if (el.checkout && el.checkoutMessage) {
    // 데모 사이트: 실제 결제 대신 안내 문구만 보여 줌
    el.checkout.addEventListener('click', () => {
      el.checkoutMessage.hidden = false;
    });
  }

  document.addEventListener('cart:change', render);
  render();
})();
