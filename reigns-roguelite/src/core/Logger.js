/**
 * Logger - Централизованная система логирования
 * Gloryhole Quest - замена console.log с уровнями и фильтрами
 *
 * Использование:
 * - Logger.debug('сообщение') — отладка (только в dev)
 * - Logger.info('сообщение') — информация
 * - Logger.warn('сообщение') — предупреждение
 * - Logger.error('сообщение') — ошибка
 * - Logger.log('сообщение') — общее
 */

class Logger {
  constructor() {
    // Уровни логирования
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    // Текущий уровень (в production можно поставить this.levels.warn)
    this.currentLevel = this.levels.debug;

    // Префиксы для разных модулей
    this.prefixes = {
      game: '[Game]',
      engine: '[Engine]',
      session: '[Session]',
      ui: '[UI]',
      balance: '[Balance]',
      event: '[Event]'
    };

    // Флаг production режима
    this.isProduction = false;
  }

  /**
   * Установить уровень логирования
   * @param {string} level - 'debug', 'info', 'warn', 'error'
   */
  setLevel(level) {
    this.currentLevel = this.levels[level] || this.levels.debug;
  }

  /**
   * Включить production режим (только warn/error)
   */
  enableProduction() {
    this.isProduction = true;
    this.setLevel('warn');
  }

  /**
   * Включить debug режим (все логи)
   */
  enableDebug() {
    this.isProduction = false;
    this.setLevel('debug');
  }

  /**
   * Проверить можно ли логировать на данном уровне
   * @param {string} level - Уровень для проверки
   * @returns {boolean} Можно ли логировать
   */
  _shouldLog(level) {
    if (this.isProduction && level === 'debug') {
      return false;
    }
    return this.levels[level] >= this.currentLevel;
  }

  /**
   * Внутренний метод для форматирования сообщения
   * @param {string} level - Уровень
   * @param {string} prefix - Префикс модуля
   * @param {any[]} args - Аргументы
   */
  _formatMessage(level, prefix, args) {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    const levelTag = `[${level.toUpperCase()}]`;
    return `[${timestamp}] ${levelTag} ${prefix || ''} ${args.join(' ')}`;
  }

  /**
   * Debug сообщение (отладка)
   * @param  {...any} args - Аргументы
   */
  debug(...args) {
    if (!this._shouldLog('debug')) return;
    console.log(this._formatMessage('debug', '', args));
  }

  /**
   * Debug сообщение с префиксом модуля
   * @param {string} moduleKey - Ключ модуля из this.prefixes
   * @param  {...any} args - Аргументы
   */
  debugModule(moduleKey, ...args) {
    if (!this._shouldLog('debug')) return;
    const prefix = this.prefixes[moduleKey] || '';
    console.log(this._formatMessage('debug', prefix, args));
  }

  /**
   * Info сообщение (информация)
   * @param  {...any} args - Аргументы
   */
  info(...args) {
    if (!this._shouldLog('info')) return;
    console.log(this._formatMessage('info', '', args));
  }

  /**
   * Info сообщение с префиксом модуля
   * @param {string} moduleKey - Ключ модуля из this.prefixes
   * @param  {...any} args - Аргументы
   */
  infoModule(moduleKey, ...args) {
    if (!this._shouldLog('info')) return;
    const prefix = this.prefixes[moduleKey] || '';
    console.log(this._formatMessage('info', prefix, args));
  }

  /**
   * Warn сообщение (предупреждение)
   * @param  {...any} args - Аргументы
   */
  warn(...args) {
    if (!this._shouldLog('warn')) return;
    console.warn(this._formatMessage('warn', '', args));
  }

  /**
   * Warn сообщение с префиксом модуля
   * @param {string} moduleKey - Ключ модуля из this.prefixes
   * @param  {...any} args - Аргументы
   */
  warnModule(moduleKey, ...args) {
    if (!this._shouldLog('warn')) return;
    const prefix = this.prefixes[moduleKey] || '';
    console.warn(this._formatMessage('warn', prefix, args));
  }

  /**
   * Error сообщение (ошибка)
   * @param  {...any} args - Аргументы
   */
  error(...args) {
    if (!this._shouldLog('error')) return;
    console.error(this._formatMessage('error', '', args));
  }

  /**
   * Error сообщение с префиксом модуля
   * @param {string} moduleKey - Ключ модуля из this.prefixes
   * @param  {...any} args - Аргументы
   */
  errorModule(moduleKey, ...args) {
    if (!this._shouldLog('error')) return;
    const prefix = this.prefixes[moduleKey] || '';
    console.error(this._formatMessage('error', prefix, args));
  }

  /**
   * Log сообщение (общее, всегда показывается)
   * @param  {...any} args - Аргументы
   */
  log(...args) {
    console.log(...args);
  }

  /**
   * Логировать начало игровой сессии
   * @param {Object} data - Данные сессии
   */
  logSessionStart(data) {
    this.infoModule('game', `Начало сессии: день ${data.day}, стамины ${data.stamina}`);
  }

  /**
   * Логировать встречу с клиентом
   * @param {Object} client - Данные клиента
   */
  logClientEncounter(client) {
    this.debugModule('session', `Клиент: ${client.type?.name}, размер ${client.sizeCm}см`);
  }

  /**
   * Логировать действие игрока
   * @param {Object} action - Данные действия
   * @param {Object} result - Результат
   */
  logAction(action, result) {
    this.debugModule('session', `Действие: ${action.name}, успех: ${result.success}, arousal: ${result.arousalGain}`);
  }

  /**
   * Логировать событие
   * @param {string} eventId - ID события
   */
  logEvent(eventId) {
    this.infoModule('event', `Событие: ${eventId}`);
  }

  /**
   * Логировать изменение стата
   * @param {string} statName - Имя стата
   * @param {number} change - Изменение
   * @param {number} newValue - Новое значение
   */
  logStatChange(statName, change, newValue) {
    this.debugModule('game', `${statName}: ${change > 0 ? '+' : ''}${change} → ${newValue}`);
  }
}

// Экспортируем singleton
const logger = new Logger();
export default logger;
