/**
 * NameInputScreen - Экран ввода имени героини
 * Gloryhole Quest - первый экран при запуске игры
 * Стиль: неоновый, соблазнительный, с анимациями
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

function NameInputScreen() {
  const { engine, state, dispatch } = useGame();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setError('Введи имя, красотка!');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (trimmedName.length > 20) {
      setError('Имя слишком длинное (макс. 20 символов)');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setError('');
    engine.initPlayer(trimmedName);
    
    // Обновляем состояние контекста после инициализации
    dispatch({
      type: 'INIT',
      payload: {
        phase: 'hub',
        game: engine.getGameState(),
        hub: engine.getHubState()
      }
    });
  };

  const handleRandomName = () => {
    const randomNames = [
      'Скарлетт',
      'Рокси',
      'Велвет',
      'Кэнди',
      'Шугар',
      'Черри',
      'Джинджер',
      'Хани',
      'Трикси',
      'Лулу'
    ];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    setName(randomName);
    setError('');
  };

  return (
    <div className="name-input-screen">
      {/* Декоративные неоновые элементы */}
      <div className="neon-decoration">
        <div className="neon-circle"></div>
        <div className="neon-line"></div>
      </div>

      {/* Заголовок */}
      <div className="name-input-header">
        <div className="title-emoji">🍩</div>
        <h1 className="game-title glow-animation">Gloryhole Quest</h1>
        <p className="game-subtitle">Ночная работа мечты</p>
      </div>

      {/* Иллюстрация/иконка */}
      <div className="name-input-icon">
        <div className="hero-avatar pulse-animation">
          <span className="hero-icon">💃</span>
        </div>
        <div className="avatar-glow"></div>
      </div>

      {/* Форма ввода имени */}
      <form onSubmit={handleSubmit} className={`name-input-form ${isShaking ? 'shake' : ''}`}>
        <label htmlFor="heroine-name" className="name-label">
          ✨ Как зовут нашу героиню?
        </label>

        <div className="input-wrapper">
          <input
            id="heroine-name"
            type="text"
            className="name-input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Введи имя..."
            maxLength={20}
            autoFocus
          />
          <div className="input-border"></div>
        </div>

        {error && (
          <p className="error-message">⚠️ {error}</p>
        )}

        {/* Кнопки */}
        <div className="name-input-buttons">
          <button
            type="button"
            className="random-name-button pulse-animation"
            onClick={handleRandomName}
          >
            <span className="button-icon">🎲</span>
            <span className="button-text">Случайное имя</span>
          </button>

          <button
            type="submit"
            className="start-game-button glow-animation"
          >
            <span className="button-icon">🌙</span>
            <span className="button-text">Начать игру</span>
          </button>
        </div>
      </form>

      {/* Подсказка */}
      <div className="name-input-hint">
        <p>💡 Выбери имя для своей героини и начни ночное приключение!</p>
      </div>

      {/* Декоративные элементы */}
      <div className="decorative-elements">
        <span className="deco-icon float-icon-1">✨</span>
        <span className="deco-icon float-icon-2">🌟</span>
        <span className="deco-icon float-icon-3">💫</span>
      </div>

      {/* Стили для этого компонента */}
      <style>{`
        .name-input-screen {
          position: relative;
          justify-content: center;
          align-items: center;
          padding: 30px 20px;
        }

        /* Неоновый декор */
        .neon-decoration {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .neon-circle {
          position: absolute;
          width: 300px;
          height: 300px;
          border: 2px solid rgba(233, 69, 96, 0.3);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 30px rgba(233, 69, 96, 0.2);
        }

        .neon-line {
          position: absolute;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(233, 69, 96, 0.5), transparent);
          top: 50%;
          animation: scanline 3s ease-in-out infinite;
        }

        @keyframes scanline {
          0%, 100% { transform: translateY(-100px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100px); opacity: 0; }
        }

        /* Заголовок */
        .name-input-header {
          text-align: center;
          margin-bottom: 30px;
          z-index: 1;
        }

        .title-emoji {
          font-size: 48px;
          margin-bottom: 10px;
          filter: drop-shadow(0 0 10px rgba(233, 69, 96, 0.8));
        }

        /* Аватар */
        .name-input-icon {
          position: relative;
          margin-bottom: 30px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .hero-avatar {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #e94560 0%, #0f3460 100%);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 3px solid rgba(233, 69, 96, 0.5);
          z-index: 2;
        }

        .hero-icon {
          font-size: 50px;
        }

        .avatar-glow {
          position: absolute;
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(233, 69, 96, 0.4) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        /* Форма */
        .name-input-form {
          width: 100%;
          max-width: 320px;
          z-index: 1;
        }

        .name-input-form.shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .name-label {
          display: block;
          font-size: 14px;
          color: #a0a0a0;
          margin-bottom: 15px;
          text-align: center;
        }

        .input-wrapper {
          position: relative;
          margin-bottom: 15px;
        }

        .name-input {
          width: 100%;
          padding: 15px 20px;
          font-size: 16px;
          font-family: inherit;
          color: #f0f0f0;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(233, 69, 96, 0.3);
          border-radius: 12px;
          outline: none;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .name-input:focus {
          border-color: #e94560;
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.4);
        }

        .name-input::placeholder {
          color: #666;
        }

        .input-border {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #e94560, transparent);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .name-input:focus + .input-border {
          transform: scaleX(1);
        }

        .error-message {
          color: #ff6b6b;
          font-size: 11px;
          text-align: center;
          margin-bottom: 15px;
          animation: error-pulse 0.5s ease-in-out;
        }

        @keyframes error-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Кнопки */
        .name-input-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .random-name-button,
        .start-game-button {
          padding: 15px 25px;
          font-size: 14px;
          font-family: inherit;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .random-name-button {
          background: rgba(255, 255, 255, 0.1);
          color: #f0f0f0;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .random-name-button:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          transform: translateY(-2px);
        }

        .start-game-button {
          background: linear-gradient(135deg, #e94560 0%, #c73659 100%);
          color: #fff;
          border: none;
          font-weight: bold;
        }

        .start-game-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(233, 69, 96, 0.5);
        }

        .button-icon {
          font-size: 18px;
        }

        .button-text {
          font-size: 14px;
        }

        /* Подсказка */
        .name-input-hint {
          margin-top: 25px;
          text-align: center;
          z-index: 1;
        }

        .name-input-hint p {
          font-size: 10px;
          color: #666;
          line-height: 1.6;
        }

        /* Декоративные иконки */
        .decorative-elements {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .deco-icon {
          position: absolute;
          font-size: 20px;
          opacity: 0.6;
          animation: float 3s ease-in-out infinite;
        }

        .float-icon-1 {
          top: 15%;
          left: 10%;
          animation-delay: 0s;
        }

        .float-icon-2 {
          top: 20%;
          right: 15%;
          animation-delay: 1s;
        }

        .float-icon-3 {
          bottom: 25%;
          left: 20%;
          animation-delay: 2s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

export default NameInputScreen;
