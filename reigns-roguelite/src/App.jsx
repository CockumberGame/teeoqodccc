/**
 * App - Главный компонент приложения
 * Gloryhole Quest - использует GameContext для управления состоянием
 */

import React, { useEffect } from 'react';
import { useGame } from './context/GameContext.jsx';
import NameInputScreen from './ui/NameInputScreen.jsx';
import HubScreen from './ui/HubScreen.jsx';
import GameScreen from './ui/GameScreen.jsx';
import NightSummaryOverlay from './ui/NightSummaryOverlay.jsx';

function App() {
  const { state, engine, startNight, clearError } = useGame();
  const { phase, game, action, hub, summary, error } = state;

  // Авто-сохранение каждые 30 секунд
  useEffect(() => {
    const saveInterval = setInterval(() => {
      engine.saveGame();
    }, 30000);

    return () => clearInterval(saveInterval);
  }, [engine]);

  // Обработчик загрузки сохранения (F5)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        const result = engine.loadGame();
        if (result.success) {
          alert('✅ Игра загружена!');
        } else {
          alert(`❌ Не удалось загрузить: ${result.reason}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  // Рендеринг в зависимости от фазы
  const renderScreen = () => {
    // Показываем ошибку если есть
    if (error) {
      return (
        <div className="error-screen">
          <h2>❌ Ошибка</h2>
          <p>{error}</p>
          <button onClick={clearError}>Закрыть</button>
        </div>
      );
    }

    switch (phase) {
      case 'menu':
      case 'nameInput':
        return <NameInputScreen />;

      case 'hub':
        return (
          <HubScreen
            hubState={hub}
            onStartNight={startNight}
          />
        );

      case 'playing':
      case 'climax':
        return (
          <GameScreen
            gameState={game}
            actionState={action}
            phase={phase}
          />
        );

      case 'nightSummary':
        return <NightSummaryOverlay onClose={() => engine.closeNightSummary()} />;

      case 'gameOver':
        return (
          <div className="game-over-screen">
            <h2>💀 Игра окончена</h2>
            <p>Вы провели {game?.day || 0} ночей</p>
          </div>
        );

      default:
        return <NameInputScreen />;
    }
  };

  return (
    <div className="game-container">
      {renderScreen()}
    </div>
  );
}

export default App;
