import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import LandingPage from './common/components/LandingPage';
import SudokuModeSelect from './features/sudoku/components/SudokuModeSelect';
import SudokuGame from './features/sudoku/components/SudokuGame';
import DifficultySelect from './features/sudoku/components/DifficultySelect';
import { GameProvider as SudokuProvider } from './features/sudoku/context/SudokuContext';
import WordSortGame from './features/word-sort/components/WordSortGame';
import WordSortModeSelect from './features/word-sort/components/WordSortModeSelect';
import TileMatchGame from './features/tile-match/components/TileMatchGame';
import SnapSpotGame from './features/snapspot/components/SnapSpotGame';
// import AdminPage from './features/admin/AdminPage';
import { WordSortProvider } from './features/word-sort/context/WordSortContext';
import { CardBackProvider } from './features/word-sort/context/CardBackContext';
import { CoinProvider } from './context/CoinContext';
import { SudokuProgressProvider } from './context/SudokuProgressContext';
import { WordSortProgressProvider } from './context/WordSortProgressContext';
import { ChallengeProvider } from './context/ChallengeContext';
import { UserInitProvider, useUserInit } from './context/UserInitContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInAnonymously } from './firebase';
import './index.css';

const AppContent: React.FC = () => {
  const { isInitialized } = useUserInit();

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '1.5rem',
        color: '#666'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #4a90e2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontWeight: 600 }}>데이터 초기화 중...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <CoinProvider>
      <ChallengeProvider>
      <SudokuProgressProvider>
      <WordSortProgressProvider>
      <CardBackProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/sudoku/*"
            element={
              <SudokuProvider>
                <Routes>
                  <Route index element={<SudokuModeSelect />} />
                  <Route path="time-attack" element={<DifficultySelect />} />
                  <Route path="time-attack/play" element={<SudokuGame />} />
                  <Route path="stage" element={<SudokuGame />} />
                  <Route path="beginner" element={<SudokuGame />} />
                </Routes>
              </SudokuProvider>
            }
          />
          <Route
            path="/word-sort/*"
            element={
              <WordSortProvider>
                <Routes>
                  <Route index element={<WordSortModeSelect />} />
                  <Route path="play" element={<WordSortGame />} />
                </Routes>
              </WordSortProvider>
            }
          />
          <Route path="/tile-match" element={<TileMatchGame />} />
          <Route path="/snapspot" element={<SnapSpotGame />} />
          {window.location.hostname === 'localhost' && (
            <Route path="/admin" element={<AdminPage />} />
          )}
        </Routes>
      </CardBackProvider>
      </WordSortProgressProvider>
      </SudokuProgressProvider>
      </ChallengeProvider>
    </CoinProvider>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const ua = navigator.userAgent;
    const isKakao = /KAKAOTALK/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    if (isKakao && isAndroid) {
      const url = window.location.href.replace(/^https?:\/\//, '');
      window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // 로그인 상태가 없을 때만 익명 로그인
        signInAnonymously(auth).catch((error) => {
          console.error('Firebase Auth Error:', error.code, error.message);
        });
      }
    });
    return unsubscribe;
  }, []);

  return (
    <HelmetProvider>
      <div className="app-container">
        <UserInitProvider>
          <AppContent />
        </UserInitProvider>
      </div>
    </HelmetProvider>
  );
};

export default App;
