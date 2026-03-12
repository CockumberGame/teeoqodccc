import React, { useState, useEffect } from 'react';
import GameEngine from './engine/GameEngine.js';
import GameScreen from './ui/GameScreen.jsx';
import './styles/main.css';

// Initialize game engine (singleton)
const gameEngine = new GameEngine();

function App() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize player on mount
    gameEngine.initPlayer();
    setInitialized(true);
  }, []);

  if (!initialized) {
    return (
      <div className="loading-screen">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="app">
      <GameScreen gameEngine={gameEngine} />
    </div>
  );
}

export default App;
