import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SudokuModeSelect from './components/SudokuModeSelect';
import SudokuGame from './components/SudokuGame';
import DifficultySelect from './components/DifficultySelect';
import './index.css';

const App: React.FC = () => {
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
