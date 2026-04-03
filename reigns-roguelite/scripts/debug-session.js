/**
 * Debug Session — запись игровой сессии в файл
 * Запускается вместе с игрой в браузере
 * 
 * Использование:
 * 1. Открыть консоль (F12)
 * 2. Вставить этот код
 * 3. Играть
 * 4. Скопировать лог из localStorage
 */

class GameSessionLogger {
  constructor() {
    this.logs = [];
    this.sessionId = Date.now();
    this.startTime = new Date().toISOString();
  }

  log(category, message, data = null) {
    const entry = {
      timestamp: Date.now(),
      time: new Date().toISOString(),
      category,
      message,
      data
    };
    this.logs.push(entry);
    this.save();
  }

  save() {
    const json = JSON.stringify({
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: new Date().toISOString(),
      logCount: this.logs.length,
      logs: this.logs
    }, null, 2);
    localStorage.setItem('game_session_log', json);
  }

  getExport() {
    return JSON.stringify({
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: new Date().toISOString(),
      logCount: this.logs.length,
      logs: this.logs
    }, null, 2);
  }

  clear() {
    this.logs = [];
    localStorage.removeItem('game_session_log');
  }
}

// === АВТОМАТИЧЕСКОЕ ЛОГИРОВАНИЕ ===

const logger = new GameSessionLogger();
logger.log('SYSTEM', '=== НОВАЯ СЕССИЯ ===');

// Перехват событий GameEngine (если доступен)
if (typeof window !== 'undefined') {
  window.__GAME_LOGGER__ = logger;
  
  // Логирование действий игрока
  const originalAddEventListener = document.addEventListener;
  document.addEventListener = function(type, handler, options) {
    if (type === 'click' && handler.name) {
      const originalHandler = handler;
      handler = function(e) {
        const target = e.target;
        const button = target.closest('button');
        if (button) {
          logger.log('CLICK', 'Клик по кнопке', {
            text: button.textContent?.trim().substring(0, 50),
            class: button.className
          });
        }
        return originalHandler.call(this, e);
      };
    }
    return originalAddEventListener.call(this, type, handler, options);
  };
}

console.log('🔍 Game Session Logger активирован!');
console.log('📋 Лог сохраняется в localStorage как "game_session_log"');
console.log('Для экспорта: window.__GAME_LOGGER__.getExport()');
