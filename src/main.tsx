import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

console.log('[PuzzleGarden] build: 2026-03-14-v2');

// Google Ad Placement API 초기화
declare global {
    interface Window {
        googletag: { cmd: Array<() => void>; adBreak?: (o: object) => void; adConfig?: (o: object) => void };
    }
}
window.googletag = window.googletag || { cmd: [] };
window.googletag.cmd.push(() => {
    window.googletag.adConfig?.({ preloadAdBreaks: 'on' });
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
