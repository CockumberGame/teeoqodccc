/**
 * TypewriterText — Эффект печатной машинки для текста
 * Используется только для описания клиента (не для механик!)
 * 
 * Пропсы:
 * - text: текст для отображения
 * - speed: скорость печати (мс на символ)
 * - startDelay: задержка перед началом (мс)
 */

import React, { useState, useEffect } from 'react';

function TypewriterText({ text = '', speed = 30, startDelay = 200 }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Сброс при изменении текста
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);

    // Задержка перед началом
    const startTimeout = setTimeout(() => {
      if (!text || text.length === 0) {
        setIsComplete(true);
        return;
      }

      // Печатная машинка
      const typeInterval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= text.length) {
            clearInterval(typeInterval);
            setIsComplete(true);
            return prev;
          }

          setDisplayedText(text.slice(0, prev + 1));
          return prev + 1;
        });
      }, speed);

      return () => clearInterval(typeInterval);
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, startDelay]);

  return (
    <span className="typewriter-text">
      {displayedText}
      {!isComplete && (
        <span className="typewriter-cursor">|</span>
      )}
    </span>
  );
}

export default TypewriterText;
