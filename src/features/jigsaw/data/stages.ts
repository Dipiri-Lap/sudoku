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
    { id: 10, title: '모나리자', subtitle: '명화 컬렉션', image: '/images/jigsaw/mona-lisa.webp', rows: 4, cols: 5, tint: '#3a8f86' },
    { id: 11, title: '빵집 골목', subtitle: '고양이 제빵사', image: '/images/jigsaw/bakery.webp', rows: 4, cols: 5, tint: '#e0645a' },
    { id: 12, title: '생일 케이크', subtitle: '딸기 세 층', image: '/images/jigsaw/big-cake.webp', rows: 3, cols: 4, tint: '#f78fb3' },
    { id: 13, title: '버섯 마을', subtitle: '고슴도치의 산책', image: '/images/jigsaw/mushroom-village.webp', rows: 3, cols: 4, tint: '#ef6f8e' },
    { id: 14, title: '꽃 화관 토끼', subtitle: '당근 바구니', image: '/images/jigsaw/flower-bunny.webp', rows: 3, cols: 4, tint: '#7cc36b' },
    { id: 15, title: '열기구', subtitle: '곰돌이의 하늘 여행', image: '/images/jigsaw/big-balloon.webp', rows: 4, cols: 4, tint: '#e55039' },
    { id: 16, title: '사막 오아시스', subtitle: '낙타의 쉼터', image: '/images/jigsaw/desert.webp', rows: 4, cols: 4, tint: '#e8a23a' },
    { id: 17, title: '항구 마을', subtitle: '등대와 고깃배', image: '/images/jigsaw/harbor.webp', rows: 3, cols: 4, tint: '#4aa3a8' },
    { id: 18, title: '우산 소녀', subtitle: '비 오는 날 첨벙', image: '/images/jigsaw/umbrella-girl.webp', rows: 4, cols: 4, tint: '#4a69bd' },
    { id: 19, title: '컵케이크 카페', subtitle: '생쥐 웨이터', image: '/images/jigsaw/cupcake-cafe.webp', rows: 3, cols: 4, tint: '#f48fb1' },
    { id: 20, title: '진주 귀걸이 소녀', subtitle: '명화 컬렉션', image: '/images/jigsaw/pearl-earring.webp', rows: 5, cols: 5, tint: '#3d63c9' },
    { id: 21, title: '시장 장터', subtitle: '과일 가게 곰돌이', image: '/images/jigsaw/market.webp', rows: 4, cols: 5, tint: '#ff7a6b' },
    { id: 22, title: '공룡 계곡', subtitle: '꼬마 화산', image: '/images/jigsaw/dino.webp', rows: 3, cols: 4, tint: '#7a9c3a' },
    { id: 23, title: '부엉이', subtitle: '나뭇가지 위 밤', image: '/images/jigsaw/big-owl.webp', rows: 3, cols: 4, tint: '#0a8f8f' },
    { id: 24, title: '놀이터', subtitle: '미끄럼틀과 그네', image: '/images/jigsaw/playground.webp', rows: 4, cols: 4, tint: '#ff9f43' },
    { id: 25, title: '달 기지', subtitle: '토끼 우주인', image: '/images/jigsaw/moonbase.webp', rows: 4, cols: 4, tint: '#6b7a99' },
    { id: 26, title: '할로윈 호박밭', subtitle: '꼬마 유령', image: '/images/jigsaw/halloween.webp', rows: 4, cols: 5, tint: '#7a4bc2' },
    { id: 27, title: '친구 로봇', subtitle: '손 흔드는 로봇', image: '/images/jigsaw/big-robot.webp', rows: 3, cols: 4, tint: '#8c7ae6' },
    { id: 28, title: '눈밭 캠프', subtitle: '모닥불 옆 여우', image: '/images/jigsaw/snow-camp.webp', rows: 4, cols: 4, tint: '#4b5bd6' },
    { id: 29, title: '동물 병원', subtitle: '곰 선생님의 진료실', image: '/images/jigsaw/animal-clinic.webp', rows: 4, cols: 4, tint: '#2fae8f' },
    { id: 30, title: '큰 파도', subtitle: '명화 컬렉션', image: '/images/jigsaw/great-wave.webp', rows: 5, cols: 5, tint: '#2f5fae' },
    { id: 31, title: '해적선 섬', subtitle: '안대 쓴 고양이', image: '/images/jigsaw/pirate.webp', rows: 5, cols: 5, tint: '#2b7bbf' },
    { id: 32, title: '기차역 마을', subtitle: '칙칙폭폭 증기기관차', image: '/images/jigsaw/train.webp', rows: 5, cols: 5, tint: '#d9534f' },
    { id: 33, title: '해바라기', subtitle: '창가 화분', image: '/images/jigsaw/sunflower.webp', rows: 3, cols: 4, tint: '#e1b12c' },
    { id: 34, title: '양 목장', subtitle: '풍차와 양치기 개', image: '/images/jigsaw/sheep.webp', rows: 4, cols: 4, tint: '#8cc152' },
    { id: 35, title: '호숫가 캠핑', subtitle: '오리와 너구리', image: '/images/jigsaw/lake-camp.webp', rows: 4, cols: 4, tint: '#4f8fe0' },
    { id: 36, title: '수영장', subtitle: '오리 튜브', image: '/images/jigsaw/pool.webp', rows: 4, cols: 4, tint: '#26b5c4' },
    { id: 37, title: '대나무 숲', subtitle: '판다 가족', image: '/images/jigsaw/panda.webp', rows: 4, cols: 5, tint: '#4e9a5a' },
    { id: 38, title: '기타 소년', subtitle: '노을 아래 연주', image: '/images/jigsaw/guitar-boy.webp', rows: 3, cols: 4, tint: '#e67e22' },
    { id: 39, title: '과자 나라', subtitle: '초콜릿 강', image: '/images/jigsaw/candy.webp', rows: 4, cols: 5, tint: '#e67fb8' },
    { id: 40, title: '양산을 쓴 여인', subtitle: '명화 컬렉션', image: '/images/jigsaw/parasol.webp', rows: 5, cols: 6, tint: '#3d9be0' },
    { id: 41, title: '눈썰매장', subtitle: '썰매 타는 아이들', image: '/images/jigsaw/sled-hill.webp', rows: 4, cols: 4, tint: '#5aa9e6' },
    { id: 42, title: '장난감 방', subtitle: '곰인형과 기차', image: '/images/jigsaw/toyroom.webp', rows: 4, cols: 5, tint: '#c98a52' },
    { id: 43, title: '큰 문어', subtitle: '조개를 든 문어', image: '/images/jigsaw/big-octopus.webp', rows: 3, cols: 4, tint: '#20bf6b' },
    { id: 44, title: '사파리', subtitle: '기린과 코끼리', image: '/images/jigsaw/safari.webp', rows: 4, cols: 4, tint: '#d9a441' },
    { id: 45, title: '잠자는 판다', subtitle: '대나무 방 낮잠', image: '/images/jigsaw/panda-room.webp', rows: 4, cols: 5, tint: '#9b7fd1' },
    { id: 46, title: '아이스크림 가게', subtitle: '토끼의 콘 하나', image: '/images/jigsaw/icecream.webp', rows: 4, cols: 4, tint: '#f27aa6' },
    { id: 47, title: '성과 아기 용', subtitle: '도개교 건너기', image: '/images/jigsaw/castle.webp', rows: 5, cols: 5, tint: '#6a7fd0' },
    { id: 48, title: '유리 온실', subtitle: '꽃집 생쥐', image: '/images/jigsaw/greenhouse.webp', rows: 4, cols: 4, tint: '#56b87a' },
    { id: 49, title: '가을 숲', subtitle: '도토리 줍는 다람쥐', image: '/images/jigsaw/autumn.webp', rows: 4, cols: 4, tint: '#c2502e' },
    { id: 50, title: '씨름', subtitle: '명화 컬렉션', image: '/images/jigsaw/ssireum.webp', rows: 6, cols: 6, tint: '#c98a52' },
    { id: 51, title: '우주 고양이', subtitle: '깃발 든 우주인', image: '/images/jigsaw/space-cat.webp', rows: 4, cols: 5, tint: '#3b3b98' },
    { id: 52, title: '벚꽃 공원', subtitle: '연못 옆 꽃놀이', image: '/images/jigsaw/sakura.webp', rows: 5, cols: 5, tint: '#f59ab5' },
    { id: 53, title: '아기 용의 보물', subtitle: '크리스탈 동굴', image: '/images/jigsaw/dragon-cave.webp', rows: 6, cols: 6, tint: '#7b5cc9' },
    { id: 54, title: '산호초', subtitle: '거북이와 물고기', image: '/images/jigsaw/reef.webp', rows: 4, cols: 4, tint: '#2a7fd4' },
    { id: 55, title: '펭귄 아이스크림', subtitle: '눈밭 노점', image: '/images/jigsaw/penguin-icecream.webp', rows: 3, cols: 4, tint: '#4aa8e0' },
    { id: 56, title: '할머니 텃밭', subtitle: '토마토 바구니', image: '/images/jigsaw/grandma-garden.webp', rows: 4, cols: 5, tint: '#e8a33d' },
    { id: 57, title: '카피바라 온천', subtitle: '유자 동동', image: '/images/jigsaw/onsen.webp', rows: 4, cols: 5, tint: '#c97b4a' },
    { id: 58, title: '야시장', subtitle: '등불 아래 먹거리', image: '/images/jigsaw/night-market.webp', rows: 5, cols: 5, tint: '#2f3a7a' },
    { id: 59, title: '햄스터', subtitle: '해바라기씨 냠냠', image: '/images/jigsaw/big-hamster.webp', rows: 4, cols: 4, tint: '#f2b45c' },
    { id: 60, title: '절규', subtitle: '명화 컬렉션', image: '/images/jigsaw/the-scream.webp', rows: 5, cols: 6, tint: '#e2622f' },
    { id: 61, title: '소방서', subtitle: '달마시안 친구', image: '/images/jigsaw/fire-station.webp', rows: 4, cols: 5, tint: '#e04848' },
    { id: 62, title: '수족관 해파리', subtitle: '유리창 너머 친구들', image: '/images/jigsaw/aquarium.webp', rows: 4, cols: 5, tint: '#1fa5b8' },
    { id: 63, title: '개미 마을', subtitle: '땅속 방들', image: '/images/jigsaw/ant-colony.webp', rows: 5, cols: 5, tint: '#9a6b3f' },
    { id: 64, title: '연잎 개구리', subtitle: '연꽃 한 송이', image: '/images/jigsaw/big-frog.webp', rows: 4, cols: 4, tint: '#2fb39b' },
    { id: 65, title: '수박 조각', subtitle: '여름 소풍', image: '/images/jigsaw/big-watermelon.webp', rows: 4, cols: 4, tint: '#e8505b' },
    { id: 66, title: '기차 여행 곰', subtitle: '창가의 도시락', image: '/images/jigsaw/train-bear.webp', rows: 4, cols: 5, tint: '#e8833a' },
    { id: 67, title: '캠핑카 여행', subtitle: '숲속 쉼터', image: '/images/jigsaw/campervan.webp', rows: 4, cols: 5, tint: '#5fbf9f' },
    { id: 68, title: '꿀벌 양봉장', subtitle: '곰 양봉가', image: '/images/jigsaw/bee-farm.webp', rows: 5, cols: 5, tint: '#f0c419' },
    { id: 69, title: '우체국', subtitle: '비둘기 집배원', image: '/images/jigsaw/post-office.webp', rows: 4, cols: 4, tint: '#d9534f' },
    { id: 70, title: '키스', subtitle: '명화 컬렉션', image: '/images/jigsaw/the-kiss.webp', rows: 5, cols: 6, tint: '#d4a017' },
    { id: 71, title: '비 오는 골목', subtitle: '물웅덩이 첨벙', image: '/images/jigsaw/rainy-street.webp', rows: 4, cols: 5, tint: '#6c7fa3' },
    { id: 72, title: '벽난로 고양이', subtitle: '오두막의 겨울밤', image: '/images/jigsaw/fireplace-cat.webp', rows: 4, cols: 5, tint: '#a0623a' },
    { id: 73, title: '정글 탐험', subtitle: '곰 탐험가의 보트', image: '/images/jigsaw/jungle.webp', rows: 5, cols: 5, tint: '#3c9a4c' },
    { id: 74, title: '서커스', subtitle: '공 굴리는 물범', image: '/images/jigsaw/circus.webp', rows: 5, cols: 6, tint: '#d93a3a' },
    { id: 75, title: '크리스마스 마을', subtitle: '트리 아래 선물', image: '/images/jigsaw/xmas-village.webp', rows: 4, cols: 5, tint: '#d64545' },
    { id: 76, title: '아기 펭귄', subtitle: '목도리와 귀마개', image: '/images/jigsaw/big-penguin.webp', rows: 4, cols: 4, tint: '#6cb8ee' },
    { id: 77, title: '수달 가족', subtitle: '강물 위 낮잠', image: '/images/jigsaw/otter.webp', rows: 4, cols: 5, tint: '#25b5c9' },
    { id: 78, title: '사과 과수원', subtitle: '곰돌이의 수확', image: '/images/jigsaw/orchard.webp', rows: 4, cols: 5, tint: '#5fbf6a' },
    { id: 79, title: '요정 숲', subtitle: '버섯집과 무지개', image: '/images/jigsaw/fairy-forest.webp', rows: 5, cols: 5, tint: '#3fae8c' },
    { id: 80, title: '이삭 줍는 여인들', subtitle: '명화 컬렉션', image: '/images/jigsaw/gleaners.webp', rows: 5, cols: 6, tint: '#d9a441' },
    { id: 81, title: '꼬마 교실', subtitle: '부엉이 선생님', image: '/images/jigsaw/classroom.webp', rows: 4, cols: 5, tint: '#d9944f' },
    { id: 82, title: '피자 가게', subtitle: '고양이 요리사', image: '/images/jigsaw/pizza-kitchen.webp', rows: 4, cols: 5, tint: '#e0763c' },
    { id: 83, title: '초밥 가게', subtitle: '회전 초밥', image: '/images/jigsaw/sushi.webp', rows: 4, cols: 5, tint: '#c9945c' },
    { id: 84, title: '노란 잠수함', subtitle: '펭귄 선장', image: '/images/jigsaw/submarine.webp', rows: 5, cols: 6, tint: '#2d9fd6' },
    { id: 85, title: '아기 공룡', subtitle: '알에서 깼어요', image: '/images/jigsaw/baby-dino.webp', rows: 4, cols: 4, tint: '#f39a7a' },
    { id: 86, title: '강아지 공원', subtitle: '공 던지기', image: '/images/jigsaw/dog-park.webp', rows: 4, cols: 5, tint: '#6cbf4f' },
    { id: 87, title: '공룡 박물관', subtitle: '티라노 뼈', image: '/images/jigsaw/dino-museum.webp', rows: 4, cols: 5, tint: '#c9a46a' },
    { id: 88, title: '물의 도시', subtitle: '곤돌라 산책', image: '/images/jigsaw/canal-town.webp', rows: 5, cols: 5, tint: '#3d8fd6' },
    { id: 89, title: '고양이 카페', subtitle: '낮잠 자는 고양이들', image: '/images/jigsaw/cat-cafe.webp', rows: 5, cols: 5, tint: '#d98f4e' },
    { id: 90, title: '그랑드 자트 섬', subtitle: '명화 컬렉션', image: '/images/jigsaw/grande-jatte.webp', rows: 6, cols: 6, tint: '#4f9a5a' },
    { id: 91, title: '고슴도치', subtitle: '사과와 버섯', image: '/images/jigsaw/hedgehog.webp', rows: 4, cols: 4, tint: '#ef8a3a' },
    { id: 92, title: '피라미드 탐험', subtitle: '여우 탐험가', image: '/images/jigsaw/pyramid.webp', rows: 5, cols: 5, tint: '#e6b43a' },
    { id: 93, title: '별 보는 천문대', subtitle: '별똥별 소원', image: '/images/jigsaw/observatory.webp', rows: 4, cols: 5, tint: '#283b7a' },
    { id: 94, title: '비밀 정원 미로', subtitle: '분수를 찾아서', image: '/images/jigsaw/hedge-maze.webp', rows: 5, cols: 5, tint: '#4fae5a' },
    { id: 95, title: '하늘 섬 마을', subtitle: '구름 위 다리', image: '/images/jigsaw/sky-islands.webp', rows: 6, cols: 6, tint: '#5aa9e6' },
    { id: 96, title: '우주선', subtitle: '고양이 조종사', image: '/images/jigsaw/spaceship.webp', rows: 4, cols: 4, tint: '#3a3f8f' },
    { id: 97, title: '낚시하는 곰', subtitle: '호수의 오후', image: '/images/jigsaw/fishing-bear.webp', rows: 4, cols: 5, tint: '#2f8fd6' },
    { id: 98, title: '정원 티파티', subtitle: '토끼의 찻잔', image: '/images/jigsaw/tea-party.webp', rows: 5, cols: 5, tint: '#5fbf6a' },
    { id: 99, title: '동물 음악대', subtitle: '공원 무대 공연', image: '/images/jigsaw/animal-band.webp', rows: 4, cols: 5, tint: '#e05a5a' },
    { id: 100, title: '별이 빛나는 밤', subtitle: '명화 컬렉션', image: '/images/jigsaw/starry-night.webp', rows: 6, cols: 7, tint: '#26357a' },
    { id: 101, title: '오로라 마을', subtitle: '썰매 끄는 허스키', image: '/images/jigsaw/aurora-village.webp', rows: 5, cols: 6, tint: '#2b3a8f' },
    { id: 102, title: '문구점 책상', subtitle: '그림 그리는 오후', image: '/images/jigsaw/stationery.webp', rows: 4, cols: 4, tint: '#e8a94f' },
    { id: 103, title: '등대 언덕', subtitle: '바닷가 산책', image: '/images/jigsaw/lighthouse-cliff.webp', rows: 5, cols: 5, tint: '#2f7fd6' },
    { id: 104, title: '장난감 가게', subtitle: '진열장 속 친구들', image: '/images/jigsaw/toy-shelf.webp', rows: 5, cols: 5, tint: '#e8a63a' },
    { id: 105, title: '여름 축제', subtitle: '불꽃놀이 밤', image: '/images/jigsaw/summer-festival.webp', rows: 5, cols: 5, tint: '#6a4bb5' },
    { id: 106, title: '아침 식탁', subtitle: '팬케이크와 과일', image: '/images/jigsaw/breakfast.webp', rows: 4, cols: 5, tint: '#ef7aa0' },
    { id: 107, title: '여우 사과 과수원', subtitle: '사과 따는 날', image: '/images/jigsaw/fox-orchard.webp', rows: 4, cols: 4, tint: '#4fae52' },
    { id: 108, title: '도자기 공방', subtitle: '빚고 굽는 하루', image: '/images/jigsaw/pottery-studio.webp', rows: 5, cols: 5, tint: '#e0a870' },
    { id: 109, title: '기린 빨래방', subtitle: '높이 널어요', image: '/images/jigsaw/giraffe-laundry.webp', rows: 4, cols: 4, tint: '#5cc08a' },
    { id: 111, title: '우체국 마을', subtitle: '편지 왔어요', image: '/images/jigsaw/post-office-2.webp', rows: 4, cols: 5, tint: '#58b868' },
    { id: 112, title: '아이스크림 트럭', subtitle: '여름 간식', image: '/images/jigsaw/icecream-truck.webp', rows: 4, cols: 5, tint: '#f08fb0' },
    { id: 113, title: '나무늘보 해먹', subtitle: '느긋한 오후', image: '/images/jigsaw/sloth-hammock.webp', rows: 4, cols: 4, tint: '#e9779e' },
    { id: 114, title: '꽃시장', subtitle: '꽃향기 가득', image: '/images/jigsaw/flower-market.webp', rows: 5, cols: 5, tint: '#f2a0b8' },
    { id: 115, title: '보물 잠수함', subtitle: '바닷속 탐험', image: '/images/jigsaw/submarine-2.webp', rows: 4, cols: 4, tint: '#2f8fe0' },
    { id: 116, title: '설날 한옥 마을', subtitle: '새해 복 많이', image: '/images/jigsaw/hanok-village.webp', rows: 4, cols: 5, tint: '#2c3f86' },
    { id: 117, title: '로봇 요리사', subtitle: '로봇의 요리 시간', image: '/images/jigsaw/robot-kitchen.webp', rows: 4, cols: 4, tint: '#e8b988' },
    { id: 118, title: '신발 속 마을', subtitle: '집이 된 운동화', image: '/images/jigsaw/shoe-village.webp', rows: 4, cols: 4, tint: '#59b85a' },
    { id: 119, title: 'UFO 택배 터미널', subtitle: '우주 배송 중', image: '/images/jigsaw/ufo-delivery.webp', rows: 5, cols: 6, tint: '#3b2a78' },
    { id: 121, title: '악어 치과', subtitle: '아~ 해보세요', image: '/images/jigsaw/croc-dentist.webp', rows: 4, cols: 4, tint: '#f07fa8' },
    { id: 122, title: '도시락 나라', subtitle: '소풍 가는 길', image: '/images/jigsaw/bento-world.webp', rows: 4, cols: 5, tint: '#e86f8d' },
    { id: 123, title: '즐거운 운동회', subtitle: '영차 영차', image: '/images/jigsaw/sports-day.webp', rows: 4, cols: 5, tint: '#4fb0ee' },
    { id: 124, title: '버섯 숲 사슴', subtitle: '반딧불 숲', image: '/images/jigsaw/mushroom-deer.webp', rows: 4, cols: 4, tint: '#4f9a63' },
    { id: 125, title: '마법약 가게', subtitle: '보글보글', image: '/images/jigsaw/potion-shop.webp', rows: 5, cols: 6, tint: '#6a3f8f' },
    { id: 126, title: '하마 수영장', subtitle: '여름 한낮', image: '/images/jigsaw/hippo-pool.webp', rows: 4, cols: 4, tint: '#38c0d8' },
    { id: 127, title: '거북이 섬', subtitle: '등 위의 마을', image: '/images/jigsaw/turtle-island.webp', rows: 4, cols: 4, tint: '#3fb3d6' },
    { id: 128, title: '비밀 도서관', subtitle: '책 속 마법', image: '/images/jigsaw/magic-library.webp', rows: 5, cols: 5, tint: '#7a4a8a' },
    { id: 129, title: '판다 대나무 숲', subtitle: '대나무 간식', image: '/images/jigsaw/panda-bamboo.webp', rows: 4, cols: 4, tint: '#7fb87a' },
    { id: 131, title: '눈 내리는 마을', subtitle: '트리 앞 눈사람', image: '/images/jigsaw/snow-village.webp', rows: 4, cols: 5, tint: '#1f2f6e' },
    { id: 132, title: '코끼리 목욕탕', subtitle: '거품 샤워', image: '/images/jigsaw/elephant-bath.webp', rows: 4, cols: 4, tint: '#f08fb0' },
    { id: 133, title: '달토끼 떡방아', subtitle: '보름달 위에서', image: '/images/jigsaw/moon-rabbit.webp', rows: 4, cols: 4, tint: '#f2c230' },
    { id: 134, title: '스키 산장', subtitle: '눈길 질주', image: '/images/jigsaw/ski-lodge.webp', rows: 5, cols: 5, tint: '#8fc4ee' },
    { id: 135, title: '태엽 장난감 공장', subtitle: '쉴 틈 없는 컨베이어', image: '/images/jigsaw/toy-factory.webp', rows: 5, cols: 6, tint: '#3fbf8a' },
    { id: 136, title: '수달 서핑', subtitle: '파도 위 인사', image: '/images/jigsaw/otter-surf.webp', rows: 4, cols: 4, tint: '#25b8d0' },
    { id: 137, title: '화석 발굴 박물관', subtitle: '화석 발굴 체험', image: '/images/jigsaw/dino-museum-2.webp', rows: 5, cols: 5, tint: '#d8c090' },
    { id: 138, title: '하늘 위 빵집', subtitle: '구름 위 갓 구운 빵', image: '/images/jigsaw/sky-bakery.webp', rows: 4, cols: 4, tint: '#f4b6cc' },
    { id: 139, title: '마트 카트 레이스', subtitle: '장보기는 전쟁', image: '/images/jigsaw/cart-race.webp', rows: 5, cols: 6, tint: '#4a7fd0' },
    { id: 141, title: '전통시장 장터', subtitle: '떡볶이 냄새 솔솔', image: '/images/jigsaw/korean-market.webp', rows: 4, cols: 5, tint: '#b5502f' },
    { id: 142, title: '마녀 빗자루 주차장', subtitle: '옥상 주차 중', image: '/images/jigsaw/broom-parking.webp', rows: 4, cols: 5, tint: '#6b3f93' },
    { id: 143, title: '오리 보트 호수', subtitle: '줄지어 따라와요', image: '/images/jigsaw/duck-boat.webp', rows: 4, cols: 4, tint: '#3fb0e0' },
    { id: 144, title: '다람쥐 나무집', subtitle: '도토리 창고', image: '/images/jigsaw/squirrel-treehouse.webp', rows: 4, cols: 4, tint: '#6fbf5a' },
    { id: 145, title: '사자 미용실', subtitle: '갈기 손질 중', image: '/images/jigsaw/lion-salon.webp', rows: 4, cols: 4, tint: '#7fd6a8' },
    { id: 146, title: '찜질방 휴게실', subtitle: '양머리 수건', image: '/images/jigsaw/sauna-jjim.webp', rows: 4, cols: 5, tint: '#e8a45a' },
    { id: 147, title: '신나는 오락실', subtitle: '한 판 더!', image: '/images/jigsaw/arcade.webp', rows: 5, cols: 6, tint: '#7a3fc0' },
    { id: 148, title: '과학 실험실', subtitle: '뻥! 폭발 실험', image: '/images/jigsaw/science-lab.webp', rows: 5, cols: 5, tint: '#6fd6a0' },
    { id: 149, title: '야구장 응원 열기', subtitle: '안타를 쳐라', image: '/images/jigsaw/baseball-stadium.webp', rows: 5, cols: 6, tint: '#4fa840' },
    { id: 151, title: '이삿날', subtitle: '짐이 산더미', image: '/images/jigsaw/moving-day.webp', rows: 4, cols: 5, tint: '#f08a3a' },
    { id: 152, title: '전통 혼례식', subtitle: '절 올립니다', image: '/images/jigsaw/hanbok-wedding.webp', rows: 5, cols: 5, tint: '#e8a838' },
    { id: 153, title: '너구리 라면 포장마차', subtitle: '비 오는 밤 한 그릇', image: '/images/jigsaw/raccoon-ramen.webp', rows: 4, cols: 4, tint: '#1f3566' },
    { id: 154, title: '한강 치맥 피크닉', subtitle: '불꽃놀이 밤', image: '/images/jigsaw/riverside-picnic.webp', rows: 5, cols: 5, tint: '#1f2f6e' },
    { id: 155, title: '제주 해녀', subtitle: '바다에서 막 올라와', image: '/images/jigsaw/haenyeo-sea.webp', rows: 4, cols: 4, tint: '#27b8c8' },
    { id: 156, title: '캥거루 복싱 체육관', subtitle: '엄마는 챔피언', image: '/images/jigsaw/kangaroo-gym.webp', rows: 4, cols: 4, tint: '#f09a60' },
    { id: 157, title: '여름 마츠리', subtitle: '가면 쓰고 한 바퀴', image: '/images/jigsaw/matsuri-night.webp', rows: 5, cols: 5, tint: '#2a2f78' },
    { id: 158, title: '수정 광산', subtitle: '반짝이는 보물 수레', image: '/images/jigsaw/crystal-mine.webp', rows: 5, cols: 5, tint: '#8a5a3a' },
    { id: 159, title: '치즈 성 생쥐들', subtitle: '치즈로 지은 성', image: '/images/jigsaw/mouse-cheese-castle.webp', rows: 4, cols: 4, tint: '#f0cc40' },
    { id: 161, title: '발레 연습실', subtitle: '하나 둘 셋 넷', image: '/images/jigsaw/ballet-studio.webp', rows: 4, cols: 5, tint: '#f4b4c8' },
    { id: 162, title: '새벽 편의점', subtitle: '불 켜진 작은 가게', image: '/images/jigsaw/night-konbini.webp', rows: 4, cols: 5, tint: '#1c2f6e' },
    { id: 163, title: '튤립 풍차 마을', subtitle: '꽃밭 사이 풍차', image: '/images/jigsaw/tulip-windmill.webp', rows: 5, cols: 6, tint: '#e85a6a' },
    { id: 164, title: '김장하는 날', subtitle: '온 가족이 모였어요', image: '/images/jigsaw/kimchi-day.webp', rows: 5, cols: 5, tint: '#d9553a' },
    { id: 165, title: '사막 바자르', subtitle: '낙타와 장터', image: '/images/jigsaw/camel-bazaar.webp', rows: 6, cols: 6, tint: '#f0a03a' },
    { id: 166, title: '야외 스케이트장', subtitle: '빙글빙글 한 바퀴', image: '/images/jigsaw/ice-rink.webp', rows: 4, cols: 5, tint: '#9fd0f0' },
    { id: 167, title: '코알라 유칼립투스 숲', subtitle: '엄마 품에서 쿨쿨', image: '/images/jigsaw/koala-forest.webp', rows: 4, cols: 4, tint: '#5fbf8a' },
    { id: 168, title: '대장간', subtitle: '불꽃 튀는 망치질', image: '/images/jigsaw/blacksmith-forge.webp', rows: 4, cols: 4, tint: '#9a5a38' },
    { id: 169, title: '공항 활주로', subtitle: '출발 준비 완료', image: '/images/jigsaw/airport-day.webp', rows: 5, cols: 6, tint: '#6bb8ee' },
    { id: 171, title: '시계방', subtitle: '째깍째깍 수리 중', image: '/images/jigsaw/clock-shop.webp', rows: 5, cols: 5, tint: '#7fbf8a' },
    { id: 172, title: '하늘 비행선 카페', subtitle: '구름 위 티타임', image: '/images/jigsaw/airship-cafe.webp', rows: 4, cols: 4, tint: '#f6b8a8' },
    { id: 173, title: '사진관', subtitle: '웃으세요, 찰칵', image: '/images/jigsaw/photo-studio.webp', rows: 5, cols: 6, tint: '#8fd8a8' },
    { id: 174, title: '축구 경기장', subtitle: '골 넣을 준비', image: '/images/jigsaw/soccer-stadium.webp', rows: 5, cols: 5, tint: '#4fb84f' },
    { id: 175, title: '목공소', subtitle: '톱질 한창', image: '/images/jigsaw/carpenter-shop.webp', rows: 5, cols: 6, tint: '#d9904a' },
    { id: 176, title: '곰 꿀 가게', subtitle: '달콤한 한 스푼', image: '/images/jigsaw/bear-honey-shop.webp', rows: 4, cols: 4, tint: '#f0b830' },
    { id: 177, title: '원두막 수박', subtitle: '한여름 평상', image: '/images/jigsaw/watermelon-hut.webp', rows: 5, cols: 5, tint: '#5fb85a' },
    { id: 178, title: '로봇 정비소', subtitle: '고장 난 친구들', image: '/images/jigsaw/robot-garage.webp', rows: 5, cols: 5, tint: '#f2c230' },
    { id: 179, title: '소원 등불 축제', subtitle: '하늘로 날려요', image: '/images/jigsaw/lantern-festival.webp', rows: 6, cols: 6, tint: '#1c2a5e' },
    { id: 181, title: '알파카 털실 가게', subtitle: '포근한 목도리', image: '/images/jigsaw/alpaca-yarn-shop.webp', rows: 4, cols: 4, tint: '#c89a68' },
    { id: 182, title: '가을 산사', subtitle: '낙엽 쓰는 아침', image: '/images/jigsaw/temple-autumn.webp', rows: 4, cols: 5, tint: '#d9602f' },
    { id: 183, title: '바이킹 마을', subtitle: '롱쉽이 도착했어요', image: '/images/jigsaw/viking-village.webp', rows: 5, cols: 5, tint: '#3f9fd8' },
    { id: 184, title: '길거리 농구', subtitle: '덩크 한 방', image: '/images/jigsaw/street-basketball.webp', rows: 5, cols: 6, tint: '#f09a3a' },
    { id: 185, title: '국궁장', subtitle: '활시위를 당겨요', image: '/images/jigsaw/archery-range.webp', rows: 5, cols: 6, tint: '#5aa65a' },
    { id: 186, title: '펫숍', subtitle: '어떤 친구가 좋을까', image: '/images/jigsaw/pet-shop.webp', rows: 5, cols: 5, tint: '#f4c860' },
    { id: 187, title: '마술쇼', subtitle: '짜잔! 토끼가 나왔어요', image: '/images/jigsaw/magic-show.webp', rows: 5, cols: 6, tint: '#8a1f3a' },
    { id: 188, title: '과일 가게 골목', subtitle: '싱싱한 제철 과일', image: '/images/jigsaw/fruit-stand.webp', rows: 5, cols: 5, tint: '#e8503a' },
    { id: 189, title: '벼룩시장', subtitle: '보물 찾기', image: '/images/jigsaw/flea-market.webp', rows: 6, cols: 6, tint: '#e89a3a' },
    { id: 191, title: '곤충 채집', subtitle: '잠자리채 출동', image: '/images/jigsaw/bug-catching.webp', rows: 4, cols: 5, tint: '#58b848' },
    { id: 192, title: '서부 마을', subtitle: '보안관 납시오', image: '/images/jigsaw/wild-west-town.webp', rows: 5, cols: 5, tint: '#e8a850' },
    { id: 193, title: '인형의 집', subtitle: '방마다 이야기가', image: '/images/jigsaw/dollhouse-cutaway.webp', rows: 5, cols: 5, tint: '#f4a8b8' },
    { id: 194, title: '우리 아파트', subtitle: '불 켜진 이웃집들', image: '/images/jigsaw/apartment-cutaway.webp', rows: 5, cols: 6, tint: '#26356e' },
    { id: 195, title: '지하철 승강장', subtitle: '열차가 들어옵니다', image: '/images/jigsaw/subway-station.webp', rows: 6, cols: 6, tint: '#7fd0a0' },
    { id: 196, title: '곰 코치 헬스장', subtitle: '하나 더 들어요', image: '/images/jigsaw/bear-gym.webp', rows: 4, cols: 5, tint: '#2fb8a8' },
    { id: 197, title: '떡집', subtitle: '김이 모락모락', image: '/images/jigsaw/rice-cake-shop.webp', rows: 5, cols: 6, tint: '#8fcf8a' },
    { id: 198, title: '유리 공예 공방', subtitle: '불어서 만드는 보석', image: '/images/jigsaw/glass-workshop.webp', rows: 5, cols: 5, tint: '#c8603a' },
    { id: 199, title: '소풍 스쿨버스', subtitle: '호숫가 현장학습', image: '/images/jigsaw/school-bus-trip.webp', rows: 6, cols: 6, tint: '#f2c830' },
    { id: 201, title: '원숭이 온천', subtitle: '눈 속의 따뜻함', image: '/images/jigsaw/monkey-onsen.webp', rows: 4, cols: 4, tint: '#6fc8b8' },
    { id: 202, title: '아이스하키', subtitle: '퍽을 쫓아라', image: '/images/jigsaw/ice-hockey.webp', rows: 5, cols: 5, tint: '#a8d8f0' },
    { id: 203, title: '딸기 농장', subtitle: '한 바구니 가득', image: '/images/jigsaw/strawberry-farm.webp', rows: 5, cols: 6, tint: '#58b858' },
    { id: 204, title: '연날리기 언덕', subtitle: '바람이 좋아요', image: '/images/jigsaw/kite-hill.webp', rows: 5, cols: 5, tint: '#4fb0ee' },
    { id: 205, title: '얼음 조각 축제', subtitle: '빛나는 겨울밤', image: '/images/jigsaw/ice-sculpture-fest.webp', rows: 6, cols: 6, tint: '#4a5fb0' },
    { id: 206, title: '젖소 목장', subtitle: '갓 짠 우유', image: '/images/jigsaw/dairy-farm.webp', rows: 4, cols: 4, tint: '#e04a3a' },
    { id: 207, title: '산 정상 일출', subtitle: '야호! 해가 떴다', image: '/images/jigsaw/summit-sunrise.webp', rows: 5, cols: 6, tint: '#f08a5a' },
    { id: 208, title: '수상시장', subtitle: '보트 위 장터', image: '/images/jigsaw/floating-market.webp', rows: 5, cols: 6, tint: '#3fc8b8' },
    { id: 209, title: '플라밍고 호수', subtitle: '분홍빛 노을', image: '/images/jigsaw/flamingo-lake.webp', rows: 4, cols: 4, tint: '#f08ab8' },
    { id: 211, title: '구두 수선점', subtitle: '새 신발처럼', image: '/images/jigsaw/cobbler-shop.webp', rows: 5, cols: 5, tint: '#8a5a38' },
    { id: 212, title: '요리 교실', subtitle: '쿠키 굽는 날', image: '/images/jigsaw/cooking-class.webp', rows: 4, cols: 5, tint: '#f4b8c8' },
    { id: 213, title: '음악실', subtitle: '다 같이 연주해요', image: '/images/jigsaw/music-classroom.webp', rows: 5, cols: 6, tint: '#f4d890' },
    { id: 214, title: '도넛 가게', subtitle: '갓 구운 달콤함', image: '/images/jigsaw/donut-shop.webp', rows: 5, cols: 5, tint: '#f4a8c0' },
    { id: 215, title: '두더지 공사장', subtitle: '땅 위도 땅속도', image: '/images/jigsaw/mole-construction.webp', rows: 6, cols: 6, tint: '#e0903a' },
    { id: 216, title: '비 오는 정류장', subtitle: '버스가 와요', image: '/images/jigsaw/rainy-bus-stop.webp', rows: 5, cols: 5, tint: '#6a88b8' },
    { id: 217, title: '급식 시간', subtitle: '줄 서서 한 판', image: '/images/jigsaw/school-cafeteria.webp', rows: 5, cols: 5, tint: '#7ac88a' },
    { id: 218, title: '병아리 부화장', subtitle: '삐약삐약 새 식구', image: '/images/jigsaw/chick-hatchery.webp', rows: 5, cols: 6, tint: '#e8b840' },
    { id: 219, title: '우주 정거장 식당', subtitle: '무중력 팬케이크', image: '/images/jigsaw/space-diner.webp', rows: 6, cols: 6, tint: '#4a5a7a' },
    { id: 221, title: '도깨비 시장', subtitle: '달밤의 장터', image: '/images/jigsaw/dokkaebi-market.webp', rows: 5, cols: 5, tint: '#2a2f6a' },
    { id: 222, title: '버블티 가게', subtitle: '쫀득한 한 모금', image: '/images/jigsaw/bubble-tea-shop.webp', rows: 4, cols: 5, tint: '#9ad8a0' },
    { id: 223, title: '동물 세차장', subtitle: '거품 가득', image: '/images/jigsaw/animal-car-wash.webp', rows: 5, cols: 6, tint: '#6ac0e8' },
    { id: 224, title: '다이빙 대회', subtitle: '풍덩! 점수는요', image: '/images/jigsaw/diving-contest.webp', rows: 5, cols: 6, tint: '#40b8d0' },
    { id: 225, title: '다락방 보물찾기', subtitle: '비 오는 날의 상자', image: '/images/jigsaw/attic-treasure.webp', rows: 5, cols: 6, tint: '#a8743c' },
    { id: 226, title: '얼음낚시터', subtitle: '구멍마다 한 마리', image: '/images/jigsaw/ice-fishing.webp', rows: 5, cols: 5, tint: '#a8d0f0' },
    { id: 227, title: '마법학교 수업', subtitle: '보글보글 마법약', image: '/images/jigsaw/magic-class.webp', rows: 5, cols: 6, tint: '#4a3a7a' },
    { id: 228, title: '스케이트 파크', subtitle: '하프파이프 질주', image: '/images/jigsaw/skate-park.webp', rows: 5, cols: 6, tint: '#40b8d8' },
    { id: 229, title: '케이크 위 마을', subtitle: '달콤한 소인 마을', image: '/images/jigsaw/cake-village.webp', rows: 6, cols: 6, tint: '#f4b0c8' },
    { id: 231, title: '요가 교실', subtitle: '숨 들이쉬고 내쉬고', image: '/images/jigsaw/yoga-studio.webp', rows: 5, cols: 5, tint: '#f4c8b0' },
    { id: 232, title: '옥상 텃밭 파티', subtitle: '노을 아래 바비큐', image: '/images/jigsaw/rooftop-party.webp', rows: 5, cols: 5, tint: '#f09a60' },
    { id: 233, title: '정원 결혼식', subtitle: '꽃길만 걸어요', image: '/images/jigsaw/garden-wedding.webp', rows: 5, cols: 5, tint: '#f4c0d0' },
    { id: 234, title: '우주 농장', subtitle: '별 아래 수확철', image: '/images/jigsaw/space-farm.webp', rows: 5, cols: 6, tint: '#1a1f4a' },
    { id: 235, title: '파자마 파티', subtitle: '베개싸움 시작!', image: '/images/jigsaw/pajama-party.webp', rows: 6, cols: 6, tint: '#b8a0d8' },
    { id: 236, title: '보드게임 카페', subtitle: '한 판 더 해요', image: '/images/jigsaw/board-game-cafe.webp', rows: 5, cols: 5, tint: '#e8a860' },
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
    { id: 110, title: '밤의 카페 테라스', subtitle: '명화 컬렉션', image: '/images/jigsaw/cafe-terrace.webp', rows: 6, cols: 6, tint: '#1f3a8a' },
    { id: 120, title: '아를의 침실', subtitle: '명화 컬렉션', image: '/images/jigsaw/bedroom-arles.webp', rows: 6, cols: 6, tint: '#5b8fd8' },
    { id: 130, title: '수련 연못', subtitle: '명화 컬렉션', image: '/images/jigsaw/water-lilies.webp', rows: 6, cols: 7, tint: '#3f9a6a' },
    { id: 140, title: '눈 속의 사냥꾼', subtitle: '명화 컬렉션', image: '/images/jigsaw/hunters-snow.webp', rows: 6, cols: 7, tint: '#7f9a98' },
    { id: 150, title: '바벨탑', subtitle: '명화 컬렉션', image: '/images/jigsaw/tower-babel.webp', rows: 7, cols: 7, tint: '#c8734a' },
    { id: 160, title: '우유 따르는 여인', subtitle: '명화 컬렉션', image: '/images/jigsaw/milkmaid.webp', rows: 6, cols: 6, tint: '#e0b030' },
    { id: 170, title: '붉은 후지산', subtitle: '명화 컬렉션', image: '/images/jigsaw/red-fuji.webp', rows: 6, cols: 6, tint: '#d0452f' },
    { id: 180, title: '물랭 드 라 갈레트', subtitle: '명화 컬렉션', image: '/images/jigsaw/moulin-galette.webp', rows: 7, cols: 7, tint: '#5aa05a' },
    { id: 190, title: '서당', subtitle: '명화 컬렉션', image: '/images/jigsaw/seodang.webp', rows: 6, cols: 7, tint: '#b88a5a' },
    { id: 200, title: '열대 폭풍 속 호랑이', subtitle: '명화 컬렉션', image: '/images/jigsaw/tiger-storm.webp', rows: 7, cols: 7, tint: '#3e8f4a' },
    { id: 210, title: '비너스의 탄생', subtitle: '명화 컬렉션', image: '/images/jigsaw/birth-of-venus.webp', rows: 6, cols: 7, tint: '#4fb8c8' },
    { id: 220, title: '기억의 지속', subtitle: '명화 컬렉션', image: '/images/jigsaw/persistence-of-memory.webp', rows: 6, cols: 7, tint: '#e08a3a' },
    { id: 230, title: '아메리칸 고딕', subtitle: '명화 컬렉션', image: '/images/jigsaw/american-gothic.webp', rows: 6, cols: 6, tint: '#5aa86a' },
    { id: 240, title: '밤을 새우는 사람들', subtitle: '명화 컬렉션', image: '/images/jigsaw/nighthawks.webp', rows: 6, cols: 7, tint: '#1f5a5a' },
    { id: 250, title: '단오풍정', subtitle: '명화 컬렉션', image: '/images/jigsaw/dano-swing.webp', rows: 7, cols: 7, tint: '#e0b060' },
    { id: 260, title: '까치 호랑이', subtitle: '명화 컬렉션', image: '/images/jigsaw/magpie-tiger.webp', rows: 6, cols: 7, tint: '#f0a040' },
    { id: 270, title: '해바라기', subtitle: '명화 컬렉션', image: '/images/jigsaw/sunflowers-vase.webp', rows: 6, cols: 7, tint: '#f0c030' },
    { id: 280, title: '인상, 해돋이', subtitle: '명화 컬렉션', image: '/images/jigsaw/impression-sunrise.webp', rows: 6, cols: 7, tint: '#6a7fa8' },
    { id: 290, title: '인간의 아들', subtitle: '명화 컬렉션', image: '/images/jigsaw/son-of-man.webp', rows: 6, cols: 7, tint: '#7a8fb0' },
    { id: 300, title: '안개 바다 위의 방랑자', subtitle: '명화 컬렉션', image: '/images/jigsaw/wanderer-fog.webp', rows: 7, cols: 7, tint: '#9aa8c0' },
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
