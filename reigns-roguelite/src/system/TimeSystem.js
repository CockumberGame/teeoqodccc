/**
 * TimeSystem - Отслеживание игрового времени
 * Сессия: с 22:00 до 6:00 (8 игровых часов)
 */

class TimeSystem {
  constructor() {
    this.sessionStart = 22; // 22:00
    this.sessionEnd = 4;    // 4:00 (6 часов = 24 хода по 15 минут)
    this.currentTime = 22;
    this.minutes = 0;
    this.currentTurn = 0;  // Добавлено: счётчик ходов
    this.turnDuration = 15; // минут на ход
    this.isNightSession = false;
  }

  /**
   * Начать новую ночную сессию
   */
  startSession() {
    this.currentTime = this.sessionStart;
    this.minutes = 0;
    this.currentTurn = 0;  // Сброс ходов
    this.isNightSession = true;
    return this.getTimeString();
  }

  /**
   * Продвинуть время на один ход
   */
  advanceTurn(minutes = null) {
    if (!this.isNightSession) return false;

    const duration = minutes || this.turnDuration;
    this.minutes += duration;
    this.currentTurn++;  // Увеличиваем счётчик ходов

    // Проверка на переполнение часов
    while (this.minutes >= 60) {
      this.minutes -= 60;
      this.currentTime += 1;

      // Переход через полночь
      if (this.currentTime >= 24) {
        this.currentTime = 0;
      }

      // Проверка окончания сессии (6:00)
      if (this.currentTime >= this.sessionEnd && this.currentTime < 12) {
        this.isNightSession = false;
        return true; // Сессия окончена
      }
    }

    return false; // Сессия продолжается
  }

  /**
   * Получить текущее время строкой
   */
  getTimeString() {
    const hours = String(this.currentTime).padStart(2, '0');
    const mins = String(this.minutes).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  /**
   * Получить оставшееся время сессии в минутах
   */
  getRemainingMinutes() {
    if (!this.isNightSession) return 0;

    const currentTotal = this.currentTime * 60 + this.minutes;
    const endTotal = this.sessionEnd * 60; // 6:00 = 360 минут

    // Учитываем переход через полночь
    if (this.currentTime >= this.sessionStart) {
      return (24 * 60 - currentTotal) + endTotal;
    }

    return endTotal - currentTotal;
  }

  /**
   * Получить оставшееся время в ходах
   */
  getRemainingTurns() {
    return Math.floor(this.getRemainingMinutes() / this.turnDuration);
  }

  /**
   * Проверить, активна ли сессия
   */
  isSessionActive() {
    return this.isNightSession;
  }

  /**
   * Сбросить систему
   */
  reset() {
    this.currentTime = 22;
    this.minutes = 0;
    this.isNightSession = false;
  }

  /**
   * Сериализация для сохранения
   */
  serialize() {
    return {
      currentTime: this.currentTime,
      minutes: this.minutes,
      isNightSession: this.isNightSession,
      turnDuration: this.turnDuration
    };
  }

  /**
   * Десериализация из сохранения
   */
  deserialize(data) {
    this.currentTime = data.currentTime || 22;
    this.minutes = data.minutes || 0;
    this.isNightSession = data.isNightSession || false;
    this.turnDuration = data.turnDuration || 30;
  }
}

export default TimeSystem;
