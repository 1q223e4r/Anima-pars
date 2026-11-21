/**
 * 상품 상세 페이지
 * - 주소의 id로 상품을 찾아 그려요. 예) product.html?id=AP-001
 * - 색상을 고르면 일러스트·원단·에이징 색이 바뀌고, 사이즈를 골라야 장바구니에 담을 수 있어요.
 */
(function () {
  'use strict';

  const AP = window.AP;
  if (!AP) return;

  const { PRODUCTS, SIZE_CHARTS } = AP.DATA;
  const esc = AP.escapeHtml;
  const AGING_BASE_COLOR = '#F2F0EC'; // 색이 바래며 가까워지는 생지색
  const AGING_STEPS = [0, 0.2, 0.42];
  const RELATED_COUNT = 4;

  const root = document.querySelector('[data-product-root]');
  const missingSection = document.querySelector('[data-product-missing]');
  if (!root) return;

  const productId = new URLSearchParams(window.location.search).get('id') || '';
  const product = AP.productById.get(productId);

  // 없는 상품이면 안내 화면만 보여 주고, 검색엔진에도 올라가지 않게 함
  if (!product) {
    root.hidden = true;
    if (missingSection) missingSection.hidden = false;
    document.title = '상품을 찾을 수 없어요 — ANIMA PARS';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    return;
  }

  const pick = (selector) => root.querySelector(selector);
  const el = {
    crumb: document.querySelector('[data-crumb-name]'),
    meta: pick('[data-pd-meta]'),
    name: pick('[data-pd-name]'),
    nameEn: pick('[data-pd-name-en]'),
    price: pick('[data-pd-price]'),
    colorName: pick('[data-pd-color-name]'),
    colors: pick('[data-pd-colors]'),
    sizes: pick('[data-pd-sizes]'),
    sizeNote: pick('[data-pd-size-note]'),
    sizeGuideLink: pick('[data-pd-size-guide-link]'),
    addButton: pick('[data-add-to-cart]'),
    error: pick('[data-pd-error]'),
    added: pick('[data-pd-added]'),
    addedText: pick('[data-pd-added-text]'),
    front: pick('[data-pd-front]'),
    fabric: pick('[data-pd-fabric]'),
    fabricCaption: pick('[data-pd-fabric-caption]'),
    description: pick('[data-pd-description]'),
    specs: pick('[data-pd-specs]'),
    sizeGuide: pick('[data-pd-size-guide]'),
    sizeTable: pick('[data-pd-size-table]'),
    agingText: pick('[data-pd-aging-text]'),
    agingSwatches: root.querySelectorAll('[data-pd-age]'),
    related: pick('[data-pd-related]')
  };

  const buyableSizes = product.sizes.filter((size) => !product.soldOut.includes(size));
  const state = {
    colorId: product.colors[0].id,
    // 고를 수 있는 사이즈가 FREE 하나뿐이면 미리 선택해 둠
    size: product.sizes.length === 1 && buyableSizes.length === 1 ? buyableSizes[0] : ''
  };

  /* ---------- 한 번만 그리는 부분 ---------- */

  function renderBasics() {
    document.title = `${product.name} — ANIMA PARS`;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', `${product.name} · ${AP.formatPrice(product.price)} — ${product.description}`);
    }
    if (el.crumb) el.crumb.textContent = product.name;
    el.meta.textContent = `${product.id} · ${product.season}`;
    el.name.textContent = product.name;
    el.nameEn.textContent = product.nameEn;
    el.price.textContent = AP.formatPrice(product.price);
    el.description.textContent = product.description;
    el.specs.innerHTML = product.specs
      .map(([term, detail]) => `<dt>${esc(term)}</dt><dd>${esc(detail)}</dd>`)
      .join('');
    el.fabricCaption.textContent = product.fabricLabel;
    el.agingText.textContent = product.agingNote;
  }

  function renderColorOptions() {
    el.colors.innerHTML = product.colors.map((color) => {
      const inputId = `color-${color.id}`;
      return '<div class="swatch">'
        + `<input type="radio" name="color" id="${esc(inputId)}" value="${esc(color.id)}"${color.id === state.colorId ? ' checked' : ''}>`
        + `<label for="${esc(inputId)}" title="${esc(color.name)}">`
        + `<span class="swatch__chip" style="background-color: ${esc(color.hex)}"></span>`
        + `<span class="sr-only">${esc(color.name)}</span></label>`
        + '</div>';
    }).join('');
  }

  function renderSizeOptions() {
    // 사이즈가 적어도 버튼이 너무 커지지 않게 최소 4칸 기준으로 나눔
    el.sizes.style.setProperty('--size-columns', String(Math.max(4, product.sizes.length)));
    el.sizes.innerHTML = product.sizes.map((size) => {
      const inputId = `size-${size}`;
      const isSoldOut = product.soldOut.includes(size);
      return '<div class="size-option">'
        + `<input type="radio" name="size" id="${esc(inputId)}" value="${esc(size)}"${isSoldOut ? ' disabled' : ''}${state.size === size ? ' checked' : ''}>`
        + `<label for="${esc(inputId)}">${esc(size)}${isSoldOut ? '<span class="sr-only"> 품절</span>' : ''}</label>`
        + '</div>';
    }).join('');
    el.sizeNote.textContent = product.soldOut.length ? `${product.soldOut.join(', ')} 사이즈는 품절이에요.` : '';
  }

  function renderSizeChart() {
    const chart = SIZE_CHARTS[product.sizeChart];
    const rows = chart ? chart.rows.filter(([size]) => product.sizes.includes(size)) : [];
    // 사이즈표가 없으면 섹션과 바로가기 링크를 숨김
    if (!chart || rows.length === 0) {
      el.sizeGuide.hidden = true;
      if (el.sizeGuideLink) el.sizeGuideLink.hidden = true;
      return;
    }
    el.sizeTable.innerHTML = `<caption>${esc(chart.note)}</caption>`
      + `<thead><tr><th scope="col" lang="en">SIZE</th>${chart.columns.map((column) => `<th scope="col">${esc(column)}</th>`).join('')}</tr></thead>`
      + `<tbody>${rows.map(([size, ...values]) => (
        `<tr><th scope="row">${esc(size)}</th>${values.map((value) => `<td>${esc(value)}</td>`).join('')}</tr>`
      )).join('')}</tbody>`;
  }

  function renderRelated() {
    const startIndex = PRODUCTS.findIndex((item) => item.id === product.id);
    const related = [];
    // 현재 상품의 다음 순서부터 돌아가며 골라, 상품마다 다른 조합이 나오게 함
    for (let step = 1; step < PRODUCTS.length && related.length < RELATED_COUNT; step += 1) {
      related.push(PRODUCTS[(startIndex + step) % PRODUCTS.length]);
    }
    AP.renderProductList(el.related, related);
  }

  /* ---------- 색상을 바꿀 때마다 다시 그리는 부분 ---------- */

  function renderColorViews() {
    const color = AP.getColor(product, state.colorId);
    el.colorName.textContent = `— ${color.name}`;
    el.front.innerHTML = AP.garmentSvg(product, color, { strokeWidth: 1, label: `${color.name} ${product.name} 정면` });

    const fill = color.pattern ? `url(#${color.pattern}) ${color.hex}` : color.hex;
    el.fabric.innerHTML = `<svg class="fabric-swatch" role="img" aria-label="${esc(color.name)} 원단 확대">`
      + `<rect width="100%" height="100%" fill="${esc(fill)}"/>`
      + '<rect width="100%" height="100%" fill="url(#ap-weave)"/></svg>';
    // 밝은 원단 위에서는 캡션을 어두운 글자로 바꿔 읽기 쉽게
    el.fabricCaption.classList.toggle('is-dark', AP.isLightColor(color.hex));

    el.agingSwatches.forEach((swatch, index) => {
      swatch.style.backgroundColor = AP.mixColor(color.hex, AGING_BASE_COLOR, AGING_STEPS[index] || 0);
    });
  }

  /* ---------- 메시지 ---------- */

  function hideMessages() {
    el.error.hidden = true;
    el.added.hidden = true;
  }

  function showError(message) {
    el.added.hidden = true;
    el.error.textContent = message;
    el.error.hidden = false;
  }

  /* ---------- 이벤트 ---------- */

  el.colors.addEventListener('change', (event) => {
    if (event.target.name !== 'color') return;
    state.colorId = event.target.value;
    hideMessages();
    renderColorViews();
  });

  el.sizes.addEventListener('change', (event) => {
    if (event.target.name !== 'size') return;
    state.size = event.target.value;
    hideMessages();
  });

  el.addButton.addEventListener('click', () => {
    if (!state.size) {
      showError('사이즈를 먼저 골라 주세요.');
      const firstChoice = el.sizes.querySelector('input:not(:disabled)');
      if (firstChoice) firstChoice.focus();
      return;
    }
    const result = AP.addToCart(product.id, state.colorId, state.size);
    if (!result.ok) {
      showError(result.reason === 'max'
        ? `같은 옵션은 최대 ${AP.MAX_QTY_PER_ITEM}개까지 담을 수 있어요.`
        : '이 옵션은 지금 담을 수 없어요.');
      return;
    }
    const color = AP.getColor(product, state.colorId);
    el.error.hidden = true;
    el.addedText.textContent = `장바구니에 담았어요 — ${color.name} / ${state.size}`;
    el.added.hidden = false;
  });

  renderBasics();
  renderColorOptions();
  renderSizeOptions();
  renderSizeChart();
  renderRelated();
  renderColorViews();
})();
