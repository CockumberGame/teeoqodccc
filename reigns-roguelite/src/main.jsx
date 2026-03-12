import React from 'react'
import ReactDOM from 'react-dom/client'
import GameScreen from './ui/GameScreen.jsx'
import GameEngine from './engine/GameEngine.js'
import './styles/main.css'

// Initialize the game engine (singleton)
const gameEngine = new GameEngine();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GameScreen gameEngine={gameEngine} />
  </React.StrictMode>,
)
