/**
 * ANIMA PARS 공통 스크립트
 * ------------------------------------------------------------
 * 모든 페이지에서 쓰는 기능을 모아 둔 파일이에요.
 * - 헤더 메뉴·검색 패널
 * - 장바구니 저장(localStorage)과 헤더의 담긴 개수 표시
 * - 상품 카드와 옷 일러스트 그리기
 * data.js 다음, 각 페이지 스크립트보다 먼저 불러와야 합니다.
 */
(function () {
  'use strict';

  const DATA = window.ANIMA_PARS_DATA;
  if (!DATA) {
    console.error('[ANIMA PARS] data.js를 먼저 불러와야 합니다.');
    return;
  }

  const CART_STORAGE_KEY = 'anima-pars:cart:v1';
  const MAX_QTY_PER_ITEM = 10;
  const FREE_SHIPPING_MIN = 100000;
  const SHIPPING_FEE = 3000;

  // id로 상품을 바로 찾기 위한 Map — 매번 배열 전체를 훑지 않도록(O(1) 조회)
  const productById = new Map(DATA.PRODUCTS.map((product) => [product.id, product]));
  const categoryBySlug = new Map(DATA.CATEGORIES.map((category) => [category.slug, category]));

  /* ---------- 작은 도우미 ---------- */

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  // innerHTML에 들어가는 값은 모두 이스케이프해서 스크립트 삽입(XSS)을 막음
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
  }

  function formatPrice(amount) {
    return '₩' + Math.round(Number(amount) || 0).toLocaleString('ko-KR');
  }

  function productUrl(productId) {
    return 'product.html?id=' + encodeURIComponent(productId);
  }

  // 없는 색상 id가 들어오면 첫 번째 색상으로 대체
  function getColor(product, colorId) {
    return product.colors.find((color) => color.id === colorId) || product.colors[0];
  }

  // 상품이 속한 카테고리의 라틴어 동물 이름 (없으면 null)
  function getAnimal(product) {
    const category = categoryBySlug.get(product.category);
    return category && category.animal ? category.animal : null;
  }

  function hexToRgb(hex) {
    const match = /^#([0-9a-f]{6})$/i.exec(String(hex));
    if (!match) return null;
    const value = parseInt(match[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  // 두 색을 ratio(0~1)만큼 섞음 — 옷이 바래는 단계를 보여 줄 때 사용
  function mixColor(fromHex, toHex, ratio) {
    const from = hexToRgb(fromHex);
    const to = hexToRgb(toHex);
    if (!from || !to) return fromHex;
    const t = Math.min(1, Math.max(0, ratio));
    return '#' + from
      .map((channel, i) => Math.round(channel + (to[i] - channel) * t).toString(16).padStart(2, '0'))
      .join('');
  }

  // 밝은 색이면 true — 그 위에 올릴 글자를 검정/흰색 중 무엇으로 할지 정할 때 사용
  function isLightColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const [r, g, b] = rgb.map((channel) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    // 상대 휘도 0.18 부근이 검정·흰 글자의 대비가 같아지는 지점
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18;
  }

  /* ---------- 저장소: localStorage를 못 쓰면(사생활 보호 모드 등) 메모리로 대체 ---------- */

  const memoryStore = new Map();
  let isStorageUnavailable = false;

  const safeStorage = {
    get(key) {
      if (!isStorageUnavailable) {
        try {
          return window.localStorage.getItem(key);
        } catch (error) {
          isStorageUnavailable = true;
        }
      }
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    },
    set(key, value) {
      memoryStore.set(key, value);
      if (isStorageUnavailable) return;
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        // 용량 초과·차단: 이번 방문 동안은 메모리에만 저장하고 페이지는 계속 동작
        isStorageUnavailable = true;
      }
    }
  };

  /* ---------- 장바구니 ---------- */

  function makeLineKey(productId, colorId, size) {
    return [productId, colorId, size].join('|');
  }

  // 저장된 값은 깨지거나 조작될 수 있으므로, 실제로 있는 상품·옵션만 남기고 수량은 1~10으로 맞춤
  function sanitizeCart(rawItems) {
    if (!Array.isArray(rawItems)) return [];
    const lines = new Map();
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const product = productById.get(raw.productId);
      if (!product) continue;
      const hasColor = product.colors.some((color) => color.id === raw.colorId);
      const canBuySize = product.sizes.includes(raw.size) && !product.soldOut.includes(raw.size);
      const qty = Math.floor(Number(raw.qty));
      if (!hasColor || !canBuySize || !Number.isFinite(qty) || qty < 1) continue;
      // 같은 옵션이 여러 줄로 들어와 있으면 한 줄로 합침
      const key = makeLineKey(product.id, raw.colorId, raw.size);
      const previousQty = lines.has(key) ? lines.get(key).qty : 0;
      lines.set(key, {
        productId: product.id,
        colorId: raw.colorId,
        size: raw.size,
        qty: Math.min(MAX_QTY_PER_ITEM, previousQty + qty)
      });
    }
    return Array.from(lines.values());
  }

  function readCart() {
    const saved = safeStorage.get(CART_STORAGE_KEY);
    if (!saved) return [];
    try {
      return sanitizeCart(JSON.parse(saved));
    } catch (error) {
      return []; // JSON이 깨졌으면 빈 장바구니로 시작
    }
  }

  function writeCart(items) {
    const cleanItems = sanitizeCart(items);
    safeStorage.set(CART_STORAGE_KEY, JSON.stringify(cleanItems));
    document.dispatchEvent(new CustomEvent('cart:change', { detail: { items: cleanItems } }));
    return cleanItems;
  }

  function findLine(items, key) {
    return items.find((item) => makeLineKey(item.productId, item.colorId, item.size) === key);
  }

  function addToCart(productId, colorId, size) {
    const items = readCart();
    const key = makeLineKey(productId, colorId, size);
    const existing = findLine(items, key);
    if (existing && existing.qty >= MAX_QTY_PER_ITEM) return { ok: false, reason: 'max' };
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ productId, colorId, size, qty: 1 });
    }
    const saved = writeCart(items);
    // 검증을 통과하지 못한 옵션(없는 색상·품절 사이즈 등)은 저장되지 않음
    return findLine(saved, key) ? { ok: true } : { ok: false, reason: 'invalid' };
  }

  function changeQuantity(key, delta) {
    const items = readCart();
    const line = findLine(items, key);
    if (!line) return;
    line.qty = Math.min(MAX_QTY_PER_ITEM, Math.max(1, line.qty + delta));
    writeCart(items);
  }

  function removeFromCart(key) {
    writeCart(readCart().filter((item) => makeLineKey(item.productId, item.colorId, item.size) !== key));
  }

  function getCartCount(items) {
    return items.reduce((sum, item) => sum + item.qty, 0);
  }

  function getCartTotals(items) {
    const subtotal = items.reduce((sum, item) => {
      const product = productById.get(item.productId);
      return product ? sum + product.price * item.qty : sum;
    }, 0);
    const isEmpty = items.length === 0;
    // 10만 원 이상이면 무료배송, 비어 있으면 배송비 없음
    const shipping = isEmpty || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
    return {
      subtotal,
      shipping,
      total: subtotal + shipping,
      remainingForFree: Math.max(0, FREE_SHIPPING_MIN - subtotal)
    };
  }

  /* ---------- 옷 일러스트(SVG) ---------- */

  // 무늬 원단(데님 능직·체크·와플)과 질감 표현용 패턴 — 페이지마다 한 번만 넣음
  const SVG_PATTERNS = `
    <svg id="ap-svg-patterns" class="svg-defs" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="ap-twill" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="5" height="5" fill="#232D45"/><rect width="1.5" height="5" fill="#2F3B57"/>
        </pattern>
        <pattern id="ap-plaid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="#6E3A30"/>
          <rect y="10" width="30" height="9" fill="#241411" fill-opacity="0.32"/>
          <rect x="10" width="9" height="30" fill="#241411" fill-opacity="0.32"/>
          <rect y="25" width="30" height="1.4" fill="#C9A15A" fill-opacity="0.6"/>
          <rect x="25" width="1.4" height="30" fill="#C9A15A" fill-opacity="0.6"/>
        </pattern>
        <pattern id="ap-waffle" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#E6DFD1"/>
          <rect x="1" y="1" width="4" height="4" fill="none" stroke="#D2C8B5" stroke-width="0.8"/>
        </pattern>
        <pattern id="ap-weave" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#FFFFFF" fill-opacity="0.08"/>
          <rect x="3" y="3" width="3" height="3" fill="#FFFFFF" fill-opacity="0.08"/>
          <rect x="3" width="3" height="3" fill="#000000" fill-opacity="0.06"/>
          <rect y="3" width="3" height="3" fill="#000000" fill-opacity="0.06"/>
        </pattern>
        <pattern id="ap-grain" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <rect width="1.4" height="5" fill="#FFFFFF" fill-opacity="0.08"/>
        </pattern>
        <!-- 자수 실결(새틴 스티치): 글자와 별의 결 방향을 엇갈리게 -->
        <pattern id="ap-satin" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <rect width="1.3" height="3.2" fill="#FFFFFF" fill-opacity="0.2"/>
          <rect x="2.2" width="0.5" height="3.2" fill="#000000" fill-opacity="0.14"/>
        </pattern>
        <pattern id="ap-satin-cross" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="1.3" height="3.2" fill="#FFFFFF" fill-opacity="0.2"/>
          <rect x="2.2" width="0.5" height="3.2" fill="#000000" fill-opacity="0.14"/>
        </pattern>
      </defs>
    </svg>`;

  function injectSvgPatterns() {
    if (document.getElementById('ap-svg-patterns')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = SVG_PATTERNS.trim();
    document.body.prepend(wrapper.firstElementChild);
  }

  function roundTo(value, digits) {
    const factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  }

  /* ---------- 옷에 넣는 '별 달린 A' 자수 ---------- */

  // 글자 로고의 첫 글자 A와 별을 그대로 옮긴 모양 (index.html #logo-mark, brand/star-a.svg와 같음)
  const STAR_A = {
    letter: 'M3.5 50 L18.5 18 L26.5 18 L41.5 50 L33.9 50 L29.7 41 L15.3 41 L11.1 50 Z M0 45.5 H14.6 V50 H0 Z M30.4 45.5 H45 V50 H30.4 Z M22.5 25.7 L18.1 35 L26.9 35 Z',
    star: 'M22.5 4.5 Q24.8 12.7 33 15 Q24.8 17.3 22.5 25.5 Q20.2 17.3 12 15 Q20.2 12.7 22.5 4.5 Z',
    centerX: 22.5,     // 모양이 차지하는 범위: 가로 0~45, 세로 4.5~50
    centerY: 27.25,
    height: 45.5
  };
  // 실 색: 밝은 원단엔 에스프레소 A + 황토 별, 어두운 원단엔 크림 A + 밝은 황토 별 (brand/ 파일과 같은 조합)
  const THREAD_ON_LIGHT = { letter: '#3B2A20', star: '#B07A2A' };
  const THREAD_ON_DARK = { letter: '#F3EBDD', star: '#D3A24A' };
  const PATCH_FILL = '#EFE6D6';       // 캡 앞판 패치(생지 캔버스)
  const PATCH_STITCH = '#A88F68';

  /**
   * 별 달린 A 자수 SVG 조각 (옷 그림 좌표 200×240 기준)
   * mark: { x, y(자수 가운데), size(높이), patch?: { x, y, width, height } }
   */
  function starAMarkSvg(mark, fabricHex) {
    let patchSvg = '';
    let groundHex = fabricHex;
    if (mark.patch) {
      const { x, y, width, height } = mark.patch;
      const inset = 2.5;
      patchSvg = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="1.2" fill="${PATCH_FILL}" stroke="#141414" stroke-opacity="0.35" stroke-width="0.8"/>`
        + `<rect x="${x + inset}" y="${y + inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="none" stroke="${PATCH_STITCH}" stroke-width="0.6" stroke-dasharray="1.6 1.2"/>`;
      groundHex = PATCH_FILL;   // 패치 위에 놓이면 실 색은 패치 색 기준
    }
    const thread = isLightColor(groundHex) ? THREAD_ON_LIGHT : THREAD_ON_DARK;
    const scale = roundTo(mark.size / STAR_A.height, 4);
    const placement = `translate(${mark.x} ${mark.y}) scale(${scale}) translate(${-STAR_A.centerX} ${-STAR_A.centerY})`;

    // 한 부분(A 또는 별)을 실로 놓은 모습: 그림자 → 실 색과 가장자리 → 실결
    const embroider = (d, threadHex, satinId) => {
      const edge = mixColor(threadHex, '#000000', 0.35);
      return `<path d="${d}" fill="#000000" opacity="0.3" transform="translate(1.2 1.6)"/>`   // 실이 도톰하게 올라온 그림자
        + `<path d="${d}" fill="${threadHex}" stroke="${edge}" stroke-opacity="0.5" stroke-width="0.9" stroke-linejoin="round"/>`
        + `<path d="${d}" fill="url(#${satinId})"/>`;
    };
    // 별을 A 위에 나중에 놓아, 별이 A 위로 한 겹 더 올라온 것처럼 보이게 함
    return `<g class="garment__mark">${patchSvg}<g transform="${placement}">`
      + embroider(STAR_A.letter, thread.letter, 'ap-satin')
      + embroider(STAR_A.star, thread.star, 'ap-satin-cross')
      + '</g></g>';
  }

  /**
   * 상품 일러스트 SVG 문자열을 만듦
   * options: strokeWidth, outlineColor, outlineOpacity, label(있으면 스크린리더가 읽는 이미지),
   *          mark(false면 별 달린 A 자수를 빼고 그림)
   */
  function garmentSvg(product, color, options = {}) {
    const shape = DATA.GARMENTS[product.garment];
    if (!shape || !color) return '';
    const strokeWidth = options.strokeWidth || 1.1;
    const outlineColor = options.outlineColor || '#141414';
    const outlineOpacity = options.outlineOpacity != null ? options.outlineOpacity : 0.45;
    // 무늬가 있으면 패턴, 패턴을 못 읽는 경우를 위해 뒤에 기본색을 함께 지정
    const fill = color.pattern ? `url(#${color.pattern}) ${color.hex}` : color.hex;
    const a11y = options.label
      ? `role="img" aria-label="${escapeHtml(options.label)}"`
      : 'aria-hidden="true" focusable="false"';
    return `<svg class="garment" viewBox="0 0 200 240" ${a11y}>`
      + `<path d="${shape.outline}" fill="${fill}" stroke="${outlineColor}" stroke-opacity="${outlineOpacity}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
      + `<path d="${shape.detail}" fill="none" stroke="${color.line}" stroke-width="${roundTo(strokeWidth * 0.9, 2)}" stroke-linejoin="round" stroke-linecap="round"/>`
      + `<path d="${shape.stitch}" fill="none" stroke="${color.stitch}" stroke-width="${roundTo(strokeWidth * 0.7, 2)}" stroke-dasharray="2.4 2" stroke-linecap="round"/>`
      + (shape.mark && options.mark !== false ? starAMarkSvg(shape.mark, color.hex) : '')
      + '</svg>';
  }

  // data-illustration="상품ID:색상ID" 자리에 일러스트를 채움
  function hydrateIllustrations(root) {
    (root || document).querySelectorAll('[data-illustration]').forEach((holder) => {
      const [productId, colorId] = holder.dataset.illustration.split(':');
      const product = productById.get(productId);
      if (!product) return;
      const isOnNight = holder.dataset.illustrationTone === 'night';
      holder.innerHTML = garmentSvg(product, getColor(product, colorId), {
        strokeWidth: 1,
        outlineColor: isOnNight ? '#F5F3EF' : '#141414',
        outlineOpacity: isOnNight ? 0.22 : 0.45,
        label: holder.dataset.illustrationLabel || ''
      });
    });
  }

  /* ---------- 상품 카드 ---------- */

  // 행택(라틴어 동물 이름)·배지·일러스트를 담은 상품 카드
  function productCardHtml(product) {
    const animal = getAnimal(product);
    const tag = animal
      ? `<span class="hang-tag"><span class="hang-tag__paper" lang="la">${escapeHtml(animal.latin)}</span></span>`
      : '';
    const badge = product.badge
      ? `<span class="product-card__badge" lang="en">${escapeHtml(product.badge)}</span>`
      : '';
    // 상품마다 다른 배경색은 CSS 변수로 넘김 (행택 구멍 색도 같이 맞춰짐)
    const backdrop = product.backdrop ? ` style="--card-backdrop: ${escapeHtml(product.backdrop)}"` : '';
    return '<li>'
      + `<a class="product-card" href="${productUrl(product.id)}">`
      + `<div class="product-card__media"${backdrop}>${tag}${badge}${garmentSvg(product, product.colors[0])}</div>`
      + '<div class="product-card__body">'
      + `<span class="product-card__name">${escapeHtml(product.name)}</span>`
      + `<span class="product-card__price">${formatPrice(product.price)}</span>`
      + '</div></a></li>';
  }

  // 목록 전체를 문자열로 만든 뒤 한 번에 넣어 화면 갱신(리플로우)을 한 번으로 줄임
  function renderProductList(listElement, products) {
    if (!listElement) return;
    listElement.innerHTML = products.map(productCardHtml).join('');
  }

  /* ---------- 헤더: 메뉴·검색 패널 ---------- */

  function initHeader() {
    const menuToggle = document.querySelector('[data-menu-toggle]');
    const menuPanel = document.getElementById('site-menu');
    const menuLabel = document.querySelector('[data-menu-label]');
    const searchToggle = document.querySelector('[data-search-toggle]');
    const searchPanel = document.getElementById('site-search');
    const searchForm = searchPanel ? searchPanel.querySelector('form') : null;
    const searchInput = searchForm ? searchForm.querySelector('input[name="q"]') : null;

    function isOpen(toggle) {
      return Boolean(toggle) && toggle.getAttribute('aria-expanded') === 'true';
    }

    function setOpen(toggle, panel, open) {
      if (!toggle || !panel) return;
      toggle.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      if (toggle === menuToggle && menuLabel) menuLabel.textContent = open ? 'CLOSE' : 'MENU';
    }

    if (menuToggle && menuPanel) {
      menuToggle.addEventListener('click', () => {
        const willOpen = !isOpen(menuToggle);
        setOpen(searchToggle, searchPanel, false); // 메뉴와 검색은 동시에 열지 않음
        setOpen(menuToggle, menuPanel, willOpen);
      });
      // 같은 페이지 안의 위치(#journal 등)로 이동할 때도 메뉴가 닫히도록
      menuPanel.addEventListener('click', (event) => {
        if (event.target.closest('a')) setOpen(menuToggle, menuPanel, false);
      });
    }

    if (searchToggle && searchPanel) {
      searchToggle.addEventListener('click', () => {
        const willOpen = !isOpen(searchToggle);
        setOpen(menuToggle, menuPanel, false);
        setOpen(searchToggle, searchPanel, willOpen);
        if (willOpen && searchInput) searchInput.focus();
      });
    }

    if (searchForm && searchInput) {
      searchForm.addEventListener('submit', (event) => {
        searchInput.value = searchInput.value.trim();
        if (!searchInput.value) {
          event.preventDefault(); // 빈 검색어는 보내지 않음
          searchInput.focus();
        }
      });
    }

    // Esc: 열린 패널을 닫고 포커스를 여는 버튼으로 돌려줌 (열려 있을 때만 동작)
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (isOpen(menuToggle)) {
        setOpen(menuToggle, menuPanel, false);
        menuToggle.focus();
      } else if (isOpen(searchToggle)) {
        setOpen(searchToggle, searchPanel, false);
        searchToggle.focus();
      }
    });
  }

  function updateCartBadges() {
    const count = getCartCount(readCart());
    document.querySelectorAll('[data-cart-link]').forEach((link) => {
      link.setAttribute('aria-label', count > 0 ? `장바구니, ${count}개 담김` : '장바구니, 비어 있음');
      const badge = link.querySelector('[data-cart-count]');
      if (badge) {
        badge.textContent = String(count);
        badge.hidden = count === 0;
      }
    });
  }

  /* ---------- 시작 ---------- */

  injectSvgPatterns();
  initHeader();
  hydrateIllustrations();
  updateCartBadges();
  document.addEventListener('cart:change', updateCartBadges);

  // 다른 탭에서 장바구니가 바뀌면 이 탭도 맞춰서 갱신
  window.addEventListener('storage', (event) => {
    if (event.key !== CART_STORAGE_KEY) return;
    document.dispatchEvent(new CustomEvent('cart:change', { detail: { items: readCart() } }));
  });

  // 페이지별 스크립트에서 쓰는 기능만 공개
  window.AP = Object.freeze({
    DATA,
    productById,
    escapeHtml,
    formatPrice,
    productUrl,
    getColor,
    getAnimal,
    mixColor,
    isLightColor,
    garmentSvg,
    renderProductList,
    makeLineKey,
    readCart,
    addToCart,
    changeQuantity,
    removeFromCart,
    getCartCount,
    getCartTotals,
    MAX_QTY_PER_ITEM,
    FREE_SHIPPING_MIN
  });
})();
