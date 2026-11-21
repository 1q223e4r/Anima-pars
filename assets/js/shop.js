/**
 * 컬렉션(상품 목록) 페이지
 * - 카테고리 필터, 정렬, 검색어(q)를 처리하고 주소(URL)에도 반영해요.
 *   예) shop.html?cat=outer&sort=low  /  shop.html?q=데님
 */
(function () {
  'use strict';

  const AP = window.AP;
  if (!AP) return;

  const { PRODUCTS, CATEGORIES } = AP.DATA;
  const SORT_KEYS = ['new', 'low', 'high'];
  const MAX_QUERY_LENGTH = 40;

  const list = document.querySelector('[data-product-list="shop"]');
  const chipGroup = document.querySelector('[data-category-chips]');
  const sortSelect = document.querySelector('[data-sort]');
  const summary = document.querySelector('[data-result-summary]');
  const emptyMessage = document.querySelector('[data-empty]');
  const searchStatus = document.querySelector('[data-search-status]');
  const searchTerm = document.querySelector('[data-search-term]');
  const clearSearchButton = document.querySelector('[data-clear-search]');
  const headerSearchInput = document.getElementById('search-input');
  if (!list || !chipGroup || !sortSelect) return;

  const categoryLabelBySlug = new Map(CATEGORIES.map((category) => [category.slug, category.label]));

  // 검색은 띄어쓰기·대소문자를 무시하고 비교
  function normalize(text) {
    return String(text).toLowerCase().replace(/\s+/g, '');
  }

  // 상품마다 검색용 문자열을 미리 만들어 두어, 검색할 때마다 다시 만들지 않음
  // 상품마다 검색용 데이터를 미리 만들어 둠
  // - text: 이름·카테고리·색상은 일부만 맞아도 검색됨
  // - animalWords: 라틴어 동물 이름(lupus, 늑대 등)은 통째로 맞을 때만 — '제비'로 '족제비'가 걸리지 않게
  const searchIndex = new Map(PRODUCTS.map((product) => {
    const animal = AP.getAnimal(product);
    return [product.id, {
      text: normalize([
        product.name,
        product.nameEn,
        categoryLabelBySlug.get(product.category) || '',
        ...product.colors.map((color) => color.name)
      ].join(' ')),
      animalWords: animal ? [normalize(animal.latin), normalize(animal.meaning)] : []
    }];
  }));

  // 주소의 값은 누구나 바꿀 수 있으므로 허용된 값만 받음
  function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('cat');
    const sort = params.get('sort');
    return {
      category: category && category !== 'all' && categoryLabelBySlug.has(category) ? category : 'all',
      sort: SORT_KEYS.includes(sort) ? sort : 'new',
      query: (params.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH)
    };
  }

  function writeStateToUrl(state) {
    const params = new URLSearchParams();
    if (state.category !== 'all') params.set('cat', state.category);
    if (state.sort !== 'new') params.set('sort', state.sort);
    if (state.query) params.set('q', state.query);
    const search = params.toString();
    try {
      window.history.replaceState(null, '', window.location.pathname + (search ? '?' + search : ''));
    } catch (error) {
      // 일부 환경(파일로 직접 연 경우 등)에서는 실패할 수 있지만 화면 동작에는 영향 없음
    }
  }

  function getVisibleProducts(state) {
    const keyword = normalize(state.query);
    const matches = PRODUCTS.filter((product) => {
      if (state.category !== 'all' && product.category !== state.category) return false;
      if (!keyword) return true;
      const entry = searchIndex.get(product.id);
      return entry.text.includes(keyword) || entry.animalWords.includes(keyword);
    });
    // 원본 배열은 그대로 두고 복사본만 정렬
    return matches.slice().sort((a, b) => {
      if (state.sort === 'low') return a.price - b.price;
      if (state.sort === 'high') return b.price - a.price;
      return b.addedOrder - a.addedOrder;
    });
  }

  let state = readStateFromUrl();

  function render() {
    const visible = getVisibleProducts(state);
    AP.renderProductList(list, visible);
    list.hidden = visible.length === 0;
    if (emptyMessage) emptyMessage.hidden = visible.length > 0;

    chipGroup.querySelectorAll('[data-category]').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.category === state.category));
    });
    sortSelect.value = state.sort;

    if (summary) {
      // 카테고리를 고르면 그 라인의 동물 이름도 함께 보여 줌 (예: 아우터 · Lupus(늑대) · 2개 상품)
      const category = CATEGORIES.find((item) => item.slug === state.category);
      const animalText = category && category.animal ? ` · ${category.animal.latin}(${category.animal.meaning})` : '';
      summary.textContent = `${category ? category.label : '전체'}${animalText} · ${visible.length}개 상품`;
    }
    if (searchStatus && searchTerm) {
      searchStatus.hidden = !state.query;
      searchTerm.textContent = state.query; // 사용자가 입력한 값은 textContent로만 넣음
    }
    if (headerSearchInput) headerSearchInput.value = state.query;
  }

  function update(patch) {
    state = { ...state, ...patch };
    writeStateToUrl(state);
    render();
  }

  chipGroup.innerHTML = CATEGORIES.map((category) => (
    `<button type="button" class="chip" data-category="${AP.escapeHtml(category.slug)}" aria-pressed="false">${AP.escapeHtml(category.label)}</button>`
  )).join('');

  // 버튼마다 리스너를 달지 않고 부모 한 곳에서 처리 (이벤트 위임)
  chipGroup.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (chip && chip.dataset.category !== state.category) update({ category: chip.dataset.category });
  });

  sortSelect.addEventListener('change', () => {
    update({ sort: SORT_KEYS.includes(sortSelect.value) ? sortSelect.value : 'new' });
  });

  if (clearSearchButton) {
    clearSearchButton.addEventListener('click', () => update({ query: '' }));
  }

  render();
})();
