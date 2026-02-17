import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SudokuModeSelect from './components/SudokuModeSelect';
import SudokuGame from './components/SudokuGame';
import DifficultySelect from './components/DifficultySelect';
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
        <Route path="/sudoku" element={<SudokuModeSelect />} />
        <Route path="/sudoku/time-attack" element={<DifficultySelect />} />
        <Route path="/sudoku/time-attack/play" element={<SudokuGame />} />
        <Route path="/sudoku/stage" element={<SudokuGame />} />
      </Routes>
    </div>
  );
};

export default App;
