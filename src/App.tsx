import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SudokuGame from './components/SudokuGame';
import './index.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sudoku" element={<SudokuGame />} />
      </Routes>
    </div>
  );
};

export default App;
