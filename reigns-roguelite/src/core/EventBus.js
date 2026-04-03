/**
 * EventBus - Централизованная система событий
 * Gloryhole Quest - обмен данными между модулями
 *
 * Использование:
 * - eventBus.emit('eventName', data)
 * - eventBus.on('eventName', callback)
 * - eventBus.off('eventName', callback)
 */

class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Подписаться на событие
   * @param {string} event - Имя события
   * @param {Function} callback - Функция обратного вызова
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Отписаться от события
   * @param {string} event - Имя события
   * @param {Function} callback - Функция обратного вызова
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    
    const index = this.listeners[event].indexOf(callback);
    if (index !== -1) {
      this.listeners[event].splice(index, 1);
    }
    
    // Удаляем пустые массивы
    if (this.listeners[event].length === 0) {
      delete this.listeners[event];
    }
  }

  /**
   * Испустить событие
   * @param {string} event - Имя события
   * @param {any} data - Данные события
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    
    // Копируем массив чтобы избежать проблем при удалении подписчиков во время emit
    const callbacks = [...this.listeners[event]];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in event "${event}":`, error);
      }
    }
  }

  /**
   * Очистить все подписки
   */
  clear() {
    this.listeners = {};
  }

  /**
   * Очистить подписки на конкретное событие
   * @param {string} event - Имя события
   */
  clearEvent(event) {
    delete this.listeners[event];
  }

  /**
   * Получить количество подписчиков на событие
   * @param {string} event - Имя события
   * @returns {number} Количество подписчиков
   */
  getListenerCount(event) {
    return this.listeners[event]?.length || 0;
  }
}

export default EventBus;
