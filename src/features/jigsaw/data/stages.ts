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
    { id: 237, title: '헌책방 골목', subtitle: '비 오는 날의 독서', image: '/images/jigsaw/used-bookstore.webp', rows: 5, cols: 6, tint: '#b8844c' },
    { id: 238, title: '펭귄 택배', subtitle: '미끄러지듯 배송', image: '/images/jigsaw/penguin-delivery.webp', rows: 5, cols: 5, tint: '#a8d4f0' },
    { id: 239, title: '갯벌 체험', subtitle: '조개가 한가득', image: '/images/jigsaw/tidal-flat.webp', rows: 6, cols: 6, tint: '#e8b098' },
    { id: 241, title: '빙수 가게', subtitle: '시원한 한 그릇', image: '/images/jigsaw/shaved-ice-shop.webp', rows: 5, cols: 5, tint: '#9ad8a8' },
    { id: 242, title: '태권도 도장', subtitle: '얍! 격파 성공', image: '/images/jigsaw/taekwondo-dojo.webp', rows: 5, cols: 5, tint: '#e86a5a' },
    { id: 243, title: '여름 계곡', subtitle: '첨벙첨벙 물놀이', image: '/images/jigsaw/valley-splash.webp', rows: 5, cols: 6, tint: '#48b8e8' },
    { id: 244, title: '천연 염색 공방', subtitle: '물들이는 하루', image: '/images/jigsaw/dye-workshop.webp', rows: 5, cols: 6, tint: '#78b8e8' },
    { id: 245, title: '극장 무대 뒤', subtitle: '막이 오르기 전', image: '/images/jigsaw/theater-backstage.webp', rows: 6, cols: 6, tint: '#b83a48' },
    { id: 246, title: '붕어빵 노점', subtitle: '눈 오는 밤 한 봉지', image: '/images/jigsaw/fish-bun-stall.webp', rows: 4, cols: 5, tint: '#2a3a6a' },
    { id: 247, title: '우주 택시 정거장', subtitle: '어디로 모실까요', image: '/images/jigsaw/space-taxi-stop.webp', rows: 5, cols: 6, tint: '#2a2f5a' },
    { id: 248, title: '만두 가게', subtitle: '김이 모락모락', image: '/images/jigsaw/dumpling-shop.webp', rows: 5, cols: 6, tint: '#f0c878' },
    { id: 249, title: '코끼리 학교', subtitle: '코로 가리키는 정답', image: '/images/jigsaw/elephant-school.webp', rows: 6, cols: 6, tint: '#8ac88a' },
    { id: 251, title: '아침 조깅 공원', subtitle: '한 바퀴 더 달려요', image: '/images/jigsaw/morning-jog-park.webp', rows: 4, cols: 5, tint: '#8ad090' },
    { id: 252, title: '송편 빚는 날', subtitle: '보름달 아래 둘러앉아', image: '/images/jigsaw/songpyeon-day.webp', rows: 5, cols: 5, tint: '#c89860' },
    { id: 253, title: '빨래 널린 골목', subtitle: '바람에 펄럭펄럭', image: '/images/jigsaw/laundry-alley.webp', rows: 5, cols: 6, tint: '#d89060' },
    { id: 254, title: '돼지 은행', subtitle: '동전이 쏟아져요', image: '/images/jigsaw/piggy-bank.webp', rows: 5, cols: 6, tint: '#f4a8b8' },
    { id: 255, title: '인형 뽑기방', subtitle: '딱 한 번만 더', image: '/images/jigsaw/claw-machine-arcade.webp', rows: 6, cols: 6, tint: '#f080a0' },
    { id: 256, title: '바닷속 도시', subtitle: '물방울 집 마을', image: '/images/jigsaw/undersea-city.webp', rows: 5, cols: 5, tint: '#2a58b8' },
    { id: 257, title: '어시장', subtitle: '펄떡이는 아침', image: '/images/jigsaw/fish-market.webp', rows: 5, cols: 6, tint: '#58a8d8' },
    { id: 258, title: '로봇 학교', subtitle: '오늘의 수업은 회로', image: '/images/jigsaw/robot-school.webp', rows: 5, cols: 6, tint: '#78d098' },
    { id: 259, title: '사탕 공장', subtitle: '달콤함이 굴러가요', image: '/images/jigsaw/candy-factory.webp', rows: 5, cols: 6, tint: '#f4a8c8' },
    { id: 261, title: '롤러장', subtitle: '디스코볼 아래서', image: '/images/jigsaw/roller-rink.webp', rows: 5, cols: 5, tint: '#7a50b0' },
    { id: 262, title: '곤충 호텔', subtitle: '나무 속 별 다섯 개', image: '/images/jigsaw/bug-hotel.webp', rows: 5, cols: 5, tint: '#9cc878' },
    { id: 263, title: '비밀 아지트', subtitle: '우리만의 나무 위', image: '/images/jigsaw/secret-hideout.webp', rows: 5, cols: 6, tint: '#e89a50' },
    { id: 264, title: '은행나무 길', subtitle: '노란 낙엽 놀이', image: '/images/jigsaw/ginkgo-road.webp', rows: 5, cols: 6, tint: '#f0c030' },
    { id: 265, title: '동네 이발소', subtitle: '깔끔하게 잘라 주세요', image: '/images/jigsaw/barbershop.webp', rows: 6, cols: 6, tint: '#2a8a8a' },
    { id: 266, title: '야식 포차', subtitle: '다리 밑 한 그릇', image: '/images/jigsaw/wolf-pocha.webp', rows: 5, cols: 5, tint: '#1f2a5a' },
    { id: 267, title: '동네 목욕탕', subtitle: '양머리 수건 한 줄', image: '/images/jigsaw/bathhouse.webp', rows: 5, cols: 5, tint: '#a8e0d0' },
    { id: 268, title: '움직이는 성', subtitle: '닭다리로 성큼성큼', image: '/images/jigsaw/walking-castle.webp', rows: 5, cols: 6, tint: '#a8d8f0' },
    { id: 269, title: '동물 이어달리기', subtitle: '바통을 받아라', image: '/images/jigsaw/relay-race.webp', rows: 6, cols: 6, tint: '#e84a3a' },
    { id: 271, title: '소아과 진료실', subtitle: '씩씩하게 주사 한 방', image: '/images/jigsaw/pediatric-clinic.webp', rows: 5, cols: 5, tint: '#a8e0b8' },
    { id: 272, title: '고양이 탐정 사무소', subtitle: '발자국을 따라가요', image: '/images/jigsaw/cat-detective.webp', rows: 5, cols: 5, tint: '#2a8a88' },
    { id: 273, title: '벼 베기 들판', subtitle: '황금빛 가을', image: '/images/jigsaw/rice-harvest.webp', rows: 5, cols: 6, tint: '#e8b030' },
    { id: 274, title: '햄스터 놀이공원', subtitle: '해바라기씨 롤러코스터', image: '/images/jigsaw/hamster-maze-park.webp', rows: 5, cols: 6, tint: '#f0d090' },
    { id: 275, title: '수련회 캠프파이어', subtitle: '장기자랑 시간', image: '/images/jigsaw/campfire-night.webp', rows: 6, cols: 6, tint: '#2a3a7a' },
    { id: 276, title: '구름 양 목장', subtitle: '하늘 위 풀밭', image: '/images/jigsaw/cloud-sheep-ranch.webp', rows: 5, cols: 5, tint: '#c8a8e8' },
    { id: 277, title: '눈싸움 대전', subtitle: '눈 요새 전투', image: '/images/jigsaw/snowball-fight.webp', rows: 5, cols: 6, tint: '#a8d0f0' },
    { id: 278, title: '승마장', subtitle: '말과 함께 달려요', image: '/images/jigsaw/riding-stable.webp', rows: 5, cols: 6, tint: '#78c888' },
    { id: 279, title: '풍선 가게 거리', subtitle: '두둥실 떠올라요', image: '/images/jigsaw/balloon-street.webp', rows: 6, cols: 6, tint: '#78c0f0' },
    { id: 281, title: '별 낚시 배', subtitle: '구름 바다의 밤낚시', image: '/images/jigsaw/star-fishing-boat.webp', rows: 5, cols: 5, tint: '#3a2a8a' },
    { id: 282, title: '궁궐 나들이', subtitle: '한복 입고 찰칵', image: '/images/jigsaw/palace-stroll.webp', rows: 5, cols: 5, tint: '#e8602a' },
    { id: 283, title: '한옥 찻집', subtitle: '차 한 잔의 여유', image: '/images/jigsaw/rabbit-teahouse.webp', rows: 5, cols: 6, tint: '#b88a58' },
    { id: 284, title: '별 만드는 공장', subtitle: '반짝반짝 포장 중', image: '/images/jigsaw/star-factory.webp', rows: 5, cols: 6, tint: '#2a1a7a' },
    { id: 285, title: '야외 영화 상영회', subtitle: '팝콘과 담요', image: '/images/jigsaw/outdoor-cinema.webp', rows: 6, cols: 6, tint: '#1f3a5a' },
    { id: 286, title: '곰 가족 겨울잠 준비', subtitle: '포근한 굴속', image: '/images/jigsaw/bear-den.webp', rows: 5, cols: 5, tint: '#7a4a28' },
    { id: 287, title: '펭귄 스케이트장', subtitle: '달빛 아래 한 바퀴', image: '/images/jigsaw/penguin-skate-night.webp', rows: 5, cols: 6, tint: '#1f2f5f' },
    { id: 288, title: '쿠키 만들기 교실', subtitle: '별 모양 하트 모양', image: '/images/jigsaw/cookie-class.webp', rows: 6, cols: 6, tint: '#f4d888' },
    { id: 289, title: '하늘 기차역', subtitle: '구름다리 건너 출발', image: '/images/jigsaw/sky-station.webp', rows: 6, cols: 6, tint: '#a8d0f0' },
    { id: 291, title: '해변 노점 거리', subtitle: '시원한 여름 한 모금', image: '/images/jigsaw/beach-kiosks.webp', rows: 5, cols: 5, tint: '#58c0e0' },
    { id: 292, title: '마을 책 축제', subtitle: '책 한 권의 오후', image: '/images/jigsaw/book-festival.webp', rows: 5, cols: 5, tint: '#f0c070' },
    { id: 293, title: '미술관 견학', subtitle: '그림 속으로 한 걸음', image: '/images/jigsaw/art-museum-kids.webp', rows: 5, cols: 6, tint: '#d8c8a8' },
    { id: 294, title: '여우 분식집', subtitle: '김밥 말고 떡볶이 끓이고', image: '/images/jigsaw/snack-bar-fox.webp', rows: 5, cols: 6, tint: '#e8984a' },
    { id: 295, title: '책상 위 레이싱', subtitle: '결승선을 향해', image: '/images/jigsaw/toy-race-track.webp', rows: 6, cols: 6, tint: '#e8a860' },
    { id: 296, title: '강변 자전거 대여', subtitle: '바람 가르며 한 바퀴', image: '/images/jigsaw/river-bike-rental.webp', rows: 5, cols: 6, tint: '#78c870' },
    { id: 297, title: '앵무새 노래방', subtitle: '마이크 잡으면 내 세상', image: '/images/jigsaw/parrot-karaoke.webp', rows: 5, cols: 6, tint: '#7a3ab0' },
    { id: 298, title: '할머니 댁 마루', subtitle: '수박 먹는 여름 낮', image: '/images/jigsaw/grandma-porch.webp', rows: 5, cols: 6, tint: '#78b868' },
    { id: 299, title: '우산 아래 마을', subtitle: '비가 와도 포근해요', image: '/images/jigsaw/umbrella-village.webp', rows: 6, cols: 6, tint: '#f0d878' },
    { id: 301, title: '동물 어린이집', subtitle: '쿨쿨 낮잠 시간', image: '/images/jigsaw/animal-daycare.webp', rows: 5, cols: 5, tint: '#a8c8f0' },
    { id: 302, title: '한약방', subtitle: '약재 향 가득', image: '/images/jigsaw/herbal-medicine-shop.webp', rows: 5, cols: 5, tint: '#8a6a40' },
    { id: 303, title: '시계 속 세계', subtitle: '째깍째깍 톱니 마을', image: '/images/jigsaw/clockwork-world.webp', rows: 5, cols: 6, tint: '#2a7a78' },
    { id: 304, title: '밴드 합주실', subtitle: '지하실의 로큰롤', image: '/images/jigsaw/band-practice.webp', rows: 6, cols: 6, tint: '#7a3ab0' },
    { id: 305, title: '선인장 카페', subtitle: '사막의 시원한 한 잔', image: '/images/jigsaw/cactus-cafe.webp', rows: 6, cols: 6, tint: '#f0a858' },
    { id: 306, title: '구름 세탁소', subtitle: '보송보송 하늘 빨래', image: '/images/jigsaw/cloud-laundromat.webp', rows: 5, cols: 5, tint: '#a8d8f4' },
    { id: 307, title: '공원 장기판', subtitle: '훈수는 금물', image: '/images/jigsaw/janggi-park.webp', rows: 5, cols: 6, tint: '#e89850' },
    { id: 308, title: '호랑이 한복집', subtitle: '치수 재고 바느질', image: '/images/jigsaw/tiger-hanbok-shop.webp', rows: 5, cols: 6, tint: '#b88850' },
    { id: 309, title: '졸업식', subtitle: '모자를 던져라', image: '/images/jigsaw/graduation-day.webp', rows: 6, cols: 7, tint: '#f4b8d0' },
    { id: 311, title: '얼음 궁전', subtitle: '요정들의 스케이트', image: '/images/jigsaw/ice-fairy-palace.webp', rows: 5, cols: 5, tint: '#b8c8f0' },
    { id: 312, title: '고양이 중국집', subtitle: '짜장면 곱빼기요', image: '/images/jigsaw/cat-chinese-restaurant.webp', rows: 5, cols: 5, tint: '#d84a3a' },
    { id: 313, title: '새해 해맞이', subtitle: '소원을 빌어요', image: '/images/jigsaw/new-year-sunrise.webp', rows: 5, cols: 6, tint: '#f08a70' },
    { id: 314, title: '서랍 속 세계', subtitle: '작은 사람들의 하루', image: '/images/jigsaw/drawer-miniature.webp', rows: 5, cols: 6, tint: '#c89860' },
    { id: 315, title: '학교 매점', subtitle: '쉬는 시간 대작전', image: '/images/jigsaw/school-snack-shop.webp', rows: 6, cols: 6, tint: '#f0c880' },
    { id: 316, title: '얼룩말 교통경찰', subtitle: '천천히 건너세요', image: '/images/jigsaw/zebra-crossing-officer.webp', rows: 5, cols: 5, tint: '#78a8d0' },
    { id: 317, title: '꽃길 트램', subtitle: '딸랑딸랑 출발', image: '/images/jigsaw/tram-town.webp', rows: 6, cols: 6, tint: '#e08a7a' },
    { id: 318, title: '윷놀이 한 판', subtitle: '도냐 개냐 모냐', image: '/images/jigsaw/yut-game-day.webp', rows: 5, cols: 6, tint: '#e8c060' },
    { id: 319, title: '나무늘보 우체국', subtitle: '천천히 도착합니다', image: '/images/jigsaw/sloth-post-office.webp', rows: 6, cols: 6, tint: '#78c88a' },
    { id: 321, title: '나무 도서관', subtitle: '가지마다 책이 한가득', image: '/images/jigsaw/tree-library-house.webp', rows: 5, cols: 5, tint: '#8ac878' },
    { id: 322, title: '고구마 캐는 날', subtitle: '줄기 당기면 주렁주렁', image: '/images/jigsaw/sweet-potato-field.webp', rows: 5, cols: 5, tint: '#d88a3a' },
    { id: 323, title: '악어 수영 강습', subtitle: '발장구 쳐 보세요', image: '/images/jigsaw/crocodile-swim-class.webp', rows: 5, cols: 6, tint: '#48c8d8' },
    { id: 324, title: '살아있는 보물 지도', subtitle: '점선 따라 X까지', image: '/images/jigsaw/living-map-world.webp', rows: 5, cols: 6, tint: '#e8d098' },
    { id: 325, title: '교실 청소 당번', subtitle: '노을 지는 교실', image: '/images/jigsaw/classroom-cleaning.webp', rows: 6, cols: 7, tint: '#f0a060' },
    { id: 326, title: '거리 버스킹', subtitle: '노을 속 작은 공연', image: '/images/jigsaw/busking-street.webp', rows: 5, cols: 5, tint: '#8a58a8' },
    { id: 327, title: '미어캣 마을', subtitle: '망보기 교대 시간', image: '/images/jigsaw/meerkat-lookout-village.webp', rows: 5, cols: 6, tint: '#f0c878' },
    { id: 328, title: '롤러코스터 마을', subtitle: '구름 위를 달려요', image: '/images/jigsaw/coaster-village.webp', rows: 5, cols: 6, tint: '#a8d8f4' },
    { id: 329, title: '물풍선 대전', subtitle: '터지면 시원해', image: '/images/jigsaw/water-balloon-fight.webp', rows: 6, cols: 6, tint: '#58c878' },
    { id: 331, title: '카멜레온 숨바꼭질', subtitle: '어디 숨었게?', image: '/images/jigsaw/chameleon-contest.webp', rows: 5, cols: 5, tint: '#58c068' },
    { id: 332, title: '등산 휴게소', subtitle: '정상 전 컵라면', image: '/images/jigsaw/hiking-rest-stop.webp', rows: 5, cols: 5, tint: '#e89048' },
    { id: 333, title: '비눗방울 세계', subtitle: '방울마다 작은 나라', image: '/images/jigsaw/bubble-world.webp', rows: 6, cols: 6, tint: '#a8d4f4' },
    { id: 334, title: '숲속 미술관', subtitle: '사슴 관장님의 전시', image: '/images/jigsaw/forest-gallery.webp', rows: 5, cols: 6, tint: '#98c878' },
    { id: 335, title: '마라톤 출발선', subtitle: '제자리에서 몸 풀기', image: '/images/jigsaw/marathon-start.webp', rows: 6, cols: 6, tint: '#78a8d0' },
    { id: 336, title: '무지개 공장', subtitle: '색칠 한 줄 한 줄', image: '/images/jigsaw/rainbow-factory.webp', rows: 5, cols: 5, tint: '#a8d0f0' },
    { id: 337, title: '새벽 두부 가게', subtitle: '모락모락 갓 만든 두부', image: '/images/jigsaw/tofu-shop.webp', rows: 5, cols: 6, tint: '#8a6a48' },
    { id: 338, title: '강 위 도서관 배', subtitle: '수달 사서의 대여소', image: '/images/jigsaw/river-library-boat.webp', rows: 6, cols: 6, tint: '#78c0c8' },
    { id: 339, title: '달팽이 버스', subtitle: '느릿느릿 출발합니다', image: '/images/jigsaw/snail-bus.webp', rows: 6, cols: 6, tint: '#78c048' },
    { id: 341, title: '성곽 달빛 산책', subtitle: '등불 들고 한 바퀴', image: '/images/jigsaw/fortress-night-walk.webp', rows: 5, cols: 6, tint: '#1f2a5a' },
    { id: 342, title: '대나무 공방', subtitle: '판다 장인의 솜씨', image: '/images/jigsaw/bamboo-workshop.webp', rows: 5, cols: 5, tint: '#98c070' },
    { id: 343, title: '호떡 노점', subtitle: '눈 오는 날의 간식', image: '/images/jigsaw/hotteok-stall.webp', rows: 6, cols: 6, tint: '#2a3a68' },
    { id: 344, title: '수족관 야간 청소', subtitle: '고래의 대걸레질', image: '/images/jigsaw/aquarium-night-clean.webp', rows: 5, cols: 6, tint: '#1a4a8a' },
    { id: 345, title: '피아노 속 마을', subtitle: '건반 위를 걷는 사람들', image: '/images/jigsaw/piano-village.webp', rows: 6, cols: 6, tint: '#c8a070' },
    { id: 346, title: '사인회', subtitle: '작가님 사인해 주세요', image: '/images/jigsaw/book-signing.webp', rows: 5, cols: 6, tint: '#f0c860' },
    { id: 347, title: '두더지 지하 카페', subtitle: '땅속 아늑한 한 잔', image: '/images/jigsaw/mole-cafe.webp', rows: 5, cols: 6, tint: '#6a4a30' },
    { id: 348, title: '우체통 마을', subtitle: '편지 한 통 도착', image: '/images/jigsaw/mailbox-village.webp', rows: 5, cols: 6, tint: '#78b8f0' },
    { id: 349, title: '동네 소극장', subtitle: '왕관 쓴 꼬마 배우', image: '/images/jigsaw/kids-theater.webp', rows: 6, cols: 7, tint: '#7a3a8a' },
    { id: 351, title: '귀성길 휴게소', subtitle: '호두과자 한 봉지', image: '/images/jigsaw/highway-rest-stop.webp', rows: 5, cols: 6, tint: '#f0b858' },
    { id: 352, title: '너구리 주방 대소동', subtitle: '팬케이크가 천장에!', image: '/images/jigsaw/raccoon-kitchen-chaos.webp', rows: 5, cols: 5, tint: '#d84a3a' },
    { id: 353, title: '세탁기 속 세계', subtitle: '거품 바다 항해', image: '/images/jigsaw/washing-machine-world.webp', rows: 5, cols: 6, tint: '#f4b8d4' },
    { id: 354, title: '야구 타격장', subtitle: '홈런 한 방', image: '/images/jigsaw/batting-cage.webp', rows: 6, cols: 6, tint: '#58c878' },
    { id: 355, title: '개구리 연못 음악회', subtitle: '연잎 위 지휘자', image: '/images/jigsaw/frog-pond-concert.webp', rows: 6, cols: 6, tint: '#48b8a8' },
    { id: 356, title: '자판기 속 세계', subtitle: '캔 속에 사는 마을', image: '/images/jigsaw/vending-machine-world.webp', rows: 5, cols: 5, tint: '#e04a48' },
    { id: 357, title: '가족 저녁 밥상', subtitle: '오늘은 생선구이', image: '/images/jigsaw/family-dinner.webp', rows: 5, cols: 6, tint: '#f0c868' },
    { id: 358, title: '케이크 장식 대회', subtitle: '크림 듬뿍 딸기 듬뿍', image: '/images/jigsaw/animal-cake-contest.webp', rows: 5, cols: 6, tint: '#f4b0c8' },
    { id: 359, title: '유리병 정원', subtitle: '작은 세상의 정원사', image: '/images/jigsaw/terrarium-world.webp', rows: 6, cols: 7, tint: '#88c090' },
    { id: 361, title: '안경점', subtitle: '또렷하게 보여요', image: '/images/jigsaw/optical-shop.webp', rows: 5, cols: 5, tint: '#58c0b0' },
    { id: 362, title: '동지 팥죽', subtitle: '새알심 빚는 날', image: '/images/jigsaw/red-bean-porridge.webp', rows: 5, cols: 6, tint: '#d8584a' },
    { id: 363, title: '두루미 철새 도래지', subtitle: '얼음 위의 춤', image: '/images/jigsaw/crane-sanctuary.webp', rows: 5, cols: 6, tint: '#d8c8e0' },
    { id: 364, title: '종이접기 마을', subtitle: '접고 접어 만든 세상', image: '/images/jigsaw/origami-village.webp', rows: 6, cols: 6, tint: '#78c898' },
    { id: 365, title: '만화 그리기 교실', subtitle: '내 손으로 그리는 로봇', image: '/images/jigsaw/cartoon-class.webp', rows: 6, cols: 6, tint: '#f8e0a8' },
    { id: 366, title: '눈송이 공장', subtitle: '세상에 하나뿐인 결정', image: '/images/jigsaw/snowflake-factory.webp', rows: 5, cols: 5, tint: '#b8d8f0' },
    { id: 367, title: '수달 가족 빨래터', subtitle: '첨벙첨벙 빨래 중', image: '/images/jigsaw/otter-laundry-day.webp', rows: 6, cols: 6, tint: '#58b8e0' },
    { id: 368, title: '기숙사 야식 라면', subtitle: '밤샘엔 역시 라면', image: '/images/jigsaw/dorm-ramen-night.webp', rows: 5, cols: 6, tint: '#f0d0a0' },
    { id: 369, title: '토끼 달고나 노점', subtitle: '별 모양 안 깨지게', image: '/images/jigsaw/rabbit-dalgona-stall.webp', rows: 6, cols: 6, tint: '#e8b860' },
    { id: 371, title: '시골 간이역', subtitle: '기차 기다리는 난로 곁', image: '/images/jigsaw/countryside-station.webp', rows: 5, cols: 5, tint: '#c89050' },
    { id: 372, title: '팝업북 마을', subtitle: '펼치면 솟아나요', image: '/images/jigsaw/popup-book-town.webp', rows: 5, cols: 6, tint: '#f4e8c8' },
    { id: 373, title: '심야 약국', subtitle: '비 오는 밤의 초록 십자', image: '/images/jigsaw/night-pharmacy.webp', rows: 5, cols: 6, tint: '#a8d8c8' },
    { id: 374, title: '원숭이 바나나 공장', subtitle: '껍질 조심하세요', image: '/images/jigsaw/monkey-banana-factory.webp', rows: 5, cols: 6, tint: '#f0d048' },
    { id: 375, title: '우산 숲', subtitle: '비 오는 날의 버섯 우산', image: '/images/jigsaw/umbrella-forest.webp', rows: 6, cols: 7, tint: '#4a7a58' },
    { id: 376, title: '만화 카페', subtitle: '한 권만 더 볼까', image: '/images/jigsaw/comic-cafe.webp', rows: 5, cols: 5, tint: '#e8a050' },
    { id: 377, title: '여우 꽃 배달', subtitle: '봄 향기 배송 중', image: '/images/jigsaw/fox-flower-delivery.webp', rows: 6, cols: 6, tint: '#f4b8c8' },
    { id: 378, title: '요리책 속 마을', subtitle: '초콜릿 강 위의 밀방망이 다리', image: '/images/jigsaw/cookbook-village.webp', rows: 6, cols: 6, tint: '#f8d8c0' },
    { id: 379, title: '뻥튀기 장터', subtitle: '귀 막고 기다려요', image: '/images/jigsaw/puffed-rice-market.webp', rows: 6, cols: 6, tint: '#e8b060' },
    { id: 381, title: '놀이터 도시', subtitle: '시소 위의 집들', image: '/images/jigsaw/playground-city.webp', rows: 5, cols: 5, tint: '#58b8e8' },
    { id: 382, title: '택배 분류센터', subtitle: '밤새 쌓이는 상자', image: '/images/jigsaw/parcel-sorting-center.webp', rows: 5, cols: 5, tint: '#e8a050' },
    { id: 383, title: '오리 가족 아침 소풍', subtitle: '연못 섬의 아침 식사', image: '/images/jigsaw/duck-family-picnic.webp', rows: 6, cols: 6, tint: '#f8b878' },
    { id: 384, title: '아파트 알뜰시장', subtitle: '내 장난감 사 가세요', image: '/images/jigsaw/apartment-flea-market.webp', rows: 5, cols: 6, tint: '#78c868' },
    { id: 385, title: '바람개비 마을', subtitle: '바람 따라 빙글빙글', image: '/images/jigsaw/pinwheel-village.webp', rows: 6, cols: 7, tint: '#78c0f0' },
    { id: 386, title: '북극곰 스키 렌탈', subtitle: '부츠는 몇 mm?', image: '/images/jigsaw/polar-ski-rental.webp', rows: 5, cols: 6, tint: '#b8d8f0' },
    { id: 387, title: '독서실', subtitle: '밤샘 공부 중', image: '/images/jigsaw/study-room.webp', rows: 5, cols: 6, tint: '#78c898' },
    { id: 388, title: '도토리 모자 마을', subtitle: '낙엽 위의 작은 집들', image: '/images/jigsaw/acorn-village.webp', rows: 6, cols: 6, tint: '#c07a30' },
    { id: 389, title: '비버 댐 마을', subtitle: '통나무 쌓는 하루', image: '/images/jigsaw/beaver-dam-town.webp', rows: 6, cols: 6, tint: '#58b0e0' },
    { id: 391, title: '김밥 말기 대회', subtitle: '옆구리 터지지 않게', image: '/images/jigsaw/gimbap-contest.webp', rows: 5, cols: 6, tint: '#f0c868' },
    { id: 392, title: '고슴도치 파이 가게', subtitle: '사과 향 솔솔', image: '/images/jigsaw/hedgehog-pie-shop.webp', rows: 5, cols: 5, tint: '#c08850' },
    { id: 393, title: '크레용 상자 속 세계', subtitle: '무지개를 그려요', image: '/images/jigsaw/crayon-box-world.webp', rows: 6, cols: 6, tint: '#f0c830' },
    { id: 394, title: '새벽 시골 우체부', subtitle: '자전거 타고 편지 배달', image: '/images/jigsaw/dawn-mailman.webp', rows: 5, cols: 6, tint: '#f0a878' },
    { id: 395, title: '수달 보석 가게', subtitle: '반짝반짝 새 왕관', image: '/images/jigsaw/otter-jewel-shop.webp', rows: 6, cols: 6, tint: '#8a58b8' },
    { id: 396, title: '벚꽃 웨딩 촬영', subtitle: '하나 둘 셋 찰칵', image: '/images/jigsaw/blossom-photo-shoot.webp', rows: 5, cols: 6, tint: '#f8c8d8' },
    { id: 397, title: '열두 달 달력', subtitle: '계절이 한 바퀴', image: '/images/jigsaw/calendar-diorama.webp', rows: 5, cols: 6, tint: '#88d098' },
    { id: 398, title: '코알라 나무 위 찻집', subtitle: '유칼립투스 향 한 잔', image: '/images/jigsaw/koala-treetop-tea.webp', rows: 6, cols: 6, tint: '#78a868' },
    { id: 399, title: '심야 코인 빨래방', subtitle: '돌아가는 건조기 앞에서', image: '/images/jigsaw/night-coin-laundry.webp', rows: 6, cols: 7, tint: '#78c0b0' },
    { id: 401, title: '공항 출국장', subtitle: '탑승 수속 줄 서기', image: '/images/jigsaw/airport-checkin.webp', rows: 5, cols: 6, tint: '#78b8e8' },
    { id: 402, title: '올빼미 야간학교', subtitle: '달빛 아래 수업 시간', image: '/images/jigsaw/owl-night-school.webp', rows: 5, cols: 5, tint: '#1f2a5a' },
    { id: 403, title: '필통 속 도시', subtitle: '지퍼 열면 나타나는 마을', image: '/images/jigsaw/pencil-case-city.webp', rows: 5, cols: 6, tint: '#58c878' },
    { id: 404, title: '마을 노래자랑', subtitle: '무대 위 할머니 가수', image: '/images/jigsaw/village-singing-contest.webp', rows: 6, cols: 6, tint: '#e8a050' },
    { id: 405, title: '곰 우산 수리점', subtitle: '부러진 살도 척척', image: '/images/jigsaw/bear-umbrella-repair.webp', rows: 6, cols: 6, tint: '#b88858' },
    { id: 406, title: '찻잔 속 세계', subtitle: '레몬 뗏목을 타고', image: '/images/jigsaw/teacup-world.webp', rows: 5, cols: 6, tint: '#f8c8d8' },
    { id: 407, title: '출근길 버스', subtitle: '졸린 아침 창가 자리', image: '/images/jigsaw/city-bus-ride.webp', rows: 6, cols: 6, tint: '#88c890' },
    { id: 408, title: '펭귄 경찰서', subtitle: '잃어버린 꿀단지 신고', image: '/images/jigsaw/penguin-police.webp', rows: 5, cols: 6, tint: '#3a6ac8' },
    { id: 409, title: '구름 케이블카 마을', subtitle: '하늘 섬 사이를 오가요', image: '/images/jigsaw/cable-car-village.webp', rows: 6, cols: 7, tint: '#a8d4f4' },
    { id: 411, title: '미용실 파마', subtitle: '뽀글뽀글 수다 시간', image: '/images/jigsaw/hair-salon-perm.webp', rows: 5, cols: 5, tint: '#f4a8b8' },
    { id: 412, title: '방학 첫날 짐 싸기', subtitle: '트렁크가 모자라요', image: '/images/jigsaw/vacation-packing.webp', rows: 5, cols: 6, tint: '#78c0f0' },
    { id: 413, title: '오소리 이불 가게', subtitle: '폭신한 이불 한 채', image: '/images/jigsaw/badger-bedding-shop.webp', rows: 5, cols: 6, tint: '#b8a0d8' },
    { id: 414, title: '달 위 정거장', subtitle: '달 기차 출발 준비', image: '/images/jigsaw/moon-station.webp', rows: 6, cols: 6, tint: '#1a2050' },
    { id: 415, title: '대학 축제', subtitle: '동아리 부스 총출동', image: '/images/jigsaw/university-festival.webp', rows: 6, cols: 7, tint: '#f09858' },
    { id: 416, title: '고양이 섬', subtitle: '어디를 봐도 고양이', image: '/images/jigsaw/cat-island.webp', rows: 5, cols: 5, tint: '#58a8e0' },
    { id: 417, title: '약수터 아침', subtitle: '물통 줄 서기', image: '/images/jigsaw/spring-water-morning.webp', rows: 6, cols: 6, tint: '#a8d890' },
    { id: 418, title: '하마 가족 진흙 스파', subtitle: '오이 올리고 푹', image: '/images/jigsaw/hippo-mud-spa.webp', rows: 5, cols: 6, tint: '#e89040' },
    { id: 419, title: '거실 장난감 기차', subtitle: '소파 다리를 돌아서', image: '/images/jigsaw/living-room-toy-train.webp', rows: 6, cols: 7, tint: '#e8b878' },
    { id: 421, title: '물레 도자기 수업', subtitle: '흙을 빚는 오후', image: '/images/jigsaw/pottery-wheel-class.webp', rows: 5, cols: 5, tint: '#dcc8a0' },
    { id: 422, title: '당나귀 시장 수레', subtitle: '채소 가득 싣고', image: '/images/jigsaw/donkey-market-cart.webp', rows: 5, cols: 6, tint: '#90c868' },
    { id: 423, title: '퍼레이드 대기실', subtitle: '가면 쓰고 대기 중', image: '/images/jigsaw/parade-backstage.webp', rows: 6, cols: 6, tint: '#f0b0d0' },
    { id: 424, title: '연 하늘 마을', subtitle: '바람 타고 둥실', image: '/images/jigsaw/kite-sky-village.webp', rows: 5, cols: 6, tint: '#70c0f0' },
    { id: 425, title: '새벽 공원 체조', subtitle: '하나 둘 느린 동작', image: '/images/jigsaw/dawn-park-stretching.webp', rows: 6, cols: 7, tint: '#f4b898' },
    { id: 426, title: '수달 눈썰매장', subtitle: '배로 쭈욱', image: '/images/jigsaw/otter-snow-slide.webp', rows: 5, cols: 5, tint: '#b8d8f0' },
    { id: 427, title: '아침 식사 마을', subtitle: '달걀 언덕과 베이컨 길', image: '/images/jigsaw/breakfast-village.webp', rows: 6, cols: 6, tint: '#e8b858' },
    { id: 428, title: '도서관 책 읽어주기', subtitle: '용 이야기 듣는 시간', image: '/images/jigsaw/library-story-hour.webp', rows: 6, cols: 6, tint: '#78d090' },
    { id: 429, title: '눈 오는 밤 장보기', subtitle: '아기 토끼들과 장 보러', image: '/images/jigsaw/wolf-snow-market.webp', rows: 6, cols: 6, tint: '#1f2f5f' },
    { id: 431, title: '조개 진주 마을', subtitle: '진주 가로등', image: '/images/jigsaw/clam-pearl-village.webp', rows: 5, cols: 5, tint: '#58d0c8' },
    { id: 432, title: '도토리 은행', subtitle: '도토리 맡기세요', image: '/images/jigsaw/acorn-bank.webp', rows: 5, cols: 6, tint: '#8a5a30' },
    { id: 433, title: '한옥 상량식', subtitle: '대들보를 올려라', image: '/images/jigsaw/hanok-ridge-beam-ceremony.webp', rows: 6, cols: 6, tint: '#d89858' },
    { id: 434, title: '판다 사진관', subtitle: '가족사진 찍어요', image: '/images/jigsaw/panda-photo-studio.webp', rows: 5, cols: 6, tint: '#f8c8b0' },
    { id: 435, title: 'PC방 대회', subtitle: '우승 트로피를 향해', image: '/images/jigsaw/pc-cafe-tournament.webp', rows: 6, cols: 7, tint: '#5a3ab0' },
    { id: 436, title: '퍼즐 조각 세계', subtitle: '빠진 조각을 찾아서', image: '/images/jigsaw/puzzle-piece-world.webp', rows: 5, cols: 6, tint: '#a8e0b8' },
    { id: 437, title: '나무늘보 가족의 아침', subtitle: '천천히, 아주 천천히', image: '/images/jigsaw/sloth-slow-morning.webp', rows: 5, cols: 6, tint: '#78b058' },
    { id: 438, title: '극장 개봉일', subtitle: '팝콘 들고 입장', image: '/images/jigsaw/cinema-lobby.webp', rows: 6, cols: 6, tint: '#d84a48' },
    { id: 439, title: '트럼프 카드 왕국', subtitle: '하트 퀸의 성', image: '/images/jigsaw/playing-card-kingdom.webp', rows: 6, cols: 6, tint: '#58c878' },
    { id: 441, title: '참새 방앗간', subtitle: '쌀 찧는 물레방아', image: '/images/jigsaw/sparrow-rice-mill.webp', rows: 5, cols: 6, tint: '#e8a848' },
    { id: 442, title: '배드민턴 동호회', subtitle: '셔틀콕이 날아가요', image: '/images/jigsaw/badminton-club.webp', rows: 5, cols: 5, tint: '#f0c890' },
    { id: 443, title: '사슴 커피 로스터리', subtitle: '갓 볶은 향기', image: '/images/jigsaw/deer-coffee-roastery.webp', rows: 6, cols: 6, tint: '#c89868' },
    { id: 444, title: '옥상 빙수 파티', subtitle: '한여름 팥빙수 한 그릇', image: '/images/jigsaw/rooftop-bingsu-party.webp', rows: 6, cols: 6, tint: '#f0c858' },
    { id: 445, title: '레코드판 도시', subtitle: '턴테이블 위의 댄스', image: '/images/jigsaw/record-player-city.webp', rows: 6, cols: 6, tint: '#58c070' },
    { id: 446, title: '닭 에어로빅 교실', subtitle: '하나 둘 셋 날갯짓', image: '/images/jigsaw/hen-aerobics.webp', rows: 5, cols: 6, tint: '#f8b8d0' },
    { id: 447, title: '뉴스 스튜디오', subtitle: '온에어 불이 켜졌어요', image: '/images/jigsaw/tv-news-studio.webp', rows: 5, cols: 6, tint: '#2a58c0' },
    { id: 448, title: '열쇠 구멍 속 세계', subtitle: '문 너머의 비밀 정원', image: '/images/jigsaw/keyhole-world.webp', rows: 6, cols: 6, tint: '#6a4a30' },
    { id: 449, title: '새벽 제빵 공장', subtitle: '갓 구운 빵이 줄줄이', image: '/images/jigsaw/bread-factory-morning.webp', rows: 6, cols: 7, tint: '#f0c068' },
    { id: 451, title: '부엉이 우체국', subtitle: '달밤의 야간 배달', image: '/images/jigsaw/owl-night-post.webp', rows: 5, cols: 6, tint: '#2a3a78' },
    { id: 452, title: '날씨 공장', subtitle: '구름도 눈도 여기서', image: '/images/jigsaw/weather-factory.webp', rows: 5, cols: 6, tint: '#a8d0f0' },
    { id: 453, title: '서예 교실', subtitle: '붓끝에 먹물 한 방울', image: '/images/jigsaw/calligraphy-class.webp', rows: 6, cols: 6, tint: '#e8d0a8' },
    { id: 454, title: '책장 도시', subtitle: '사다리 타고 책 속으로', image: '/images/jigsaw/bookshelf-city.webp', rows: 6, cols: 6, tint: '#d89858' },
    { id: 455, title: '얼룩말 줄무늬 페인트공', subtitle: '흰 줄 검은 줄 쓱쓱', image: '/images/jigsaw/zebra-stripe-painters.webp', rows: 6, cols: 6, tint: '#78a8d8' },
    { id: 456, title: '동네 철물점', subtitle: '열쇠도 복사해요', image: '/images/jigsaw/hardware-store.webp', rows: 5, cols: 6, tint: '#78c070' },
    { id: 457, title: '지구본 여행 마을', subtitle: '캐리어 들고 한 바퀴', image: '/images/jigsaw/globe-travel-town.webp', rows: 6, cols: 6, tint: '#58a8e0' },
    { id: 458, title: '염소 절벽 카페', subtitle: '구름 아래 한 잔', image: '/images/jigsaw/goat-cliff-cafe.webp', rows: 5, cols: 6, tint: '#78c0f0' },
    { id: 459, title: '눈 오는 날 하교길', subtitle: '하교 종이 울리면', image: '/images/jigsaw/snow-school-gate.webp', rows: 6, cols: 7, tint: '#c8d4e4' },
    { id: 461, title: '양털 깎는 날', subtitle: '폭신한 털이 수북', image: '/images/jigsaw/sheep-shearing-day.webp', rows: 5, cols: 6, tint: '#8ac868' },
    { id: 462, title: '재봉 바구니 속 마을', subtitle: '실패 탑과 단추 징검다리', image: '/images/jigsaw/sewing-basket-town.webp', rows: 5, cols: 6, tint: '#ead9b8' },
    { id: 463, title: '비 오는 날 서점', subtitle: '젖은 우산과 책 한 권', image: '/images/jigsaw/rainy-bookstore.webp', rows: 5, cols: 6, tint: '#f0c060' },
    { id: 464, title: '여우 가족 단풍 소풍', subtitle: '도시락 열면 가을 냄새', image: '/images/jigsaw/fox-maple-picnic.webp', rows: 6, cols: 6, tint: '#e88a30' },
    { id: 465, title: '군고구마 트럭', subtitle: '눈 오는 밤 한 봉지', image: '/images/jigsaw/sweet-potato-truck.webp', rows: 6, cols: 7, tint: '#1f2f5f' },
    { id: 466, title: '여우 불꽃놀이 공장', subtitle: '펑! 하고 별이 터져요', image: '/images/jigsaw/fox-fireworks-workshop.webp', rows: 5, cols: 5, tint: '#1f2a5a' },
    { id: 467, title: '수박 속 마을', subtitle: '씨앗 집과 껍질 미끄럼틀', image: '/images/jigsaw/watermelon-village.webp', rows: 6, cols: 6, tint: '#e83030' },
    { id: 468, title: '모내기 체험', subtitle: '진흙 속에서 첨벙', image: '/images/jigsaw/rice-planting-day.webp', rows: 5, cols: 6, tint: '#78b858' },
    { id: 469, title: '동물 패션쇼', subtitle: '런웨이를 걷는 표범', image: '/images/jigsaw/animal-fashion-show.webp', rows: 6, cols: 7, tint: '#f8b8d0' },
    { id: 471, title: '학교 급식 조리실', subtitle: '새벽부터 보글보글', image: '/images/jigsaw/school-kitchen-dawn.webp', rows: 5, cols: 5, tint: '#f0d878' },
    { id: 472, title: '두꺼비 연못 합창단', subtitle: '연잎 위 지휘자 선생님', image: '/images/jigsaw/toad-pond-choir.webp', rows: 5, cols: 6, tint: '#48b8a0' },
    { id: 473, title: '빨래집게 마을', subtitle: '빨랫줄 위의 골목', image: '/images/jigsaw/clothespin-village.webp', rows: 6, cols: 6, tint: '#78c878' },
    { id: 474, title: '떡국 끓이는 아침', subtitle: '새해 첫 상차림', image: '/images/jigsaw/rice-cake-soup-morning.webp', rows: 6, cols: 6, tint: '#f4d878' },
    { id: 475, title: '양떼 미용실', subtitle: '뽀글뽀글 새 털 스타일', image: '/images/jigsaw/sheep-perm-salon.webp', rows: 6, cols: 7, tint: '#f8b8c8' },
    { id: 476, title: '달걀판 도시', subtitle: '계란 한 판의 마을', image: '/images/jigsaw/egg-carton-city.webp', rows: 5, cols: 5, tint: '#e8d8a8' },
    { id: 477, title: '어린이집 산책', subtitle: '줄줄이 노란 모자', image: '/images/jigsaw/kindergarten-walk.webp', rows: 6, cols: 6, tint: '#a8d878' },
    { id: 478, title: '코뿔소 항구 짐꾼', subtitle: '뿔로 척척 상자 나르기', image: '/images/jigsaw/rhino-harbor-porters.webp', rows: 6, cols: 6, tint: '#58b0e8' },
    { id: 479, title: '자전거 바퀴 도시', subtitle: '바퀴살 사이의 마을', image: '/images/jigsaw/bicycle-wheel-city.webp', rows: 6, cols: 6, tint: '#78d070' },
    { id: 481, title: '밤낚시 좌대', subtitle: '달빛 아래 찌 하나', image: '/images/jigsaw/night-fishing-platform.webp', rows: 5, cols: 6, tint: '#1a4a78' },
    { id: 482, title: '침팬지 미술관', subtitle: '바나나 그림도 걸렸어요', image: '/images/jigsaw/chimp-gallery.webp', rows: 5, cols: 6, tint: '#f4ecd8' },
    { id: 483, title: '공원 인형극', subtitle: '토끼와 늑대가 나왔어요', image: '/images/jigsaw/puppet-show-park.webp', rows: 6, cols: 6, tint: '#f8c878' },
    { id: 484, title: '가방 속 세계', subtitle: '지퍼를 열면 모험', image: '/images/jigsaw/backpack-world.webp', rows: 5, cols: 6, tint: '#78d070' },
    { id: 485, title: '고릴라 한식당', subtitle: '불꽃 튀는 불고기', image: '/images/jigsaw/gorilla-korean-restaurant.webp', rows: 6, cols: 7, tint: '#c8683a' },
    { id: 486, title: '도장 가게', subtitle: '한 자 한 자 새겨요', image: '/images/jigsaw/seal-carving-shop.webp', rows: 5, cols: 6, tint: '#b85a38' },
    { id: 487, title: '장화 마을', subtitle: '물웅덩이 첨벙첨벙', image: '/images/jigsaw/rain-boot-village.webp', rows: 6, cols: 6, tint: '#78d0f0' },
    { id: 488, title: '독수리 관제탑', subtitle: '이륙 허가 나갑니다', image: '/images/jigsaw/eagle-control-tower.webp', rows: 6, cols: 6, tint: '#58b8f0' },
    { id: 489, title: '오케스트라 리허설', subtitle: '지휘봉이 올라가요', image: '/images/jigsaw/orchestra-rehearsal.webp', rows: 6, cols: 6, tint: '#e8a850' },
    { id: 491, title: '냉장고 속 세계', subtitle: '치즈 동굴과 잼 수영장', image: '/images/jigsaw/fridge-world.webp', rows: 5, cols: 6, tint: '#c8e4f4' },
    { id: 492, title: '고양이 카센터', subtitle: '타이어 펑크 났어요', image: '/images/jigsaw/cat-auto-garage.webp', rows: 5, cols: 5, tint: '#78b8e8' },
    { id: 493, title: '참기름 방앗간', subtitle: '고소한 향이 한가득', image: '/images/jigsaw/sesame-oil-mill.webp', rows: 6, cols: 6, tint: '#e8c050' },
    { id: 494, title: '문어 안마원', subtitle: '여덟 손으로 시원하게', image: '/images/jigsaw/octopus-massage.webp', rows: 6, cols: 6, tint: '#7fd0a0' },
    { id: 495, title: '장바구니 속 마을', subtitle: '식빵 집과 당근 등대', image: '/images/jigsaw/grocery-basket-town.webp', rows: 6, cols: 7, tint: '#e84a40' },
    { id: 496, title: '마을 줄다리기', subtitle: '영차 영차 힘을 모아', image: '/images/jigsaw/village-tug-of-war.webp', rows: 5, cols: 6, tint: '#78c860' },
    { id: 497, title: '하이에나 웃음 클럽', subtitle: '무대 위 개그 한 판', image: '/images/jigsaw/hyena-laughing-club.webp', rows: 5, cols: 6, tint: '#8a4a98' },
    { id: 498, title: '공구함 속 세계', subtitle: '망치 탑과 줄자 길', image: '/images/jigsaw/toolbox-world.webp', rows: 6, cols: 6, tint: '#e04038' },
    { id: 499, title: '증명사진관', subtitle: '자, 웃지 말고 정면!', image: '/images/jigsaw/id-photo-studio.webp', rows: 6, cols: 7, tint: '#f0d8b0' },
    { id: 501, title: '치킨집 응원 야식', subtitle: '골~! 치킨 한 입', image: '/images/jigsaw/chicken-night-cheer.webp', rows: 6, cols: 6, tint: '#e8a060' },
    { id: 502, title: '털실 바구니 속 마을', subtitle: '목도리 길을 따라서', image: '/images/jigsaw/yarn-basket-town.webp', rows: 5, cols: 6, tint: '#f0a8c0' },
    { id: 503, title: '라쿤 헬기 구조대', subtitle: '눈산에 로프를 내려요', image: '/images/jigsaw/raccoon-rescue-heli.webp', rows: 6, cols: 6, tint: '#78b8f0' },
    { id: 504, title: '옹기 굽는 마을', subtitle: '항아리가 줄지어', image: '/images/jigsaw/onggi-village.webp', rows: 6, cols: 6, tint: '#a87850' },
    { id: 505, title: '미니 철도 모형 도시', subtitle: '탁자 위 달리는 기차', image: '/images/jigsaw/model-railway-city.webp', rows: 6, cols: 6, tint: '#d8b078' },
    { id: 506, title: '여우 자수 공방', subtitle: '한 땀 한 땀 꽃이 피어요', image: '/images/jigsaw/fox-embroidery-studio.webp', rows: 5, cols: 6, tint: '#f0c898' },
    { id: 507, title: '빌딩 유리창 청소부', subtitle: '높이높이 쓱싹쓱싹', image: '/images/jigsaw/window-cleaner-tower.webp', rows: 6, cols: 6, tint: '#78b8e8' },
    { id: 508, title: '솜사탕 구름 마을', subtitle: '폭신폭신 달콤한 하늘', image: '/images/jigsaw/cotton-candy-cloud-town.webp', rows: 6, cols: 6, tint: '#f4b8d8' },
    { id: 509, title: '타조 달리기 대회', subtitle: '결승선을 향해 쌩쌩', image: '/images/jigsaw/ostrich-race-day.webp', rows: 6, cols: 7, tint: '#a8d878' },
    { id: 511, title: '마을 국수 잔치', subtitle: '후루룩 한 그릇씩', image: '/images/jigsaw/noodle-sharing-festival.webp', rows: 6, cols: 6, tint: '#80c870' },
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
    { id: 310, title: '최후의 만찬', subtitle: '명화 컬렉션', image: '/images/jigsaw/last-supper.webp', rows: 6, cols: 7, tint: '#b89868' },
    { id: 320, title: '야경', subtitle: '명화 컬렉션', image: '/images/jigsaw/night-watch.webp', rows: 6, cols: 7, tint: '#6a4a28' },
    { id: 330, title: '뱃놀이 점심', subtitle: '명화 컬렉션', image: '/images/jigsaw/boating-party.webp', rows: 7, cols: 7, tint: '#e08a6a' },
    { id: 340, title: '월하정인', subtitle: '명화 컬렉션', image: '/images/jigsaw/wolha-jeongin.webp', rows: 6, cols: 7, tint: '#1f2f5a' },
    { id: 350, title: '춤', subtitle: '명화 컬렉션', image: '/images/jigsaw/matisse-dance.webp', rows: 7, cols: 7, tint: '#2a4ad0' },
    { id: 360, title: '시녀들', subtitle: '명화 컬렉션', image: '/images/jigsaw/las-meninas.webp', rows: 6, cols: 7, tint: '#7a5a38' },
    { id: 370, title: '휘슬러의 어머니', subtitle: '명화 컬렉션', image: '/images/jigsaw/whistlers-mother.webp', rows: 7, cols: 7, tint: '#8a8a90' },
    { id: 380, title: '인왕제색도', subtitle: '명화 컬렉션', image: '/images/jigsaw/inwang-jesaek.webp', rows: 7, cols: 7, tint: '#8a98a8' },
    { id: 390, title: '아담의 창조', subtitle: '명화 컬렉션', image: '/images/jigsaw/creation-of-adam.webp', rows: 6, cols: 7, tint: '#a8d0f0' },
    { id: 400, title: '빨강 파랑 노랑의 구성', subtitle: '명화 컬렉션', image: '/images/jigsaw/mondrian-composition.webp', rows: 7, cols: 7, tint: '#e04030' },
    { id: 410, title: '양귀비 들판', subtitle: '명화 컬렉션', image: '/images/jigsaw/poppy-field.webp', rows: 6, cols: 7, tint: '#8ac860' },
    { id: 420, title: '아몬드 꽃', subtitle: '명화 컬렉션', image: '/images/jigsaw/almond-blossoms.webp', rows: 7, cols: 7, tint: '#30c0d8' },
    { id: 430, title: '생명의 나무', subtitle: '명화 컬렉션', image: '/images/jigsaw/tree-of-life.webp', rows: 7, cols: 7, tint: '#1a5a62' },
    { id: 440, title: '무동', subtitle: '명화 컬렉션', image: '/images/jigsaw/mudong.webp', rows: 7, cols: 7, tint: '#f4e0c0' },
    { id: 450, title: '파적도', subtitle: '명화 컬렉션', image: '/images/jigsaw/pajeokdo.webp', rows: 7, cols: 7, tint: '#f0d8a0' },
    { id: 460, title: '흰 소', subtitle: '명화 컬렉션', image: '/images/jigsaw/white-ox.webp', rows: 6, cols: 7, tint: '#e8a050' },
    { id: 470, title: '세 악사', subtitle: '명화 컬렉션', image: '/images/jigsaw/three-musicians.webp', rows: 7, cols: 7, tint: '#2a50b0' },
    { id: 480, title: '발레 수업', subtitle: '명화 컬렉션', image: '/images/jigsaw/dance-class.webp', rows: 7, cols: 7, tint: '#88b890' },
    { id: 490, title: '소나기 내리는 다리', subtitle: '명화 컬렉션', image: '/images/jigsaw/ohashi-rain.webp', rows: 7, cols: 7, tint: '#587890' },
    { id: 500, title: '사과 정물', subtitle: '명화 컬렉션', image: '/images/jigsaw/cezanne-apples.webp', rows: 7, cols: 7, tint: '#7890c0' },
    { id: 510, title: '타히티의 여인들', subtitle: '명화 컬렉션', image: '/images/jigsaw/tahiti-women.webp', rows: 7, cols: 7, tint: '#e8806a' },
    { id: 520, title: '건초 마차', subtitle: '명화 컬렉션', image: '/images/jigsaw/hay-wain.webp', rows: 7, cols: 7, tint: '#5aa8d8' },
    { id: 530, title: '카드놀이 하는 사람들', subtitle: '명화 컬렉션', image: '/images/jigsaw/card-players.webp', rows: 7, cols: 7, tint: '#8a5a38' },
    { id: 540, title: '오필리아', subtitle: '명화 컬렉션', image: '/images/jigsaw/ophelia-river.webp', rows: 7, cols: 7, tint: '#3f7a4a' },
    { id: 550, title: '파리 거리, 비 오는 날', subtitle: '명화 컬렉션', image: '/images/jigsaw/paris-rainy-day.webp', rows: 7, cols: 7, tint: '#8890a8' },
    { id: 560, title: '대장간', subtitle: '명화 컬렉션', image: '/images/jigsaw/danwon-blacksmith.webp', rows: 7, cols: 7, tint: '#e8c8a0' },
    { id: 570, title: '물뿌리개를 든 소녀', subtitle: '명화 컬렉션', image: '/images/jigsaw/girl-watering-can.webp', rows: 7, cols: 7, tint: '#78b860' },
    { id: 580, title: '농부의 결혼식', subtitle: '명화 컬렉션', image: '/images/jigsaw/peasant-wedding.webp', rows: 7, cols: 7, tint: '#b05a40' },
    { id: 590, title: '더 큰 첨벙', subtitle: '명화 컬렉션', image: '/images/jigsaw/bigger-splash.webp', rows: 7, cols: 7, tint: '#20b0e0' },
    { id: 600, title: '만종', subtitle: '명화 컬렉션', image: '/images/jigsaw/angelus-field.webp', rows: 7, cols: 7, tint: '#f09840' },
];

function withMasterpieces(list: JigsawStage[]): JigsawStage[] {
    const out = [...list];
    // ascending id order, so a masterpiece that unlocks the next one is already in place
    for (const m of [...RESERVED_MASTERPIECES].sort((a, b) => a.id - b.id)) {
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

/**
 * Rotation gimmick (from stage 501): some pieces start turned, tap a loose piece to turn it.
 * Only 3 of every 10 stages (ids ending in 1, 4, 7 — evenly spaced, never a masterpiece),
 * and only on square grids (rows = cols) — give those stages a square size when registering,
 * and the share of turned pieces grows slowly: 501 is a 3-piece intro, then 20% → 30% → 40%.
 */
export const ROTATION_FROM = 501;
export function rotatedPieceCount(stage: JigsawStage): number {
    const { id } = stage;
    if (id < ROTATION_FROM || stage.subtitle === '명화 컬렉션' || ![1, 4, 7].includes(id % 10)) return 0;
    // only square grids: a non-square cell can't sit at 90°, and 180°-only flips felt half-baked
    if (stage.rows !== stage.cols) return 0;
    if (id === ROTATION_FROM) return 3;
    const ratio = id <= 550 ? 0.2 : id <= 600 ? 0.3 : 0.4;
    return Math.max(3, Math.round(stage.rows * stage.cols * ratio));
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
