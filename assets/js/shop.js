/**
 * 컬렉션(상품 목록) 페이지
 * - 카테고리·검색어(q)에 더해 사이즈·색상·가격·찜 필터와 정렬을 처리하고, 상태를 주소(URL)에 반영해요.
 *   예) shop.html?cat=outer&size=M,L&color=olive&price=10-20&sort=low  /  shop.html?wish=1
 * - 필터 선택지마다 '그걸 고르면 몇 개가 남는지'를 보여 줘요. (그 필터만 뺀 나머지 조건으로 셈)
 */
(function () {
  'use strict';

  const AP = window.AP;
  if (!AP) return;

  const { PRODUCTS, CATEGORIES, COLOR_FAMILIES, PRICE_RANGES, SIZE_ORDER } = AP.DATA;
  const SORT_KEYS = ['new', 'low', 'high'];
  const MAX_QUERY_LENGTH = 40;
  const esc = AP.escapeHtml;

  function sizeRank(size) {
    const index = SIZE_ORDER.indexOf(size);
    return index === -1 ? SIZE_ORDER.length : index; // 순서표에 없는 사이즈는 맨 뒤로
  }

  // 사이즈 선택지는 실제 상품에 있는 사이즈만, 정해 둔 순서대로
  const SIZES = Array.from(new Set(PRODUCTS.flatMap((product) => product.sizes)))
    .sort((a, b) => sizeRank(a) - sizeRank(b));

  const FACETS = {
    size: { label: '사이즈', values: SIZES.map((size) => ({ id: size, label: size })) },
    color: { label: '색상', values: COLOR_FAMILIES.map((family) => ({ id: family.id, label: family.label, swatch: family.swatch })) },
    price: { label: '가격', values: PRICE_RANGES.map((range) => ({ id: range.id, label: range.label })) }
  };
  const FACET_KEYS = Object.keys(FACETS);
  const allowedValues = Object.fromEntries(FACET_KEYS.map((key) => [key, FACETS[key].values.map((value) => value.id)]));
  const priceRangeById = new Map(PRICE_RANGES.map((range) => [range.id, range]));
  const categoryBySlug = new Map(CATEGORIES.map((category) => [category.slug, category]));

  const list = document.querySelector('[data-product-list="shop"]');
  const chipGroup = document.querySelector('[data-category-chips]');
  const sortSelect = document.querySelector('[data-sort]');
  const summary = document.querySelector('[data-result-summary]');
  const emptyState = document.querySelector('[data-empty]');
  const emptyText = document.querySelector('[data-empty-text]');
  const emptyClearButton = document.querySelector('[data-empty-clear]');
  const searchStatus = document.querySelector('[data-search-status]');
  const searchTerm = document.querySelector('[data-search-term]');
  const clearSearchButton = document.querySelector('[data-clear-search]');
  const headerSearchInput = document.getElementById('search-input');
  const filterTools = document.querySelector('[data-filter-tools]');
  const filterMenus = Array.from(document.querySelectorAll('[data-filter-menu]'));
  const wishFilterButton = document.querySelector('[data-wish-filter]');
  const wishCount = document.querySelector('[data-wish-count]');
  const activeFilters = document.querySelector('[data-active-filters]');
  const activeList = document.querySelector('[data-active-list]');
  const clearFiltersButton = document.querySelector('[data-clear-filters]');
  if (!list || !chipGroup || !sortSelect) return;

  // 검색은 띄어쓰기·대소문자를 무시하고 비교
  function normalize(text) {
    return String(text).toLowerCase().replace(/\s+/g, '');
  }

  // 상품마다 검색용 데이터를 미리 만들어 둠
  // - text: 이름·카테고리·색상은 일부만 맞아도 검색됨
  // - animalWords: 라틴어 동물 이름(lupus, 늑대 등)은 통째로 맞을 때만 — '제비'로 '족제비'가 걸리지 않게
  const searchIndex = new Map(PRODUCTS.map((product) => {
    const animal = AP.getAnimal(product);
    const category = categoryBySlug.get(product.category);
    return [product.id, {
      text: normalize([
        product.name,
        product.nameEn,
        category ? category.label : '',
        ...product.colors.map((color) => color.name)
      ].join(' ')),
      animalWords: animal ? [normalize(animal.latin), normalize(animal.meaning)] : []
    }];
  }));

  /* ---------- 주소 ↔ 상태 ---------- */

  // 쉼표로 이어진 값 중 허용된 것만, 정해진 순서로 받음 (주소는 누구나 바꿀 수 있으므로)
  function readList(params, key) {
    const raw = (params.get(key) || '').split(',').map((value) => value.trim()).filter(Boolean);
    return allowedValues[key].filter((value) => raw.includes(value));
  }

  function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('cat');
    const sort = params.get('sort');
    return {
      category: category && categoryBySlug.has(category) ? category : 'all',
      sort: SORT_KEYS.includes(sort) ? sort : 'new',
      query: (params.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH),
      size: readList(params, 'size'),
      color: readList(params, 'color'),
      price: readList(params, 'price'),
      wishOnly: params.get('wish') === '1'
    };
  }

  function writeStateToUrl(state) {
    const params = new URLSearchParams();
    if (state.category !== 'all') params.set('cat', state.category);
    FACET_KEYS.forEach((key) => {
      if (state[key].length) params.set(key, state[key].join(','));
    });
    if (state.wishOnly) params.set('wish', '1');
    if (state.sort !== 'new') params.set('sort', state.sort);
    if (state.query) params.set('q', state.query);
    // 쉼표는 주소에 그대로 둬도 되므로 읽기 쉽게 되돌림
    const search = params.toString().replace(/%2C/gi, ',');
    try {
      window.history.replaceState(null, '', window.location.pathname + (search ? '?' + search : ''));
    } catch (error) {
      // 일부 환경(파일로 직접 연 경우 등)에서는 실패할 수 있지만 화면 동작에는 영향 없음
    }
  }

  /* ---------- 걸러 내기·정렬 ---------- */

  const facetMatchers = {
    // 품절된 사이즈는 없는 사이즈로 봄
    size: (product, sizes) => sizes.some((size) => product.sizes.includes(size) && !product.soldOut.includes(size)),
    color: (product, families) => product.colors.some((color) => families.includes(color.family)),
    price: (product, rangeIds) => rangeIds.some((id) => {
      const range = priceRangeById.get(id);
      return product.price >= range.min && product.price < range.max;
    })
  };

  // 한 번 그릴 때 필요한 값(찜 목록, 정리된 검색어)을 모아 둠
  function buildContext(state) {
    return { state, wished: new Set(AP.readWish()), keyword: normalize(state.query) };
  }

  // skipFacet: 그 필터만 빼고 거름 — 선택지별로 남는 상품 수를 셀 때 사용
  function matches(product, context, skipFacet) {
    const { state, wished, keyword } = context;
    if (state.category !== 'all' && product.category !== state.category) return false;
    if (state.wishOnly && !wished.has(product.id)) return false;
    if (keyword) {
      const entry = searchIndex.get(product.id);
      if (!entry.text.includes(keyword) && !entry.animalWords.includes(keyword)) return false;
    }
    return FACET_KEYS.every((key) => key === skipFacet || state[key].length === 0 || facetMatchers[key](product, state[key]));
  }

  function sortProducts(products, sort) {
    // 원본 배열은 그대로 두고 복사본만 정렬
    return products.slice().sort((a, b) => {
      if (sort === 'low') return a.price - b.price;
      if (sort === 'high') return b.price - a.price;
      return b.addedOrder - a.addedOrder;
    });
  }

  function countOptions(context) {
    const counts = {};
    FACET_KEYS.forEach((key) => {
      const pool = PRODUCTS.filter((product) => matches(product, context, key));
      counts[key] = new Map(allowedValues[key].map((id) => [id, pool.filter((product) => facetMatchers[key](product, [id])).length]));
    });
    return counts;
  }

  /* ---------- 그리기 ---------- */

  let state = readStateFromUrl();

  // 색상 필터를 골랐으면 카드도 그 색으로 보여 줌
  function colorFor(product) {
    if (!state.color.length) return null;
    const match = product.colors.find((color) => state.color.includes(color.family));
    return match ? match.id : null;
  }

  // 필터 선택지는 처음에 한 번만 만들고, 이후엔 체크·개수·잠금만 바꿈 (누른 체크박스의 포커스가 유지되게)
  function renderFilterOptions() {
    FACET_KEYS.forEach((key) => {
      const holder = document.querySelector(`[data-filter-options="${key}"]`);
      if (!holder) return;
      holder.innerHTML = FACETS[key].values.map((value) => {
        const inputId = esc(`filter-${key}-${value.id}`);
        const swatch = value.swatch
          ? `<span class="filter-option__swatch" style="--swatch: ${esc(value.swatch)}" aria-hidden="true"></span>`
          : '';
        return `<label class="filter-option" for="${inputId}">`
          + `<input class="filter-option__input" type="checkbox" id="${inputId}" value="${esc(value.id)}" data-facet="${key}">`
          + `${swatch}<span class="filter-option__label">${esc(value.label)}</span>`
          + '<span class="filter-option__count" data-count></span></label>';
      }).join('');
    });
  }

  function updateFilterOptions(counts) {
    FACET_KEYS.forEach((key) => {
      document.querySelectorAll(`[data-facet="${key}"]`).forEach((input) => {
        const checked = state[key].includes(input.value);
        const count = counts[key].get(input.value) || 0;
        input.checked = checked;
        // 골라도 결과가 없는 선택지는 잠금 (이미 고른 건 풀 수 있게 둠)
        input.disabled = !checked && count === 0;
        const option = input.closest('.filter-option');
        option.classList.toggle('is-checked', checked);
        option.classList.toggle('is-disabled', input.disabled);
        option.querySelector('[data-count]').textContent = `(${count})`;
      });
      const menu = document.querySelector(`[data-filter-menu="${key}"]`);
      if (!menu) return;
      const toggle = menu.querySelector('[data-filter-toggle]');
      const badge = menu.querySelector('[data-filter-badge]');
      const selected = state[key].length;
      badge.textContent = String(selected);
      badge.hidden = selected === 0;
      if (selected) {
        toggle.setAttribute('aria-label', `${FACETS[key].label} 필터, ${selected}개 선택`);
      } else {
        toggle.removeAttribute('aria-label');
      }
    });
  }

  function activeFilterItems() {
    const items = [];
    FACET_KEYS.forEach((key) => {
      state[key].forEach((id) => {
        const value = FACETS[key].values.find((item) => item.id === id);
        if (value) items.push({ key, id, label: value.label, name: `${FACETS[key].label} ${value.label}` });
      });
    });
    if (state.wishOnly) items.push({ key: 'wish', id: '1', label: '찜한 상품', name: '찜한 상품' });
    return items;
  }

  function renderActiveFilters(items) {
    if (!activeFilters || !activeList) return;
    activeFilters.hidden = items.length === 0;
    activeList.innerHTML = items.map((item) => (
      `<li><button class="active-filter" type="button" data-remove-filter="${esc(item.key)}:${esc(item.id)}" aria-label="${esc(item.name)} 필터 해제">`
      + `${esc(item.label)}<svg class="icon icon--small" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>`
      + '</button></li>'
    )).join('');
  }

  function render() {
    const context = buildContext(state);
    const visible = sortProducts(PRODUCTS.filter((product) => matches(product, context, null)), state.sort);
    const items = activeFilterItems();

    AP.renderProductList(list, visible, { colorFor });
    list.hidden = visible.length === 0;
    if (emptyState) emptyState.hidden = visible.length > 0;
    if (emptyText) {
      emptyText.textContent = state.wishOnly && context.wished.size === 0
        ? '아직 찜한 상품이 없어요. 상품 그림의 하트를 눌러 담아 보세요.'
        : '조건에 맞는 상품이 없어요.';
    }
    if (emptyClearButton) emptyClearButton.hidden = items.length === 0;

    chipGroup.querySelectorAll('[data-category]').forEach((chip) => {
      chip.setAttribute('aria-pressed', String(chip.dataset.category === state.category));
    });
    sortSelect.value = state.sort;
    updateFilterOptions(countOptions(context));
    renderActiveFilters(items);
    if (wishFilterButton) wishFilterButton.setAttribute('aria-pressed', String(state.wishOnly));
    if (wishCount) wishCount.textContent = String(context.wished.size);

    if (summary) {
      // 카테고리를 고르면 그 라인의 동물 이름도 함께 보여 줌 (예: 아우터 · Lupus(늑대) · 2개 상품)
      const category = categoryBySlug.get(state.category);
      const animalText = category && category.animal ? ` · ${category.animal.latin}(${category.animal.meaning})` : '';
      const filterText = items.length ? ` · 필터 ${items.length}개` : '';
      summary.textContent = `${category ? category.label : '전체'}${animalText} · ${visible.length}개 상품${filterText}`;
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

  function clearFilters() {
    update({ size: [], color: [], price: [], wishOnly: false });
  }

  function focusFirstFilterToggle() {
    const toggle = filterMenus.length ? filterMenus[0].querySelector('[data-filter-toggle]') : null;
    if (toggle) toggle.focus();
  }

  /* ---------- 필터 메뉴 열고 닫기: 한 번에 하나만, 바깥을 누르거나 Esc를 누르면 닫힘 ---------- */

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setMenuOpen(menu, open) {
    const panel = menu.querySelector('.filter-menu__panel');
    menu.querySelector('[data-filter-toggle]').setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    // 펼친 창이 화면 밖으로 잘리면 보이는 만큼만 화면을 옮김 (위쪽 고정 헤더만큼 띄우는 건 CSS scroll-margin)
    if (open) panel.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  function closeMenus(except) {
    filterMenus.forEach((menu) => {
      if (menu !== except) setMenuOpen(menu, false);
    });
  }

  filterMenus.forEach((menu) => {
    const toggle = menu.querySelector('[data-filter-toggle]');
    toggle.addEventListener('click', () => {
      const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
      closeMenus(menu);
      setMenuOpen(menu, willOpen);
    });
  });

  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && !event.target.closest('[data-filter-menu]')) closeMenus(null);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openMenu = filterMenus.find((menu) => menu.querySelector('[data-filter-toggle]').getAttribute('aria-expanded') === 'true');
    if (openMenu) {
      setMenuOpen(openMenu, false);
      openMenu.querySelector('[data-filter-toggle]').focus();
    }
  });

  /* ---------- 입력 ---------- */

  chipGroup.innerHTML = CATEGORIES.map((category) => (
    `<button type="button" class="chip" data-category="${esc(category.slug)}" aria-pressed="false">${esc(category.label)}</button>`
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

  // 체크박스를 바꾸면 바로 결과에 반영 (정해진 순서 유지, 허용된 값만)
  if (filterTools) {
    filterTools.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !FACETS[input.dataset.facet]) return;
      const key = input.dataset.facet;
      const next = input.checked ? state[key].concat(input.value) : state[key].filter((id) => id !== input.value);
      update({ [key]: allowedValues[key].filter((id) => next.includes(id)) });
    });
  }

  if (wishFilterButton) {
    wishFilterButton.addEventListener('click', () => update({ wishOnly: !state.wishOnly }));
  }

  if (activeList) {
    activeList.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-remove-filter]') : null;
      if (!button) return;
      const separator = button.dataset.removeFilter.indexOf(':');
      const key = button.dataset.removeFilter.slice(0, separator);
      const id = button.dataset.removeFilter.slice(separator + 1);
      const position = Array.from(activeList.querySelectorAll('[data-remove-filter]')).indexOf(button);
      if (key === 'wish') {
        update({ wishOnly: false });
      } else if (FACETS[key]) {
        update({ [key]: state[key].filter((value) => value !== id) });
      }
      // 지운 칩 자리로 포커스를 옮겨 키보드로 이어서 지울 수 있게
      const remaining = activeList.querySelectorAll('[data-remove-filter]');
      if (remaining.length) {
        remaining[Math.min(position, remaining.length - 1)].focus();
      } else {
        focusFirstFilterToggle();
      }
    });
  }

  [clearFiltersButton, emptyClearButton].forEach((button) => {
    if (!button) return;
    button.addEventListener('click', () => {
      clearFilters();
      focusFirstFilterToggle(); // 누른 버튼이 사라지므로 필터 첫 버튼으로 포커스를 옮김
    });
  });

  // 찜이 바뀌면 개수를 고치고, '찜한 상품만' 보는 중이면 목록도 다시 그림
  document.addEventListener('wish:change', () => {
    if (state.wishOnly) {
      render();
      if (document.activeElement === document.body && wishFilterButton) wishFilterButton.focus();
    } else if (wishCount) {
      wishCount.textContent = String(AP.readWish().length);
    }
  });

  renderFilterOptions();
  writeStateToUrl(state); // 주소에 잘못된 값이 섞여 들어왔으면 처음부터 정리된 주소로 바꿔 둠
  render();
})();
