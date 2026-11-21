/**
 * ANIMA PARS 상품 데이터
 * ------------------------------------------------------------
 * 상품을 추가하거나 고칠 때는 이 파일만 바꾸면 모든 페이지에 반영돼요.
 * 상품 설명과 사이즈 수치는 포트폴리오용 예시입니다.
 */
(function () {
  'use strict';

  // 단추처럼 작은 원을 SVG 경로로 만들어 주는 도우미
  function circlePath(cx, cy, r) {
    return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }

  function circlePaths(points, r) {
    return points.map(([cx, cy]) => circlePath(cx, cy, r)).join(' ');
  }

  /**
   * 옷 일러스트 모양 (200×240 좌표계)
   * outline: 실루엣 / detail: 솔기·주머니 선 / stitch: 점선 스티치
   */
  const GARMENTS = {
    chore: {
      outline: 'M84 30 L56 40 L30 160 L50 166 L62 84 L60 206 L140 206 L138 84 L150 166 L170 160 L144 40 L116 30 Q100 40 84 30 Z',
      detail: 'M84 30 L90 56 L100 42 L110 56 L116 30 M100 42 L100 206 M68 138 L92 138 L92 176 L68 176 Z M108 138 L132 138 L132 176 L108 176 Z M110 76 L130 76 L130 100 L110 100 Z M33 147 L52 152 M167 147 L148 152 '
        + circlePaths([[100, 66], [100, 96], [100, 126], [100, 156], [100, 186]], 2.4),
      stitch: 'M70 142 L90 142 M110 142 L130 142 M112 80 L128 80 M61 200 L139 200'
    },
    jeans: {
      outline: 'M58 20 L142 20 L146 70 L138 228 L106 228 L100 100 L94 228 L62 228 L54 70 Z',
      detail: 'M57 32 L143 32 M68 18 L68 35 M132 18 L132 35 M57 46 Q74 50 80 32 M143 46 Q126 50 120 32 M126 34 L136 34 L137 42 L127 43 Z M100 32 L100 86 M62 214 L94 214 M106 214 L138 214 '
        + circlePath(100, 26, 2.5),
      stitch: 'M108 33 L108 72 Q108 84 100 88 M58 51 Q77 55 84 33 M142 51 Q123 55 116 33 M62 222 L94 222 M106 222 L138 222'
    },
    flannel: {
      outline: 'M86 28 L58 38 L34 150 L52 156 L64 80 L62 196 Q100 222 138 196 L136 80 L148 156 L166 150 L142 38 L114 28 Q100 36 86 28 Z',
      detail: 'M86 28 L92 50 L100 38 L108 50 L114 28 M96 40 L96 208 M104 40 L104 208 M68 70 L90 70 L90 78 L79 83 L68 78 Z M68 78 L68 102 L90 102 L90 78 M110 70 L132 70 L132 78 L121 83 L110 78 Z M110 78 L110 102 L132 102 L132 78 M37 138 L54 143 M163 138 L146 143 '
        + circlePaths([[100, 54], [100, 80], [100, 106], [100, 132], [100, 158], [100, 184]], 2.2),
      stitch: 'M70 74 L88 74 M112 74 L130 74 M66 190 Q100 213 134 190'
    },
    sweat: {
      outline: 'M84 30 Q100 42 116 30 L146 42 L172 156 L154 166 L138 92 L140 196 L60 196 L62 92 L46 166 L28 156 L54 42 Z',
      detail: 'M78 32 Q100 54 122 32 M93 46 L100 60 L107 46 M80 34 L62 92 M120 34 L138 92 M31 143 L49 152 M169 143 L151 152 M60 180 L140 180',
      stitch: 'M85 36 L67 92 M115 36 L133 92 M61 187 L139 187'
    },
    field: {
      outline: 'M84 26 L84 14 Q100 10 116 14 L116 26 L144 38 L170 162 L150 168 L138 84 L140 210 L60 210 L62 84 L50 168 L30 162 L56 38 Z',
      detail: 'M84 26 Q100 31 116 26 M100 14 L100 210 M66 62 L92 62 L92 73 L66 73 Z M67 73 L67 100 L91 100 L91 73 M108 62 L134 62 L134 73 L108 73 Z M109 73 L109 100 L133 100 L133 73 M64 134 L94 134 L94 147 L64 147 Z M65 147 L65 186 L93 186 L93 147 M106 134 L136 134 L136 147 L106 147 Z M107 147 L107 186 L135 186 L135 147 M33 148 L52 154 M167 148 L148 154 '
        + circlePaths([[79, 68], [121, 68], [79, 141], [121, 141]], 1.8),
      stitch: 'M61 120 L139 120 M61 204 L139 204'
    },
    henley: {
      outline: 'M86 30 Q100 40 114 30 L142 40 L166 160 L150 166 L136 86 L138 204 L62 204 L64 86 L50 166 L34 160 L58 40 Z',
      detail: 'M82 31 Q100 46 118 31 M96 38 L96 82 L104 82 L104 38 M58 40 Q66 64 64 86 M142 40 Q134 64 136 86 M37 150 L51 155 M163 150 L149 155 '
        + circlePaths([[100, 50], [100, 62], [100, 74]], 2),
      stitch: 'M63 197 L137 197'
    },
    cap: {
      outline: 'M42 150 Q42 72 100 66 Q158 72 158 150 Q100 140 42 150 Z M28 152 Q100 140 172 152 Q168 178 100 182 Q32 178 28 152 Z',
      detail: 'M100 66 L100 145 M74 74 Q62 108 64 148 M126 74 Q138 108 136 148 M84 102 L116 102 L116 124 L84 124 Z '
        + circlePath(100, 65, 4.5) + ' ' + circlePaths([[80, 94], [120, 94]], 2),
      stitch: 'M36 160 Q100 150 164 160 M40 168 Q100 158 160 168 M46 175 Q100 166 154 175 M87 105 L113 105 L113 121 L87 121 Z'
    },
    tote: {
      outline: 'M44 96 L156 96 L150 216 L50 216 Z M66 96 Q66 34 100 34 Q134 34 134 96 L126 96 Q126 46 100 46 Q74 46 74 96 Z',
      detail: 'M45 108 L155 108 M70 140 L130 140 L130 196 L70 196 Z M89 156 L111 156 L111 170 L89 170 Z M49 204 L151 204',
      stitch: 'M66 100 L74 116 M74 100 L66 116 M126 100 L134 116 M134 100 L126 116 M70 146 L130 146 M45 102 L155 102'
    }
  };

  /**
   * 카테고리 — 'all'은 필터용 가상 카테고리
   * animal: 카테고리마다 붙는 라틴어 동물 이름 (상품 행택·상세 페이지에 표시)
   */
  const CATEGORIES = [
    { slug: 'all', label: '전체' },
    { slug: 'outer', label: '아우터', animal: { latin: 'Lupus', meaning: '늑대' } },
    { slug: 'denim', label: '데님', animal: { latin: 'Apis', meaning: '벌' } },
    { slug: 'shirt', label: '셔츠', animal: { latin: 'Mustela', meaning: '족제비' } },
    { slug: 'sweat', label: '스웨트', animal: { latin: 'Leo', meaning: '사자' } },
    { slug: 'tee', label: '티셔츠', animal: { latin: 'Felis', meaning: '고양이' } },
    { slug: 'acc', label: '액세서리', animal: { latin: 'Hirundo', meaning: '제비' } }
  ];

  const MEASURE_NOTE = '단위 cm · 재는 방법에 따라 1~2cm 차이가 있을 수 있어요.';

  // 사이즈표: rows의 첫 칸은 사이즈 이름, 나머지는 columns 순서대로
  const SIZE_CHARTS = {
    outer: {
      note: MEASURE_NOTE,
      columns: ['어깨', '가슴 단면', '소매', '총장'],
      rows: [['S', 46, 56, 60, 70], ['M', 48, 59, 61, 72], ['L', 50, 62, 62, 74], ['XL', 52, 65, 63, 76]]
    },
    top: {
      note: MEASURE_NOTE,
      columns: ['어깨', '가슴 단면', '소매', '총장'],
      rows: [['S', 44, 53, 60, 67], ['M', 46, 56, 61, 69], ['L', 48, 59, 62, 71], ['XL', 50, 62, 63, 73]]
    },
    denim: {
      note: MEASURE_NOTE,
      columns: ['허리 단면', '허벅지 단면', '밑위', '밑단 단면', '총장'],
      rows: [
        ['28', 37, 29.5, 27.5, 19.5, 101],
        ['30', 39, 30.5, 28, 20, 102],
        ['32', 41, 31.5, 28.5, 20.5, 103],
        ['34', 43, 32.5, 29, 21, 104],
        ['36', 45, 33.5, 29.5, 21.5, 105]
      ]
    },
    cap: {
      note: '단위 cm · 뒤쪽 스트랩으로 머리 둘레를 조절할 수 있어요.',
      columns: ['머리 둘레', '챙 길이', '높이'],
      rows: [['FREE', '56–60', 7, 11]]
    },
    tote: {
      note: '단위 cm',
      columns: ['가로', '세로', '폭', '손잡이 길이'],
      rows: [['FREE', 40, 38, 12, 60]]
    }
  };

  /**
   * 상품 목록
   * - addedOrder: 클수록 최근 입고 (신상품순 정렬에 사용)
   * - colors[].pattern: 무늬 원단이면 common.js의 SVG 패턴 id
   * - soldOut: 품절 사이즈
   * - backdrop: 상품 그림 뒤에 깔리는 따뜻한 종이색
   */
  const PRODUCTS = [
    {
      id: 'AP-001',
      name: '덕 캔버스 초어 재킷',
      nameEn: 'Duck Canvas Chore Jacket',
      category: 'outer',
      price: 219000,
      badge: 'NEW',
      addedOrder: 8,
      season: '2026 F/W',
      garment: 'chore',
      backdrop: '#EADFCC',
      colors: [
        { id: 'brick', name: '브릭', hex: '#8E4B33', line: '#E2C4B4', stitch: '#D8B48A' },
        { id: 'olive', name: '올리브', hex: '#55593B', line: '#D1CFB0', stitch: '#D8B48A' },
        { id: 'indigo', name: '인디고', hex: '#232D45', line: '#A9B4CB', stitch: '#D8B48A' }
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      soldOut: ['XL'],
      sizeChart: 'outer',
      description: '프랑스 노동자들이 입던 작업복을 14oz 코튼 덕 캔버스로 다시 만들었습니다. 처음엔 빳빳하지만, 몇 달 입으면 팔꿈치와 주머니 모서리부터 부드럽게 길이 듭니다.',
      specs: [
        ['소재', '면 100% · 14oz 덕 캔버스'],
        ['디테일', '패치 포켓 3개 · 코로조 너트 단추'],
        ['핏', '박시한 레귤러 핏'],
        ['관리', '찬물 단독 세탁 · 건조기 사용 금지'],
        ['생산', '대한민국 서울']
      ],
      fabricLabel: '14OZ DUCK CANVAS',
      agingNote: '덕 캔버스는 처음엔 종이처럼 빳빳하지만, 입고 빨수록 접히는 곳부터 색이 빠지고 부드러워집니다.'
    },
    {
      id: 'AP-002',
      name: 'No.47 원워시 셀비지 데님',
      nameEn: 'No.47 One-Wash Selvedge Denim',
      category: 'denim',
      price: 189000,
      badge: 'BEST',
      addedOrder: 6,
      season: '2026 F/W',
      garment: 'jeans',
      backdrop: '#E5DCCB',
      colors: [
        { id: 'indigo', name: '인디고', hex: '#232D45', pattern: 'ap-twill', line: '#A9B4CB', stitch: '#C9A15A' }
      ],
      sizes: ['28', '30', '32', '34', '36'],
      soldOut: [],
      sizeChart: 'denim',
      description: '구식 셔틀 직기로 짠 14.5oz 셀비지 데님을 한 번만 세탁해 내보냅니다. 짙은 남색에서 시작해, 입는 사람의 습관대로 무릎과 허벅지에 페이드가 생깁니다.',
      specs: [
        ['소재', '면 100% · 14.5oz 셀비지 데님'],
        ['디테일', '버튼 플라이 · 체인스티치 밑단'],
        ['핏', '밑으로 갈수록 살짝 좁아지는 테이퍼드 핏'],
        ['관리', '첫 세탁은 뒤집어서 찬물에 · 이후엔 되도록 드물게'],
        ['생산', '대한민국 서울']
      ],
      fabricLabel: '14.5OZ SELVEDGE DENIM',
      agingNote: '원워시 데님은 입고 빨기를 거듭할수록 무릎과 허벅지에 그 사람만의 주름과 페이드가 생깁니다.'
    },
    {
      id: 'AP-003',
      name: '헤비 플란넬 워크 셔츠',
      nameEn: 'Heavy Flannel Work Shirt',
      category: 'shirt',
      price: 98000,
      badge: '',
      addedOrder: 5,
      season: '2026 F/W',
      garment: 'flannel',
      backdrop: '#EAE1D0',
      colors: [
        { id: 'red-check', name: '레드 체크', hex: '#6E3A30', pattern: 'ap-plaid', line: '#EEE6DC', stitch: '#E2D6C4' }
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      soldOut: [],
      sizeChart: 'top',
      description: '양면을 도톰하게 기모 낸 코튼 플란넬로 만든 워크 셔츠입니다. 셔츠로도, 쌀쌀한 날엔 가벼운 겉옷으로도 입을 수 있습니다.',
      specs: [
        ['소재', '면 100% · 헤비 플란넬'],
        ['디테일', '플랩 가슴 포켓 2개'],
        ['핏', '레귤러 핏'],
        ['관리', '찬물 세탁 · 그늘에서 건조'],
        ['생산', '대한민국 서울']
      ],
      fabricLabel: 'HEAVY COTTON FLANNEL',
      agingNote: '플란넬은 빨수록 기모가 차분하게 눕고, 손에 붙는 듯 부드러워집니다.'
    },
    {
      id: 'AP-004',
      name: '루프휠 크루넥 스웨트',
      nameEn: 'Loopwheel Crewneck Sweat',
      category: 'sweat',
      price: 119000,
      badge: '',
      addedOrder: 4,
      season: '2026 F/W',
      garment: 'sweat',
      backdrop: '#E8DDC9',
      colors: [
        { id: 'oatmeal', name: '오트밀', hex: '#C7C2B7', line: '#5E5A52', stitch: '#8B867B' }
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      soldOut: [],
      sizeChart: 'top',
      description: '천천히 도는 루프휠 편직기로 짜서 원단에 무리한 장력이 걸리지 않은 스웨트셔츠입니다. 여러 번 빨아도 형태가 잘 무너지지 않습니다.',
      specs: [
        ['소재', '면 100% · 루프휠 테리'],
        ['디테일', 'V 거셋 · 래글런 소매'],
        ['핏', '레귤러 핏'],
        ['관리', '찬물 세탁 · 건조기 사용 금지'],
        ['생산', '대한민국 서울']
      ],
      fabricLabel: 'LOOPWHEEL TERRY',
      agingNote: '루프휠 스웨트는 입을수록 원단이 몸에 맞게 자리 잡고 한층 부드러워집니다.'
    },
    {
      id: 'AP-005',
      name: 'M-43 필드 재킷',
      nameEn: 'M-43 Field Jacket',
      category: 'outer',
      price: 239000,
      badge: 'NEW',
      addedOrder: 7,
      season: '2026 F/W',
      garment: 'field',
      backdrop: '#E6DCC5',
      colors: [
        { id: 'olive', name: '올리브', hex: '#55593B', line: '#D1CFB0', stitch: '#A4A27E' }
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      soldOut: [],
      sizeChart: 'outer',
      description: '옛 군용 필드 재킷의 넉넉한 패턴을 가져와 단단한 코튼 새틴으로 만들었습니다. 큰 주머니 네 개에 일상 짐을 넉넉히 넣을 수 있습니다.',
      specs: [
        ['소재', '면 100% · 코튼 새틴'],
        ['디테일', '플랩 포켓 4개 · 숨은 단추 여밈'],
        ['핏', '넉넉한 오버 핏'],
        ['관리', '찬물 단독 세탁'],
        ['생산', '대한민국 서울']
      ],
      fabricLabel: 'COTTON SATEEN',
      agingNote: '코튼 새틴은 주머니 모서리와 소매 끝부터 색이 빠지며 오래된 군복 같은 결이 생깁니다.'
    },
    {
      id: 'AP-006',
      name: '와플 헨리넥 롱슬리브',
      nameEn: 'Waffle Henley Long Sleeve',
      category: 'tee',
      price: 59000,
      badge: '',
      addedOrder: 3,
      season: '2026 F/W',
      garment: 'henley',
      backdrop: '#DCCFB8',
      colors: [
        { id: 'ecru', name: '에크루', hex: '#E6DFD1', pattern: 'ap-waffle', line: '#5E5A52', stitch: '#ADA085' }
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      soldOut: [],
      sizeChart: 'top',
      description: '와플 조직 코튼으로 만든 헨리넥 긴소매 티셔츠입니다. 단독으로도, 셔츠나 재킷 안에 받쳐 입기에도 좋습니다.',
      specs: [
        ['소재', '면 100% · 와플 니트'],
        ['디테일', '3버튼 헨리 플라켓'],
        ['핏', '슬림한 레귤러 핏'],
        ['관리', '찬물 세탁 · 뉘어서 건조'],
        ['생산', '대한민국 서울']
      ],
      fabricLabel: 'WAFFLE KNIT',
      agingNote: '와플 조직은 빨수록 요철이 도톰하게 살아나 촉감이 더 포근해집니다.'
    },
    {
      id: 'AP-007',
      name: '체인스티치 워크 캡',
      nameEn: 'Chainstitch Work Cap',
      category: 'acc',
      price: 45000,
      badge: '',
      addedOrder: 2,
      season: '2026 F/W',
      garment: 'cap',
      backdrop: '#E9DFCD',
      colors: [
        { id: 'navy', name: '네이비', hex: '#232D45', line: '#A9B4CB', stitch: '#C9A15A' }
      ],
      sizes: ['FREE'],
      soldOut: [],
      sizeChart: 'cap',
      description: '앞판에 체인스티치 자수를 놓은 코튼 트윌 캡입니다. 뒤쪽 스트랩으로 머리 둘레를 맞출 수 있습니다.',
      specs: [
        ['소재', '면 100% · 코튼 트윌'],
        ['디테일', '체인스티치 자수 · 금속 버클 스트랩'],
        ['사이즈', '머리 둘레 56–60cm 조절'],
        ['관리', '손세탁 권장'],
        ['생산', '대한민국 서울']
      ],
      fabricLabel: 'COTTON TWILL',
      agingNote: '코튼 트윌 캡은 햇볕과 땀에 챙과 윗부분부터 색이 바래며 빈티지한 톤이 됩니다.'
    },
    {
      id: 'AP-008',
      name: '덕 캔버스 토트백',
      nameEn: 'Duck Canvas Tote Bag',
      category: 'acc',
      price: 69000,
      badge: 'LIMITED',
      addedOrder: 1,
      season: '2026 F/W',
      garment: 'tote',
      backdrop: '#E7DCC8',
      colors: [
        { id: 'natural', name: '내추럴', hex: '#D2C3A3', line: '#5E5A52', stitch: '#8C7E61' }
      ],
      sizes: ['FREE'],
      soldOut: [],
      sizeChart: 'tote',
      description: '초어 재킷과 같은 14oz 덕 캔버스로 만든 토트백입니다. 손잡이 끝은 X자로 박음질해 무거운 짐도 버팁니다.',
      specs: [
        ['소재', '면 100% · 14oz 덕 캔버스'],
        ['디테일', '안쪽 포켓 1개 · X자 보강 박음질'],
        ['크기', '가로 40 · 세로 38 · 폭 12cm'],
        ['관리', '손세탁 권장'],
        ['생산', '대한민국 서울']
      ],
      fabricLabel: '14OZ DUCK CANVAS',
      agingNote: '들고 다닐수록 모서리와 손잡이부터 길이 들어, 가방이 손에 맞게 자리 잡습니다.'
    }
  ];

  window.ANIMA_PARS_DATA = Object.freeze({ GARMENTS, CATEGORIES, SIZE_CHARTS, PRODUCTS });
})();
