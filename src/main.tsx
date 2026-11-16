import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// i18n 을 가장 먼저 초기화한다(다른 모듈이 import 시점에 i18n.t 를 써도 되도록).
import { routerBasename } from './i18n'
import App from './App.tsx'
import './index.css'

console.log('[PuzzleGarden] build: 2026-03-14-v2');

// Google H5 게임 광고 API 타입 선언
declare global {
    interface Window {
        adBreak?: (o: object) => void;
        adConfig?: (o: object) => void;
        adsbygoogle?: unknown[];
    }
}
window.adConfig?.({ preloadAdBreaks: 'on' });
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
