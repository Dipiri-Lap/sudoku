export interface JigsawStage {
    id: number;
    title: string;
    subtitle: string;
    image: string;
    rows: number;
    cols: number;
    tint: string;
}

const BASE_STAGES: JigsawStage[] = [
    { id: 1, title: '고양이 마당', subtitle: '꽃밭 옆 낮잠', image: '/images/jigsaw/cat-yard.webp', rows: 3, cols: 3, tint: '#5fc98a' },
    { id: 2, title: '곰돌이 소풍', subtitle: '공원 체크무늬 돗자리', image: '/images/jigsaw/bear-picnic.webp', rows: 3, cols: 3, tint: '#ff8a5c' },
    { id: 3, title: '창가의 고양이', subtitle: '창문 밖 엿보기', image: '/images/jigsaw/big-cat.webp', rows: 3, cols: 4, tint: '#f2a65a' },
    { id: 4, title: '토끼 농장', subtitle: '당근이 자라는 밭', image: '/images/jigsaw/bunny-farm.webp', rows: 3, cols: 4, tint: '#f2b33d' },
    { id: 5, title: '여름 해변', subtitle: '모래성과 꽃게', image: '/images/jigsaw/beach.webp', rows: 4, cols: 4, tint: '#2fa6dc' },
    { id: 6, title: '점프하는 고래', subtitle: '노을 바다 물보라', image: '/images/jigsaw/big-whale-2.webp', rows: 3, cols: 4, tint: '#f0803c' },
    { id: 7, title: '꼬마 놀이공원', subtitle: '관람차와 회전목마', image: '/images/jigsaw/amusement.webp', rows: 3, cols: 4, tint: '#8b6be0' },
    { id: 8, title: '꼬마 화가', subtitle: '무지개 그리기', image: '/images/jigsaw/painter-girl.webp', rows: 4, cols: 4, tint: '#b07cd8' },
    { id: 9, title: '펭귄 빙하', subtitle: '얼음 위 미끄럼', image: '/images/jigsaw/penguin.webp', rows: 4, cols: 4, tint: '#3bb8c9' },
    { id: 10, title: '빵집 골목', subtitle: '고양이 제빵사', image: '/images/jigsaw/bakery.webp', rows: 4, cols: 5, tint: '#e0645a' },
    { id: 11, title: '생일 케이크', subtitle: '딸기 세 층', image: '/images/jigsaw/big-cake.webp', rows: 3, cols: 4, tint: '#f78fb3' },
    { id: 12, title: '버섯 마을', subtitle: '고슴도치의 산책', image: '/images/jigsaw/mushroom-village.webp', rows: 3, cols: 4, tint: '#ef6f8e' },
    { id: 13, title: '꽃 화관 토끼', subtitle: '당근 바구니', image: '/images/jigsaw/flower-bunny.webp', rows: 3, cols: 4, tint: '#7cc36b' },
    { id: 14, title: '열기구', subtitle: '곰돌이의 하늘 여행', image: '/images/jigsaw/big-balloon.webp', rows: 4, cols: 4, tint: '#e55039' },
    { id: 15, title: '사막 오아시스', subtitle: '낙타의 쉼터', image: '/images/jigsaw/desert.webp', rows: 4, cols: 4, tint: '#e8a23a' },
    { id: 16, title: '항구 마을', subtitle: '등대와 고깃배', image: '/images/jigsaw/harbor.webp', rows: 3, cols: 4, tint: '#4aa3a8' },
    { id: 17, title: '우산 소녀', subtitle: '비 오는 날 첨벙', image: '/images/jigsaw/umbrella-girl.webp', rows: 4, cols: 4, tint: '#4a69bd' },
    { id: 18, title: '컵케이크 카페', subtitle: '생쥐 웨이터', image: '/images/jigsaw/cupcake-cafe.webp', rows: 3, cols: 4, tint: '#f48fb1' },
    { id: 19, title: '시장 장터', subtitle: '과일 가게 곰돌이', image: '/images/jigsaw/market.webp', rows: 4, cols: 5, tint: '#ff7a6b' },
    { id: 20, title: '모나리자', subtitle: '명화 컬렉션', image: '/images/jigsaw/mona-lisa.webp', rows: 5, cols: 5, tint: '#3a8f86' },
    { id: 21, title: '공룡 계곡', subtitle: '꼬마 화산', image: '/images/jigsaw/dino.webp', rows: 3, cols: 4, tint: '#7a9c3a' },
    { id: 22, title: '부엉이', subtitle: '나뭇가지 위 밤', image: '/images/jigsaw/big-owl.webp', rows: 3, cols: 4, tint: '#0a8f8f' },
    { id: 23, title: '놀이터', subtitle: '미끄럼틀과 그네', image: '/images/jigsaw/playground.webp', rows: 4, cols: 4, tint: '#ff9f43' },
    { id: 24, title: '달 기지', subtitle: '토끼 우주인', image: '/images/jigsaw/moonbase.webp', rows: 4, cols: 4, tint: '#6b7a99' },
    { id: 25, title: '할로윈 호박밭', subtitle: '꼬마 유령', image: '/images/jigsaw/halloween.webp', rows: 4, cols: 5, tint: '#7a4bc2' },
    { id: 26, title: '친구 로봇', subtitle: '손 흔드는 로봇', image: '/images/jigsaw/big-robot.webp', rows: 3, cols: 4, tint: '#8c7ae6' },
    { id: 27, title: '눈밭 캠프', subtitle: '모닥불 옆 여우', image: '/images/jigsaw/snow-camp.webp', rows: 4, cols: 4, tint: '#4b5bd6' },
    { id: 28, title: '동물 병원', subtitle: '곰 선생님의 진료실', image: '/images/jigsaw/animal-clinic.webp', rows: 4, cols: 4, tint: '#2fae8f' },
    { id: 29, title: '해적선 섬', subtitle: '안대 쓴 고양이', image: '/images/jigsaw/pirate.webp', rows: 5, cols: 5, tint: '#2b7bbf' },
    { id: 30, title: '기차역 마을', subtitle: '칙칙폭폭 증기기관차', image: '/images/jigsaw/train.webp', rows: 5, cols: 5, tint: '#d9534f' },
    { id: 31, title: '해바라기', subtitle: '창가 화분', image: '/images/jigsaw/sunflower.webp', rows: 3, cols: 4, tint: '#e1b12c' },
    { id: 32, title: '양 목장', subtitle: '풍차와 양치기 개', image: '/images/jigsaw/sheep.webp', rows: 4, cols: 4, tint: '#8cc152' },
    { id: 33, title: '호숫가 캠핑', subtitle: '오리와 너구리', image: '/images/jigsaw/lake-camp.webp', rows: 4, cols: 4, tint: '#4f8fe0' },
    { id: 34, title: '수영장', subtitle: '오리 튜브', image: '/images/jigsaw/pool.webp', rows: 4, cols: 4, tint: '#26b5c4' },
    { id: 35, title: '대나무 숲', subtitle: '판다 가족', image: '/images/jigsaw/panda.webp', rows: 4, cols: 5, tint: '#4e9a5a' },
    { id: 36, title: '기타 소년', subtitle: '노을 아래 연주', image: '/images/jigsaw/guitar-boy.webp', rows: 3, cols: 4, tint: '#e67e22' },
    { id: 37, title: '과자 나라', subtitle: '초콜릿 강', image: '/images/jigsaw/candy.webp', rows: 4, cols: 5, tint: '#e67fb8' },
    { id: 38, title: '눈썰매장', subtitle: '썰매 타는 아이들', image: '/images/jigsaw/sled-hill.webp', rows: 4, cols: 4, tint: '#5aa9e6' },
    { id: 39, title: '장난감 방', subtitle: '곰인형과 기차', image: '/images/jigsaw/toyroom.webp', rows: 4, cols: 5, tint: '#c98a52' },
    { id: 40, title: '큰 파도', subtitle: '명화 컬렉션', image: '/images/jigsaw/great-wave.webp', rows: 5, cols: 6, tint: '#2f5fae' },
    { id: 41, title: '큰 문어', subtitle: '조개를 든 문어', image: '/images/jigsaw/big-octopus.webp', rows: 3, cols: 4, tint: '#20bf6b' },
    { id: 42, title: '사파리', subtitle: '기린과 코끼리', image: '/images/jigsaw/safari.webp', rows: 4, cols: 4, tint: '#d9a441' },
    { id: 43, title: '잠자는 판다', subtitle: '대나무 방 낮잠', image: '/images/jigsaw/panda-room.webp', rows: 4, cols: 5, tint: '#9b7fd1' },
    { id: 44, title: '아이스크림 가게', subtitle: '토끼의 콘 하나', image: '/images/jigsaw/icecream.webp', rows: 4, cols: 4, tint: '#f27aa6' },
    { id: 45, title: '성과 아기 용', subtitle: '도개교 건너기', image: '/images/jigsaw/castle.webp', rows: 5, cols: 5, tint: '#6a7fd0' },
    { id: 46, title: '유리 온실', subtitle: '꽃집 생쥐', image: '/images/jigsaw/greenhouse.webp', rows: 4, cols: 4, tint: '#56b87a' },
    { id: 47, title: '가을 숲', subtitle: '도토리 줍는 다람쥐', image: '/images/jigsaw/autumn.webp', rows: 4, cols: 4, tint: '#c2502e' },
    { id: 48, title: '우주 고양이', subtitle: '깃발 든 우주인', image: '/images/jigsaw/space-cat.webp', rows: 4, cols: 5, tint: '#3b3b98' },
    { id: 49, title: '벚꽃 공원', subtitle: '연못 옆 꽃놀이', image: '/images/jigsaw/sakura.webp', rows: 5, cols: 5, tint: '#f59ab5' },
    { id: 50, title: '아기 용의 보물', subtitle: '크리스탈 동굴', image: '/images/jigsaw/dragon-cave.webp', rows: 6, cols: 6, tint: '#7b5cc9' },
    { id: 51, title: '산호초', subtitle: '거북이와 물고기', image: '/images/jigsaw/reef.webp', rows: 4, cols: 4, tint: '#2a7fd4' },
    { id: 52, title: '펭귄 아이스크림', subtitle: '눈밭 노점', image: '/images/jigsaw/penguin-icecream.webp', rows: 3, cols: 4, tint: '#4aa8e0' },
    { id: 53, title: '할머니 텃밭', subtitle: '토마토 바구니', image: '/images/jigsaw/grandma-garden.webp', rows: 4, cols: 5, tint: '#e8a33d' },
    { id: 54, title: '카피바라 온천', subtitle: '유자 동동', image: '/images/jigsaw/onsen.webp', rows: 4, cols: 5, tint: '#c97b4a' },
    { id: 55, title: '야시장', subtitle: '등불 아래 먹거리', image: '/images/jigsaw/night-market.webp', rows: 5, cols: 5, tint: '#2f3a7a' },
    { id: 56, title: '햄스터', subtitle: '해바라기씨 냠냠', image: '/images/jigsaw/big-hamster.webp', rows: 4, cols: 4, tint: '#f2b45c' },
    { id: 57, title: '소방서', subtitle: '달마시안 친구', image: '/images/jigsaw/fire-station.webp', rows: 4, cols: 5, tint: '#e04848' },
    { id: 58, title: '수족관 해파리', subtitle: '유리창 너머 친구들', image: '/images/jigsaw/aquarium.webp', rows: 4, cols: 5, tint: '#1fa5b8' },
    { id: 59, title: '개미 마을', subtitle: '땅속 방들', image: '/images/jigsaw/ant-colony.webp', rows: 5, cols: 5, tint: '#9a6b3f' },
    { id: 61, title: '연잎 개구리', subtitle: '연꽃 한 송이', image: '/images/jigsaw/big-frog.webp', rows: 4, cols: 4, tint: '#2fb39b' },
    { id: 62, title: '수박 조각', subtitle: '여름 소풍', image: '/images/jigsaw/big-watermelon.webp', rows: 4, cols: 4, tint: '#e8505b' },
    { id: 63, title: '기차 여행 곰', subtitle: '창가의 도시락', image: '/images/jigsaw/train-bear.webp', rows: 4, cols: 5, tint: '#e8833a' },
    { id: 64, title: '캠핑카 여행', subtitle: '숲속 쉼터', image: '/images/jigsaw/campervan.webp', rows: 4, cols: 5, tint: '#5fbf9f' },
    { id: 65, title: '꿀벌 양봉장', subtitle: '곰 양봉가', image: '/images/jigsaw/bee-farm.webp', rows: 5, cols: 5, tint: '#f0c419' },
    { id: 66, title: '우체국', subtitle: '비둘기 집배원', image: '/images/jigsaw/post-office.webp', rows: 4, cols: 4, tint: '#d9534f' },
    { id: 67, title: '비 오는 골목', subtitle: '물웅덩이 첨벙', image: '/images/jigsaw/rainy-street.webp', rows: 4, cols: 5, tint: '#6c7fa3' },
    { id: 68, title: '벽난로 고양이', subtitle: '오두막의 겨울밤', image: '/images/jigsaw/fireplace-cat.webp', rows: 4, cols: 5, tint: '#a0623a' },
    { id: 69, title: '정글 탐험', subtitle: '곰 탐험가의 보트', image: '/images/jigsaw/jungle.webp', rows: 5, cols: 5, tint: '#3c9a4c' },
    { id: 70, title: '서커스', subtitle: '공 굴리는 물범', image: '/images/jigsaw/circus.webp', rows: 5, cols: 6, tint: '#d93a3a' },
    { id: 71, title: '크리스마스 마을', subtitle: '트리 아래 선물', image: '/images/jigsaw/xmas-village.webp', rows: 4, cols: 5, tint: '#d64545' },
    { id: 72, title: '아기 펭귄', subtitle: '목도리와 귀마개', image: '/images/jigsaw/big-penguin.webp', rows: 4, cols: 4, tint: '#6cb8ee' },
    { id: 73, title: '수달 가족', subtitle: '강물 위 낮잠', image: '/images/jigsaw/otter.webp', rows: 4, cols: 5, tint: '#25b5c9' },
    { id: 74, title: '사과 과수원', subtitle: '곰돌이의 수확', image: '/images/jigsaw/orchard.webp', rows: 4, cols: 5, tint: '#5fbf6a' },
    { id: 75, title: '요정 숲', subtitle: '버섯집과 무지개', image: '/images/jigsaw/fairy-forest.webp', rows: 5, cols: 5, tint: '#3fae8c' },
    { id: 76, title: '꼬마 교실', subtitle: '부엉이 선생님', image: '/images/jigsaw/classroom.webp', rows: 4, cols: 5, tint: '#d9944f' },
    { id: 77, title: '피자 가게', subtitle: '고양이 요리사', image: '/images/jigsaw/pizza-kitchen.webp', rows: 4, cols: 5, tint: '#e0763c' },
    { id: 78, title: '초밥 가게', subtitle: '회전 초밥', image: '/images/jigsaw/sushi.webp', rows: 4, cols: 5, tint: '#c9945c' },
    { id: 79, title: '노란 잠수함', subtitle: '펭귄 선장', image: '/images/jigsaw/submarine.webp', rows: 5, cols: 6, tint: '#2d9fd6' },
    { id: 81, title: '아기 공룡', subtitle: '알에서 깼어요', image: '/images/jigsaw/baby-dino.webp', rows: 4, cols: 4, tint: '#f39a7a' },
    { id: 82, title: '강아지 공원', subtitle: '공 던지기', image: '/images/jigsaw/dog-park.webp', rows: 4, cols: 5, tint: '#6cbf4f' },
    { id: 83, title: '공룡 박물관', subtitle: '티라노 뼈', image: '/images/jigsaw/dino-museum.webp', rows: 4, cols: 5, tint: '#c9a46a' },
    { id: 84, title: '물의 도시', subtitle: '곤돌라 산책', image: '/images/jigsaw/canal-town.webp', rows: 5, cols: 5, tint: '#3d8fd6' },
    { id: 85, title: '고양이 카페', subtitle: '낮잠 자는 고양이들', image: '/images/jigsaw/cat-cafe.webp', rows: 5, cols: 5, tint: '#d98f4e' },
    { id: 86, title: '고슴도치', subtitle: '사과와 버섯', image: '/images/jigsaw/hedgehog.webp', rows: 4, cols: 4, tint: '#ef8a3a' },
    { id: 87, title: '피라미드 탐험', subtitle: '여우 탐험가', image: '/images/jigsaw/pyramid.webp', rows: 5, cols: 5, tint: '#e6b43a' },
    { id: 88, title: '별 보는 천문대', subtitle: '별똥별 소원', image: '/images/jigsaw/observatory.webp', rows: 4, cols: 5, tint: '#283b7a' },
    { id: 89, title: '비밀 정원 미로', subtitle: '분수를 찾아서', image: '/images/jigsaw/hedge-maze.webp', rows: 5, cols: 5, tint: '#4fae5a' },
    { id: 90, title: '하늘 섬 마을', subtitle: '구름 위 다리', image: '/images/jigsaw/sky-islands.webp', rows: 6, cols: 6, tint: '#5aa9e6' },
    { id: 91, title: '우주선', subtitle: '고양이 조종사', image: '/images/jigsaw/spaceship.webp', rows: 4, cols: 4, tint: '#3a3f8f' },
    { id: 92, title: '낚시하는 곰', subtitle: '호수의 오후', image: '/images/jigsaw/fishing-bear.webp', rows: 4, cols: 5, tint: '#2f8fd6' },
    { id: 93, title: '정원 티파티', subtitle: '토끼의 찻잔', image: '/images/jigsaw/tea-party.webp', rows: 5, cols: 5, tint: '#5fbf6a' },
    { id: 94, title: '동물 음악대', subtitle: '공원 무대 공연', image: '/images/jigsaw/animal-band.webp', rows: 4, cols: 5, tint: '#e05a5a' },
    { id: 95, title: '오로라 마을', subtitle: '썰매 끄는 허스키', image: '/images/jigsaw/aurora-village.webp', rows: 5, cols: 6, tint: '#2b3a8f' },
    { id: 96, title: '문구점 책상', subtitle: '그림 그리는 오후', image: '/images/jigsaw/stationery.webp', rows: 4, cols: 4, tint: '#e8a94f' },
    { id: 97, title: '등대 언덕', subtitle: '바닷가 산책', image: '/images/jigsaw/lighthouse-cliff.webp', rows: 5, cols: 5, tint: '#2f7fd6' },
    { id: 98, title: '장난감 가게', subtitle: '진열장 속 친구들', image: '/images/jigsaw/toy-shelf.webp', rows: 5, cols: 5, tint: '#e8a63a' },
    { id: 99, title: '여름 축제', subtitle: '불꽃놀이 밤', image: '/images/jigsaw/summer-festival.webp', rows: 5, cols: 5, tint: '#6a4bb5' },
    { id: 101, title: '아침 식탁', subtitle: '팬케이크와 과일', image: '/images/jigsaw/breakfast.webp', rows: 4, cols: 5, tint: '#ef7aa0' },
];

/** DEV only: `/jigsaw?fake=1000` pads the list with copies of the real stages to test large stage counts. */
function withDevFakes(list: JigsawStage[]): JigsawStage[] {
    if (!import.meta.env.DEV || typeof window === 'undefined') return list;
    const n = Number(new URLSearchParams(window.location.search).get('fake'));
    if (!Number.isFinite(n) || n <= list.length) return list;
    const out = [...list];
    for (let id = list.length + 1; id <= Math.min(n, 5000); id++) {
        const src = list[(id - 1) % list.length];
        out.push({ ...src, id, title: `${src.title} #${id}` });
    }
    return out;
}

/**
 * Masterpiece stages reserved for every 20th slot beyond what BASE_STAGES covers yet.
 * Each one is appended automatically once BASE_STAGES reaches the stage right before it,
 * so adding normal stages 51~59 makes stage 60 appear on its own (normal stages skip ids 60/80/100).
 */
const RESERVED_MASTERPIECES: JigsawStage[] = [
    { id: 60, title: '진주 귀걸이 소녀', subtitle: '명화 컬렉션', image: '/images/jigsaw/pearl-earring.webp', rows: 5, cols: 6, tint: '#3d63c9' },
    { id: 80, title: '절규', subtitle: '명화 컬렉션', image: '/images/jigsaw/the-scream.webp', rows: 5, cols: 6, tint: '#e2622f' },
    { id: 100, title: '별이 빛나는 밤', subtitle: '명화 컬렉션', image: '/images/jigsaw/starry-night.webp', rows: 6, cols: 7, tint: '#26357a' },
    { id: 120, title: '키스', subtitle: '명화 컬렉션', image: '/images/jigsaw/the-kiss.webp', rows: 6, cols: 6, tint: '#d4a017' },
    { id: 140, title: '양산을 쓴 여인', subtitle: '명화 컬렉션', image: '/images/jigsaw/parasol.webp', rows: 6, cols: 6, tint: '#3d9be0' },
    { id: 160, title: '그랑드 자트 섬', subtitle: '명화 컬렉션', image: '/images/jigsaw/grande-jatte.webp', rows: 6, cols: 7, tint: '#4f9a5a' },
    { id: 180, title: '이삭 줍는 여인들', subtitle: '명화 컬렉션', image: '/images/jigsaw/gleaners.webp', rows: 6, cols: 6, tint: '#d9a441' },
    { id: 200, title: '씨름', subtitle: '명화 컬렉션', image: '/images/jigsaw/ssireum.webp', rows: 7, cols: 7, tint: '#c98a52' },
];

function withMasterpieces(list: JigsawStage[]): JigsawStage[] {
    const out = [...list];
    for (const m of RESERVED_MASTERPIECES) {
        // only when the stage right before it exists, and nothing already uses its id
        if (out.some((s) => s.id === m.id - 1) && !out.some((s) => s.id === m.id)) out.push(m);
    }
    return out.sort((a, b) => a.id - b.id);
}

export const JIGSAW_STAGES: JigsawStage[] = withDevFakes(withMasterpieces(BASE_STAGES));

export const CHAPTER_SIZE = 20;
export const RANGE_SIZE = 100;

/** DEV only: `/jigsaw?unlockall` opens every stage for testing. */
const DEV_UNLOCK_ALL =
    import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('unlockall');

/** A stage opens once the previous one has at least one star. */
export function isStageUnlocked(index: number, stars: Record<number, number>): boolean {
    return DEV_UNLOCK_ALL || index === 0 || (stars[JIGSAW_STAGES[index - 1].id] ?? 0) > 0;
}

/** Index of the furthest stage the player may open. */
export function lastUnlockedIdx(stars: Record<number, number>): number {
    if (DEV_UNLOCK_ALL) return JIGSAW_STAGES.length - 1;
    const i = JIGSAW_STAGES.findIndex((s) => !(stars[s.id] > 0));
    return i === -1 ? JIGSAW_STAGES.length - 1 : i;
}

/** 3★: moves ≤ pieces, 2★: ≤ pieces × 1.6, otherwise 1★ */
export function starsFor(stage: JigsawStage, moves: number): number {
    const n = stage.rows * stage.cols;
    if (moves <= n) return 3;
    if (moves <= Math.ceil(n * 1.6)) return 2;
    return 1;
}

const STARS_KEY = 'jigsaw-stars';

/** fired after stars are saved so progress hooks (challenges) refresh in the same tab */
export const JIGSAW_PROGRESS_EVENT = 'jigsaw-progress-change';

/** DEV only: opening `/jigsaw?reset` wipes saved progress once, then removes the param from the URL. */
if (import.meta.env.DEV && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.has('reset')) {
        try {
            localStorage.removeItem(STARS_KEY);
            localStorage.removeItem('jigsaw-cleared'); // legacy key from the first version
        } catch {
            /* ignore */
        }
        url.searchParams.delete('reset');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
}

export function loadStars(): Record<number, number> {
    try {
        const raw = localStorage.getItem(STARS_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        return obj && typeof obj === 'object' ? obj : {};
    } catch {
        return {};
    }
}

/** Saves the best star count; returns true when it's a new record. */
export function saveStars(stageId: number, stars: number): boolean {
    try {
        const all = loadStars();
        if ((all[stageId] ?? 0) >= stars) return false;
        all[stageId] = stars;
        localStorage.setItem(STARS_KEY, JSON.stringify(all));
        window.dispatchEvent(new Event(JIGSAW_PROGRESS_EVENT));
        return true;
    } catch {
        return false;
    }
}
