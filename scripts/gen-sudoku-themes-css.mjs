/**
 * 스도쿠 추가 테마 CSS 생성기.
 * 기존 테마(src/index.css)와 같은 셀렉터 세트를 팔레트에서 찍어 낸다.
 * 팔레트·특수효과(extra)를 고친 뒤:  node scripts/gen-sudoku-themes-css.mjs
 * 출력: src/features/sudoku/styles/themes-extra.css (SudokuGame.tsx에서 import)
 */
import { writeFileSync } from 'fs';

const THEMES = {
    // ── 무료: 고대비 (접근성) ──
    contrast: {
        bg: '#000000', bg2: '#111111', brand: '#ffe600', brand2: '#ffffff', text: '#ffffff', muted: '#ffe600',
        cell: '#ffffff', cellHi: '#e6e6e6', cellSel: '#ffe600', cellSame: '#fff59d', error: '#ff1744',
        nav: '#000000', navShadow: '#333333', navIcon: '#ffe600',
        board: '#000000', thin: '#555555', initial: '#000000', user: '#0039e6', num: '#ffffff', numDis: '#555555',
        note: '#0039e6', modal: '#111111', modalBody: '#000000', modalText: '#ffffff', primary: '#ffe600', primaryText: '#000000',
        extra: `
html.theme-contrast .sudoku-board { border-width: 4px; box-shadow: 0 0 0 3px #ffe600; }
html.theme-contrast .sudoku-cell.initial { font-weight: 800; }
html.theme-contrast .sudoku-cell.user { font-weight: 700; }
html.theme-contrast .sudoku-cell.user.error { color: #ff1744; background: #ffe5ea; }`,
    },
    // ── 일반 ──
    lavender: {
        bg: '#f3e8ff', bg2: '#ede1fb', brand: '#7c3aed', brand2: '#5b21b6', text: '#4c1d95', muted: '#7c3aed',
        cell: '#faf5ff', cellHi: '#efe4fc', cellSel: '#ddd0fb', cellSame: '#efe4fc', error: '#dc2626',
        nav: '#5b21b6', navShadow: '#7c3aed', navIcon: '#f3e8ff',
        board: '#7c3aed', thin: '#d8c6f5', initial: '#4c1d95', user: '#7c3aed', num: '#7c3aed', numDis: '#ddd0fb',
        note: '#8b5cf6', modal: '#5b21b6', modalBody: '#f3e8ff', modalText: '#4c1d95', primary: '#7c3aed',
    },
    apricot: {
        bg: '#ffedd5', bg2: '#fde5c8', brand: '#ea7a2e', brand2: '#9a4a14', text: '#7c3a10', muted: '#c2621f',
        cell: '#fff7ed', cellHi: '#ffedd5', cellSel: '#fed7aa', cellSame: '#ffedd5', error: '#dc2626',
        nav: '#9a4a14', navShadow: '#c2621f', navIcon: '#ffedd5',
        board: '#ea7a2e', thin: '#f8c9a0', initial: '#7c3a10', user: '#ea7a2e', num: '#ea7a2e', numDis: '#fed7aa',
        note: '#f08a44', modal: '#9a4a14', modalBody: '#ffedd5', modalText: '#7c3a10', primary: '#ea7a2e',
    },
    forest: {
        bg: '#13241a', bg2: '#183022', brand: '#7cc796', brand2: '#4f9e6a', text: '#e3f1e6', muted: '#7cc796',
        cell: '#1a3123', cellHi: '#22402d', cellSel: '#2d5a3c', cellSame: '#22402d', error: '#f87171',
        nav: '#0c1811', navShadow: '#13241a', navIcon: '#a7dcb6',
        board: '#7cc796', thin: '#2b4a35', initial: '#e3f1e6', user: '#7cc796', num: '#7cc796', numDis: '#2b4a35',
        note: '#7cc796', modal: '#183022', modalBody: '#13241a', modalText: '#e3f1e6', primary: '#4f9e6a',
    },
    // ── 희귀 ──
    manuscript: {
        // 원고지: 크림 종이 + 주홍 칸선
        bg: '#fbf7ee', bg2: '#f6efdf', brand: '#d9534f', brand2: '#a83a36', text: '#2b2522', muted: '#c0504d',
        cell: '#fffdf7', cellHi: '#fdf0e6', cellSel: '#f9d9cf', cellSame: '#fdf0e6', error: '#c0262c',
        nav: '#a83a36', navShadow: '#d9534f', navIcon: '#fbf7ee',
        board: '#d9534f', thin: '#efb3a6', initial: '#2b2522', user: '#2b5aa8', num: '#c0504d', numDis: '#efc9bf',
        note: '#d9534f', modal: '#a83a36', modalBody: '#fbf7ee', modalText: '#2b2522', primary: '#d9534f',
        extra: `
html.theme-manuscript .sudoku-board { border-width: 3px; outline: 1px solid #d9534f; outline-offset: 3px; }
html.theme-manuscript .sudoku-cell.initial { font-family: 'Nanum Myeongjo', 'Noto Serif KR', 'Batang', serif; font-weight: 700; }`,
    },
    picnic: {
        // 피크닉 체크: 연한 깅엄 배경 + 흰 판
        bg: '#fdf2f2', bg2: '#fbe6e6', brand: '#d64545', brand2: '#a32f2f', text: '#4a2222', muted: '#c24040',
        cell: '#ffffff', cellHi: '#fdeeee', cellSel: '#f9d2d2', cellSame: '#fdeeee', error: '#b91c1c',
        nav: '#a32f2f', navShadow: '#d64545', navIcon: '#fff5f5',
        board: '#d64545', thin: '#f3c4c4', initial: '#4a2222', user: '#2f6db5', num: '#d64545', numDis: '#f3c4c4',
        note: '#e06666', modal: '#a32f2f', modalBody: '#fdf2f2', modalText: '#4a2222', primary: '#d64545',
        extra: `
html.theme-picnic body, html.theme-picnic #root {
  background-color: #fffafa;
  background-image:
    repeating-linear-gradient(0deg, rgba(214,69,69,0.10) 0 18px, transparent 18px 36px),
    repeating-linear-gradient(90deg, rgba(214,69,69,0.10) 0 18px, transparent 18px 36px);
}
html.theme-picnic .sudoku-board { box-shadow: 0 6px 0 rgba(163,47,47,0.18); }`,
    },
    // ── 영웅 ──
    neon: {
        bg: '#0b0614', bg2: '#130a22', brand: '#ff4fd8', brand2: '#3ef2ff', text: '#f5e9ff', muted: '#ff8fe6',
        cell: '#120a20', cellHi: '#1d1033', cellSel: '#2c1350', cellSame: '#1d1033', error: '#ff5370',
        nav: '#07030d', navShadow: '#130a22', navIcon: '#3ef2ff',
        board: '#ff4fd8', thin: '#2a1a40', initial: '#f5e9ff', user: '#3ef2ff', num: '#3ef2ff', numDis: '#2a1a40',
        note: '#ff8fe6', modal: '#130a22', modalBody: '#0b0614', modalText: '#f5e9ff', primary: '#ff4fd8',
        extra: `
/* 정적인 글로우만 — 깜빡임 없음 */
html.theme-neon .sudoku-board { box-shadow: 0 0 0 1px #ff4fd8, 0 0 16px rgba(255,79,216,0.55), inset 0 0 12px rgba(255,79,216,0.25); }
html.theme-neon .sudoku-cell.initial { text-shadow: 0 0 6px rgba(255,79,216,0.6); }
html.theme-neon .sudoku-cell.user { text-shadow: 0 0 6px rgba(62,242,255,0.7); }
html.theme-neon .number-btn { text-shadow: 0 0 6px rgba(62,242,255,0.5); }
html.theme-neon .number-btn:disabled { text-shadow: none; }`,
    },
    aquarium: {
        bg: '#073b4c', bg2: '#0a4a5e', brand: '#5ee0d0', brand2: '#2bb3a3', text: '#e6fbf8', muted: '#8deee2',
        cell: '#0b4558', cellHi: '#0f5670', cellSel: '#156b85', cellSame: '#0f5670', error: '#ff8a80',
        nav: '#04262f', navShadow: '#073b4c', navIcon: '#8deee2',
        board: '#5ee0d0', thin: '#135c72', initial: '#e6fbf8', user: '#5ee0d0', num: '#5ee0d0', numDis: '#135c72',
        note: '#8deee2', modal: '#0a4a5e', modalBody: '#073b4c', modalText: '#e6fbf8', primary: '#2bb3a3',
        extra: `
/* 판 뒤 배경에서만 천천히 올라가는 기포 (판 위에는 아무것도 지나가지 않음) */
html.theme-aquarium { background: linear-gradient(180deg, #0a5068 0%, #073b4c 45%, #042a36 100%) fixed; }
html.theme-aquarium body, html.theme-aquarium #root { background: transparent; }
html.theme-aquarium body::before {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0.35;
  background-image:
    radial-gradient(circle at 31% 47%, rgba(255,255,255,0.7) 0 2px, transparent 3px),
    radial-gradient(circle at 67% 19%, rgba(255,255,255,0.5) 0 3px, transparent 4px),
    radial-gradient(circle at 83% 71%, rgba(255,255,255,0.6) 0 1.5px, transparent 2.5px);
  background-size: 149px 223px, 233px 331px, 97px 163px;
  background-position: 10px 0, 70px 40px, 40px 90px;
  animation: sd-bubbles 26s linear infinite;
}
@keyframes sd-bubbles { to { background-position: 10px -223px, 70px -291px, 40px -73px; } }`,
    },
    winter: {
        bg: '#1d2b44', bg2: '#24365a', brand: '#9cc6ec', brand2: '#5f93c6', text: '#eaf3fb', muted: '#b7d4ef',
        cell: '#f4f8fc', cellHi: '#e3eef9', cellSel: '#c9def3', cellSame: '#e3eef9', error: '#d64545',
        nav: '#14203a', navShadow: '#1d2b44', navIcon: '#cfe3f6',
        board: '#9cc6ec', thin: '#cbdcec', initial: '#1d2b44', user: '#3c78b4', num: '#cfe3f6', numDis: '#3b4d6e',
        note: '#3c78b4', modal: '#24365a', modalBody: '#1d2b44', modalText: '#eaf3fb', primary: '#5f93c6',
        extra: `
/* 판 뒤로만 천천히 내리는 눈 */
html.theme-winter { background: linear-gradient(180deg, #14203a 0%, #1d2b44 60%, #2c4166 100%) fixed; }
html.theme-winter body, html.theme-winter #root { background: transparent; }
html.theme-winter body::before {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0.55;
  background-image:
    radial-gradient(circle at 23% 31%, #fff 0 1.6px, transparent 2.4px),
    radial-gradient(circle at 71% 64%, #fff 0 1px, transparent 1.8px),
    radial-gradient(circle at 42% 87%, rgba(255,255,255,0.85) 0 2.2px, transparent 3px),
    radial-gradient(circle at 88% 12%, rgba(255,255,255,0.7) 0 1.3px, transparent 2px);
  background-size: 137px 163px, 89px 101px, 211px 241px, 173px 127px;
  background-position: 0 0, 41px 29px, 93px 61px, 17px 83px;
  animation: sd-snow 30s linear infinite;
}
html.theme-winter .sudoku-board { box-shadow: 0 0 0 3px rgba(255,255,255,0.35), 0 8px 24px rgba(0,0,0,0.25); }
@keyframes sd-snow { to { background-position: 137px 326px, 130px 231px, 304px 543px, 17px 337px; } }`,
    },
    // ── 전설: 판 뒤 배경 이펙트(영웅보다 한 겹 더) + 풀이 진행 반응 (완성 줄의 animate-sweep-* 클래스 / Board.tsx 가 넣는 --sd-progress) ──
    gold: {
        bg: '#1c1710', bg2: '#251e14', brand: '#d4ad3b', brand2: '#a8801a', text: '#f6ead0', muted: '#d4ad3b',
        cell: '#fbf6e9', cellHi: '#f4ead0', cellSel: '#ecd9a4', cellSame: '#f4ead0', error: '#c0262c',
        nav: '#120e09', navShadow: '#251e14', navIcon: '#e8c766',
        board: '#c9a227', thin: '#e6d6ab', initial: '#3b2f12', user: '#a8801a', num: '#e8c766', numDis: '#4a3d22',
        note: '#a8801a', modal: '#251e14', modalBody: '#1c1710', modalText: '#f6ead0', primary: '#c9a227', primaryText: '#1c1710',
        extra: `
/* 배경: 어두운 금빛 비네트 + 천천히 떠오르는 금가루(body::before) + 드문드문 반짝이는 별빛(body::after) — 판 뒤에서만 */
html.theme-gold { background: radial-gradient(ellipse at 50% 38%, #3d2e12 0%, #1c1710 55%, #0d0a06 100%) fixed; }
html.theme-gold body, html.theme-gold #root { background: transparent; }
html.theme-gold body::before {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: 0.75;
  background-image:
    radial-gradient(circle at 21% 37%, #ffd970 0 1.2px, transparent 2px),
    radial-gradient(circle at 73% 61%, #f5c542 0 1.6px, transparent 2.6px),
    radial-gradient(circle at 47% 83%, #ffe9a8 0 1px, transparent 1.8px),
    radial-gradient(circle at 89% 17%, #d4ad3b 0 2px, transparent 3px);
  background-size: 113px 149px, 167px 211px, 79px 97px, 233px 271px;
  background-position: 0 0, 53px 31px, 19px 67px, 101px 13px;
  animation: sd-gold-dust 48s linear infinite;
}
html.theme-gold body::after {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background-image:
    radial-gradient(circle at 30% 40%, rgba(255,240,190,0.95) 0 1.5px, rgba(255,214,110,0.35) 3px, transparent 9px),
    radial-gradient(circle at 70% 70%, rgba(255,240,190,0.9) 0 1.2px, rgba(255,214,110,0.3) 2.5px, transparent 8px);
  background-size: 311px 389px, 257px 331px;
  background-position: 37px 59px, 181px 211px;
  animation: sd-gold-twinkle 5.5s ease-in-out infinite, sd-gold-drift 90s linear infinite;
}
@keyframes sd-gold-dust { to { background-position: 0 -298px, 53px -391px, 19px -321px, 101px -258px; } }
@keyframes sd-gold-drift { to { background-position: 37px -330px, 181px -120px; } }
@keyframes sd-gold-twinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 0.9; } }
/* 판: 금테 + 아주 느리게 숨 쉬는 금빛 후광 */
html.theme-gold .sudoku-board {
  border-color: #c9a227;
  box-shadow: 0 0 0 2px #1c1710, 0 0 0 4px #8a6a14, 0 0 22px rgba(245,197,66,0.25), 0 10px 30px rgba(0,0,0,0.45);
  animation: sd-gold-halo 7s ease-in-out infinite;
}
@keyframes sd-gold-halo {
  0%, 100% { box-shadow: 0 0 0 2px #1c1710, 0 0 0 4px #8a6a14, 0 0 18px rgba(245,197,66,0.18), 0 10px 30px rgba(0,0,0,0.45); }
  50% { box-shadow: 0 0 0 2px #1c1710, 0 0 0 4px #b08a1e, 0 0 30px rgba(245,197,66,0.38), 0 10px 30px rgba(0,0,0,0.45); }
}
/* 줄·열·박스를 완성한 순간(기존 animate-sweep-* 훅) 한 번만 금빛이 훑고 지나감 — 기본 확대 효과는 끔 */
html.theme-gold .sudoku-cell:is(.animate-sweep-row, .animate-sweep-col, .animate-sweep-sector) { animation: none; position: relative; overflow: hidden; }
html.theme-gold .sudoku-cell:is(.animate-sweep-row, .animate-sweep-col, .animate-sweep-sector)::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(255,226,130,0.85) 50%, transparent 70%);
  background-size: 250% 100%;
  animation: sd-gold-sweep 0.9s ease-out both;
  animation-delay: var(--flash-delay, 0s);
}
html.theme-gold .animate-sweep-row, html.theme-dawn .animate-sweep-row { --flash-delay: calc(var(--col-idx) * 0.05s); }
html.theme-gold .animate-sweep-col, html.theme-dawn .animate-sweep-col { --flash-delay: calc(var(--row-idx) * 0.05s); }
html.theme-gold .animate-sweep-sector, html.theme-dawn .animate-sweep-sector { --flash-delay: calc((var(--inner-row) * 3 + var(--inner-col)) * 0.05s); }
@keyframes sd-gold-sweep { from { background-position: 120% 0; } to { background-position: -120% 0; } }
/* 클리어 연출(html.sd-clear, SudokuGame.tsx): 대각선으로 칸이 하나씩 금괴로 굳고 판이 크게 빛남 */
html.theme-gold.sd-clear .sudoku-cell {
  animation: sd-goldify 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both !important;
  animation-delay: calc((var(--row) + var(--col)) * 0.045s) !important;
}
@keyframes sd-goldify {
  0% { background-color: var(--cell-bg); }
  45% { background-color: #fff3c0; transform: scale(1.12); }
  100% { background-color: #e9c45a; color: #4a3608; transform: scale(1); text-shadow: 0 1px 0 rgba(255,240,190,0.9), 0 -1px 0 rgba(120,80,10,0.35); }
}
html.theme-gold.sd-clear .sudoku-board { animation: sd-gold-board 2s ease both; }
@keyframes sd-gold-board {
  0% { box-shadow: 0 0 0 2px #1c1710, 0 0 0 4px #8a6a14, 0 0 20px rgba(245,197,66,0.2); }
  60%, 100% { box-shadow: 0 0 0 2px #1c1710, 0 0 0 4px #f5c542, 0 0 60px 12px rgba(245,197,66,0.55); }
}`,
    },
    dawn: {
        // 하늘(배경)은 --sd-progress(0~1)에 따라 밤→새벽→아침. 판 자체는 항상 같은 밝은 색이라 가독성 유지.
        bg: '#1b2340', bg2: '#232c4e', brand: '#e0875a', brand2: '#b85f3a', text: '#3a2c3f', muted: '#b85f3a',
        cell: '#fffaf3', cellHi: '#fdeedd', cellSel: '#f9d6b8', cellSame: '#fdeedd', error: '#c0262c',
        nav: '#151b33', navShadow: '#1b2340', navIcon: '#f7cfa8',
        board: '#e0875a', thin: '#f1d5bd', initial: '#3a2c3f', user: '#d0703f', num: '#f7cfa8', numDis: '#5a5470',
        note: '#d0703f', modal: '#232c4e', modalBody: '#1b2340', modalText: '#fdf1e4', primary: '#e0875a',
        extra: `
html.theme-dawn {
  --sd-p: var(--sd-progress, 0);
  /* 0 → 0.5: 밤 남색 → 새벽 보라·분홍, 0.5 → 1: → 아침 살구빛 */
  --sd-sky-top: color-mix(in srgb, color-mix(in srgb, #ffd9a8 calc(max(var(--sd-p) - 0.5, 0) * 200%), #6b4e8a) calc(min(var(--sd-p) * 2, 1) * 100%), #0f1530);
  --sd-sky-bot: color-mix(in srgb, color-mix(in srgb, #fff1dc calc(max(var(--sd-p) - 0.5, 0) * 200%), #f29e86) calc(min(var(--sd-p) * 2, 1) * 100%), #283561);
  --sd-ink: color-mix(in srgb, #5a3a2a calc(min(max(var(--sd-p) - 0.3, 0) * 500%, 100%)), #f7cfa8);
}
html.theme-dawn { background: linear-gradient(180deg, var(--sd-sky-top), var(--sd-sky-bot)) fixed; }
html.theme-dawn body, html.theme-dawn #root { background: transparent; }
/* 별: 진행될수록 사라짐 */
html.theme-dawn body::before {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  opacity: calc(0.9 - var(--sd-p) * 1.8); transition: opacity 1.5s ease;
  background-image:
    radial-gradient(circle at 19% 23%, #fff 0 1.1px, transparent 1.8px),
    radial-gradient(circle at 63% 71%, #fff 0 0.8px, transparent 1.5px),
    radial-gradient(circle at 83% 41%, rgba(255,255,255,0.9) 0 1.5px, rgba(255,255,255,0.2) 3px, transparent 5px);
  background-size: 97px 113px, 61px 79px, 229px 197px;
  background-position: 0 0, 29px 17px, 71px 43px;
  animation: sd-stars 120s linear infinite;
}
@keyframes sd-stars { to { background-position: 97px 0, 90px 17px, 300px 43px; } }
/* 해: 진행도만큼 지평선에서 떠올라 판 뒤로 후광을 비춤 */
html.theme-dawn #root::before {
  content: ''; position: fixed; left: 50%; bottom: 0; width: 300px; height: 300px; z-index: -1; pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(circle, #fff7dc 0 22%, #ffd889 34%, rgba(255,186,110,0.45) 50%, rgba(255,160,100,0.12) 62%, transparent 70%);
  transform: translate(-50%, calc(110% - var(--sd-p) * 230%));
  opacity: calc(0.35 + var(--sd-p) * 0.65);
  transition: transform 1.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.6s ease;
}
/* 구름: 천천히 옆으로 흘러감, 날이 밝을수록 진해짐 */
html.theme-dawn body::after {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  opacity: calc(0.25 + var(--sd-p) * 0.45); transition: opacity 1.5s ease;
  background-image:
    radial-gradient(ellipse 120px 26px at 50% 50%, rgba(255,236,226,0.9), transparent 70%),
    radial-gradient(ellipse 80px 18px at 50% 50%, rgba(255,226,214,0.8), transparent 70%),
    radial-gradient(ellipse 160px 30px at 50% 50%, rgba(255,240,232,0.7), transparent 70%);
  background-size: 520px 100%, 380px 100%, 700px 100%;
  background-repeat: repeat-x;
  background-position: 0 14%, 140px 30%, 260px 88%;
  animation: sd-clouds 140s linear infinite;
}
@keyframes sd-clouds { to { background-position: 520px 14%, 520px 30%, 960px 88%; } }
html.theme-dawn .header-value { color: color-mix(in srgb, #4a2f3a calc(min(max(var(--sd-p) - 0.55, 0) * 400%, 100%)), #fbe3cf); }
/* 숫자패드·도구는 해가 뒤로 지나가도 읽히도록 반투명 패널 위에 */
html.theme-dawn .game-controls { background: rgba(255,248,240,0.72); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border-radius: 18px; padding: 0.35rem 0.6rem; box-shadow: 0 6px 18px rgba(15,21,48,0.18); }
html.theme-dawn .number-btn, html.theme-dawn .icon-btn { color: #6b3f2a; }
html.theme-dawn .number-btn:disabled, html.theme-dawn .icon-btn:disabled { color: #d9bfae; }
html.theme-dawn .sudoku-board { box-shadow: 0 10px 30px rgba(15,21,48,0.35); }
html.theme-dawn .sudoku-cell:is(.animate-sweep-row, .animate-sweep-col, .animate-sweep-sector) { animation: sd-dawn-glow 1.2s ease-out both; animation-delay: var(--flash-delay, 0s); }
@keyframes sd-dawn-glow { 0% { box-shadow: inset 0 0 0 0 rgba(255,190,120,0); } 35% { box-shadow: inset 0 0 0 40px rgba(255,190,120,0.45); } 100% { box-shadow: inset 0 0 0 40px rgba(255,190,120,0); } }
/* 클리어 연출: 해가 완전히 떠올라 커지고, 햇살이 퍼지고, 판 위로 따뜻한 빛이 대각선으로 번진다 */
html.theme-dawn.sd-clear #root::before {
  /* 화면 한가운데(판 바로 뒤)로 올라와 크게 퍼져서, 판 가장자리 밖으로 후광이 넘쳐 보이게 */
  transform: translate(-50%, calc(50% - 50vh)) scale(2.6);
  opacity: 1;
  transition: transform 1.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 1s ease;
}
html.theme-dawn.sd-clear .sudoku-container::before {
  content: ''; position: fixed; inset: -60%; z-index: -1; pointer-events: none;
  background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,150,70,0.34) 0 4deg, transparent 4deg 13deg);
  -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0 22%, transparent 48%);
  mask-image: radial-gradient(circle at 50% 50%, #000 0 22%, transparent 48%);
  animation: sd-rays-in 1.4s ease both, sd-rays-spin 40s linear infinite;
}
@keyframes sd-rays-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes sd-rays-spin { to { transform: rotate(360deg); } }
html.theme-dawn.sd-clear .sudoku-cell {
  animation: sd-dawn-wash 1s ease both !important;
  animation-delay: calc((var(--row) + var(--col)) * 0.05s + 0.4s) !important;
}
html.theme-dawn.sd-clear .sudoku-board { box-shadow: 0 0 0 3px rgba(255,214,140,0.9), 0 0 50px 14px rgba(255,170,90,0.55); transition: box-shadow 1.2s ease; }
@keyframes sd-dawn-wash { 0% { background-color: var(--cell-bg); } 50% { background-color: #ffd9a8; } 100% { background-color: #fff2df; } }`,
    },
};

const OLD16 = [['blossom', '#c2185b'], ['ocean', '#00bcd4'], ['mocha', '#d7ccc8'], ['dusk', '#ff6b35'], ['mintchoco', '#4e342e']];
const PATCHES = `
/* ───────── 공통 보정 (기존 테마 포함) ───────── */

/* 틀린 숫자: 글자색만으로는 붉은 계열 테마(벚꽃·황혼 등)에서 정답과 구분이 안 돼서 칸에 옅은 붉은 바탕을 깐다 */
.sudoku-board .sudoku-cell.user.error:not(.selected) { background-color: color-mix(in srgb, var(--error-color) 18%, var(--cell-bg, #fff)); }

/* 16×16 판: 예전 테마 5종이 9×9용 3칸 굵은 선을 그대로 그리던 문제 */
${OLD16.map(([id, c]) => `html.theme-${id} .sudoku-board-16 .sudoku-cell:nth-child(3n):not(:nth-child(9n)),
html.theme-${id} .sudoku-board-16 .sudoku-cell:nth-child(9n) { border-right-width: 1px; }
html.theme-${id} .sudoku-board-16 .sudoku-cell:nth-child(n+19):nth-child(-n+27),
html.theme-${id} .sudoku-board-16 .sudoku-cell:nth-child(n+46):nth-child(-n+54) { border-bottom-width: 1px; }
html.theme-${id} .sudoku-board-16 .sudoku-cell:nth-child(4n):not(:nth-child(16n)) { border-right: 3px solid ${c}; }
html.theme-${id} .sudoku-board-16 .sudoku-cell:nth-child(n+49):nth-child(-n+64),
html.theme-${id} .sudoku-board-16 .sudoku-cell:nth-child(n+113):nth-child(-n+128),
html.theme-${id} .sudoku-board-16 .sudoku-cell:nth-child(n+177):nth-child(-n+192) { border-bottom: 3px solid ${c}; }`).join('\n')}

/* 수채화: 이름값 — 배경에 물감이 번진 얼룩(정적) + 판에 은은한 번짐 */
html.theme-watercolor body, html.theme-watercolor #root {
  background-color: #f3f5ff;
  background-image:
    radial-gradient(ellipse 60% 40% at 12% 18%, rgba(165,180,252,0.45), transparent 70%),
    radial-gradient(ellipse 50% 35% at 88% 30%, rgba(249,168,212,0.35), transparent 70%),
    radial-gradient(ellipse 55% 40% at 20% 85%, rgba(153,246,228,0.35), transparent 70%),
    radial-gradient(ellipse 45% 30% at 85% 88%, rgba(196,181,253,0.4), transparent 70%);
  background-attachment: fixed;
}
html.theme-watercolor .sudoku-board { box-shadow: 0 0 0 6px rgba(165,180,252,0.18), 0 0 30px 8px rgba(196,181,253,0.25); }

/* 한지: 종이 테마와 구분되도록 닥나무 섬유결(정적, 아주 옅게) */
html.theme-hanji body, html.theme-hanji #root {
  background-color: #e8dcc2;
  background-image:
    repeating-linear-gradient(23deg, rgba(120,90,50,0.05) 0 1px, transparent 1px 9px),
    repeating-linear-gradient(-61deg, rgba(120,90,50,0.04) 0 1px, transparent 1px 13px),
    repeating-linear-gradient(97deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 17px);
}
html.theme-hanji .sudoku-cell {
  background-image:
    repeating-linear-gradient(29deg, rgba(120,90,50,0.035) 0 1px, transparent 1px 11px),
    repeating-linear-gradient(-53deg, rgba(120,90,50,0.03) 0 1px, transparent 1px 15px);
}
html.theme-hanji .sudoku-board { box-shadow: 0 0 0 4px #e8dcc2, 0 0 0 5px rgba(44,24,16,0.35); }
`;

const block = (id, p) => {
    const T = `html.theme-${id}`;
    const pt = p.primaryText ?? '#ffffff';
    return `
/* ===== ${id.toUpperCase()} THEME ===== */
${T} {
  --bg-primary: ${p.bg}; --bg-secondary: ${p.bg2};
  --brand-primary: ${p.brand}; --brand-secondary: ${p.brand2};
  --text-main: ${p.text}; --text-muted: ${p.muted};
  --cell-bg: ${p.cell}; --cell-highlight: ${p.cellHi};
  --cell-selected: ${p.cellSel}; --cell-same-num: ${p.cellSame};
  --error-color: ${p.error}; --accent-blue: ${p.brand};
}
${T} body, ${T} #root { background-color: ${p.bg}; }
${T} .game-nav { background: ${p.nav}; box-shadow: 0 4px 0 ${p.navShadow}; }
${T} .nav-icon-btn { color: ${p.navIcon}; background: rgba(255,255,255,0.10); }
${T} .nav-icon-btn:hover { background: rgba(255,255,255,0.18); }
${T} .sudoku-board { border-color: ${p.board}; background: ${p.thin}; }
${T} .sudoku-cell { border-right-color: ${p.thin}; border-bottom-color: ${p.thin}; }
${T} .sudoku-cell.initial { color: ${p.initial}; font-weight: 600; }
${T} .sudoku-cell.user { color: ${p.user}; }
${T} .sudoku-cell.user.error { color: ${p.error}; }
${T} .sudoku-cell:nth-child(3n):not(:nth-child(9n)) { border-right: 2px solid ${p.board}; }
${T} .sudoku-cell:nth-child(n+19):nth-child(-n+27),
${T} .sudoku-cell:nth-child(n+46):nth-child(-n+54) { border-bottom: 2px solid ${p.board}; }
${T} .sudoku-board-6 .sudoku-cell:nth-child(9n),
${T} .sudoku-board-6 .sudoku-cell:nth-child(n+73) { border-color: ${p.thin}; }
${T} .sudoku-board-16 .sudoku-cell:nth-child(3n):not(:nth-child(9n)),
${T} .sudoku-board-16 .sudoku-cell:nth-child(9n) { border-right-width: 1px; }
${T} .sudoku-board-16 .sudoku-cell:nth-child(n+19):nth-child(-n+27),
${T} .sudoku-board-16 .sudoku-cell:nth-child(n+46):nth-child(-n+54) { border-bottom-width: 1px; }
${T} .sudoku-board-16 .sudoku-cell:nth-child(4n):not(:nth-child(16n)) { border-right: 3px solid ${p.board}; }
${T} .sudoku-board-16 .sudoku-cell:nth-child(n+49):nth-child(-n+64),
${T} .sudoku-board-16 .sudoku-cell:nth-child(n+113):nth-child(-n+128),
${T} .sudoku-board-16 .sudoku-cell:nth-child(n+177):nth-child(-n+192) { border-bottom: 3px solid ${p.board}; }
${T} .number-btn { color: ${p.num}; }
${T} .number-btn:disabled { color: ${p.numDis}; }
${T} .note-item { color: ${p.note}; }
${T} .icon-btn { color: ${p.num}; }
${T} .icon-btn:disabled { color: ${p.numDis}; }
${T} .icon-badge { background: ${p.brand}; border-color: ${p.bg}; color: ${pt}; }
${T} .note-toggle-badge { background: ${p.bg2}; color: ${p.num}; }
${T} .note-toggle-badge.on { background: ${p.brand}; color: ${pt}; }
${T} .pause-btn { background: ${p.bg2}; color: ${p.num}; }
${T} .header-value { color: ${p.num}; }
${T} .level-badge { background: ${p.brand}; color: ${pt}; }
${T} .modal-content { background: ${p.modal}; }
${T} .modal-header { border-bottom-color: rgba(255,255,255,0.15); }
${T} .modal-header h2 { color: #ffffff; }
${T} .modal-body { background: ${p.modalBody}; color: ${p.modalText}; }
${T} .modal-home-btn { background: rgba(255,255,255,0.15); color: #ffffff; }
${T} .primary-btn { background: ${p.primary}; color: ${pt}; }
${T} .hint-modal-card { background: ${p.modal}; }
${T} .hint-modal-coin-row { background: rgba(0,0,0,0.2); color: #ffffff; }
${T} .hint-modal-title { color: #ffffff; }
${T} .hint-modal-desc { color: rgba(255,255,255,0.7); }
${T} .hint-modal-coin-value { color: #ffffff; }
${T} .hint-modal-btn-cancel { background: rgba(255,255,255,0.15); color: #ffffff; }
${T} .coin-badge { background: ${p.brand}; color: ${pt}; border-color: ${p.bg}; }
${T} .mistake-icon { color: ${p.error}; }
${T} .mistake-icon.used { color: ${p.numDis}; }${p.extra ?? ''}
`;
};

const out = `/* 자동 생성 — scripts/gen-sudoku-themes-css.mjs 를 고치고 다시 실행할 것 */
${Object.entries(THEMES).map(([id, p]) => block(id, p)).join('')}
${PATCHES}
@media (prefers-reduced-motion: reduce) {
  html.theme-aquarium body::before, html.theme-winter body::before,
  html.theme-gold body::before, html.theme-gold body::after, html.theme-gold .sudoku-board,
  html.theme-dawn body::before, html.theme-dawn body::after { animation: none; }
  html.theme-dawn #root::before { transition: none; }
  html.theme-gold.sd-clear .sudoku-cell, html.theme-gold.sd-clear .sudoku-board,
  html.theme-dawn.sd-clear .sudoku-cell, html.theme-dawn.sd-clear .sudoku-container::before { animation: none !important; }
  html.theme-gold .sudoku-cell::after, html.theme-dawn .sudoku-cell { animation: none !important; }
}
`;
writeFileSync('src/features/sudoku/styles/themes-extra.css', out);
console.log('wrote', Object.keys(THEMES).length, 'themes');
