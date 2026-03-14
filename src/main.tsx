import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
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
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
