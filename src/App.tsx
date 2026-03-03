import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './common/components/LandingPage';
import SudokuModeSelect from './features/sudoku/components/SudokuModeSelect';
import SudokuGame from './features/sudoku/components/SudokuGame';
import DifficultySelect from './features/sudoku/components/DifficultySelect';
import { GameProvider as SudokuProvider } from './features/sudoku/context/SudokuContext';
import WordSortGame from './features/word-sort/components/WordSortGame';
import { WordSortProvider } from './features/word-sort/context/WordSortContext';
import './index.css';

import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInAnonymously } from './firebase';

const App: React.FC = () => {
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
    <div className="app-container">
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
              </Routes>
            </SudokuProvider>
          }
        />
        <Route
          path="/word-sort"
          element={
            <WordSortProvider>
              <WordSortGame />
            </WordSortProvider>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
