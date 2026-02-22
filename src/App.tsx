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

import { auth, signInAnonymously } from './firebase';

const App: React.FC = () => {
  useEffect(() => {
    signInAnonymously(auth)
      .then((userCredential) => {
        // Signed in..
        const user = userCredential.user;
        console.log('Firebase User ID:', user.uid);
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Firebase Auth Error:', errorCode, errorMessage);
      });
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
