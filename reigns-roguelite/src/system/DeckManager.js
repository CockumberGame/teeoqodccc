/**
 * DeckManager - Управление очередью клиентов
 * Gloryhole Quest - генерация очереди на ночь
 *
 * Формула количества клиентов:
 * total = baseClients (3) + floor(reputation / 20) + random(0-1)
 *
 * УДАЛЕНО:
 * - this.nightDeck
 * - this.discardedCards
 *
 * ОСТАВЛЕНО:
 * - this.clientQueue — массив объектов клиентов
 */

import Logger from '../core/Logger.js';

class DeckManager {
  constructor() {
    // Очередь клиентов на ночь
    this.clientQueue = [];
    this.currentClientIndex = 0;

    // Константы из баланса
    this.baseClients = 3;
    this.reputationDivisor = 20;
    this.randomBonusMax = 1;
  }

  /**
   * Сгенерировать очередь клиентов на ночь
   * Формула: clientsTonight = 3 + floor(reputation/20) + random(0-1)
   *
   * @param {number} reputation - Текущая репутация игрока
   * @param {number} luck - Множитель удачи (1.0 по умолчанию)
   * @param {Object} clientGenerator - Экземпляр ClientGenerator
   * @param {Object} patienceSystem - Экземпляр PatienceSystem
   * @param {Object} moodSystem - Экземпляр MoodSystem
   * @param {Object} clientMemorySystem - Экземпляр ClientMemorySystem (опционально)
   * @returns {Array} Очередь клиентов
   */
  generateQueue(reputation, luck, clientGenerator, patienceSystem, moodSystem, clientMemorySystem = null) {
    this.clientQueue = [];
    this.currentClientIndex = 0;

    // Расчёт количества клиентов по формуле
    const reputationBonus = Math.floor(reputation / this.reputationDivisor);
    const randomBonus = Math.floor(Math.random() * (this.randomBonusMax + 1));
    const totalClients = this.baseClients + reputationBonus + randomBonus;

    Logger.debugModule('deck', `Генерация очереди: base=${this.baseClients}, repBonus=${reputationBonus}, random=${randomBonus}, total=${totalClients}`);

    // Получаем возвращающихся клиентов
    let returningClients = [];
    if (clientMemorySystem) {
      returningClients = clientMemorySystem.getReturningClients(3);
      Logger.debugModule('deck', `Возвращается клиентов: ${returningClients.length}`);
    }

    // Получаем уровень навыка визуальной оценки
    const visualAssessmentSkill = 0; // Передаётся извне если нужно

    // Сначала добавляем возвращающихся клиентов
    returningClients.forEach(clientData => {
      const client = clientGenerator.createReturningClientCard(
        clientData,
        reputation,
        luck,
        visualAssessmentSkill
      );

      // Добавляем параметры терпения и настроения
      client.patienceState = patienceSystem.initPatience(client);
      client.moodState = moodSystem.createMood(client);

      this.clientQueue.push(client);
      Logger.debugModule('deck', `Добавлен возвращающийся клиент: ${client.id} (визитов: ${clientData.visitCount})`);
    });

    // Затем генерируем новых клиентов на оставшиеся места
    const newClientsCount = Math.max(0, totalClients - returningClients.length);
    for (let i = 0; i < newClientsCount; i++) {
      const client = clientGenerator.generateClient(
        1.0, // reputation modifier
        luck,
        visualAssessmentSkill
      );

      // Добавляем параметры терпения и настроения
      client.patienceState = patienceSystem.initPatience(client);
      client.moodState = moodSystem.createMood(client);

      this.clientQueue.push(client);
    }

    Logger.debugModule('deck', `Очередь сгенерирована: ${this.clientQueue.length} клиентов (${returningClients.length} возвращающихся, ${newClientsCount} новых)`);
    return this.clientQueue;
  }

  /**
   * Получить текущего клиента из очереди
   * @returns {Object|null} Клиент или null если очередь пуста
   */
  getCurrentClient() {
    if (this.currentClientIndex >= this.clientQueue.length) {
      return null;
    }
    return this.clientQueue[this.currentClientIndex];
  }

  /**
   * Перейти к следующему клиенту
   * @returns {Object|null} Следующий клиент или null
   */
  nextClient() {
    this.currentClientIndex++;
    return this.getCurrentClient();
  }

  /**
   * Проверить, есть ли ещё клиенты в очереди
   * @returns {boolean} Есть ли клиенты
   */
  hasMoreClients() {
    return this.currentClientIndex < this.clientQueue.length;
  }

  /**
   * Получить количество оставшихся клиентов
   * @returns {number} Количество клиентов
   */
  getRemainingCount() {
    return Math.max(0, this.clientQueue.length - this.currentClientIndex);
  }

  /**
   * Получить количество всего клиентов
   * @returns {number} Общее количество
   */
  getTotalCount() {
    return this.clientQueue.length;
  }

  /**
   * Получить прогресс очереди (0-1)
   * @returns {number} Прогресс
   */
  getProgress() {
    if (this.clientQueue.length === 0) return 0;
    return this.currentClientIndex / this.clientQueue.length;
  }

  /**
   * Добавить клиента в конец очереди
   * @param {Object} client - Данные клиента
   */
  addClient(client) {
    this.clientQueue.push(client);
  }

  /**
   * Удалить текущего клиента из очереди
   * @returns {Object|null} Удалённый клиент
   */
  removeCurrentClient() {
    if (!this.hasMoreClients()) return null;
    
    const removed = this.clientQueue.splice(this.currentClientIndex, 1)[0];
    // Не увеличиваем индекс, потому что после splice следующий клиент сдвигается на текущую позицию
    return removed;
  }

  /**
   * Сбросить очередь
   */
  reset() {
    this.clientQueue = [];
    this.currentClientIndex = 0;
  }

  /**
   * Сериализация состояния
   * @returns {Object} Сериализованное состояние
   */
  serialize() {
    return {
      clientQueue: this.clientQueue,
      currentClientIndex: this.currentClientIndex
    };
  }

  /**
   * Десериализация состояния
   * @param {Object} data - Сериализованные данные
   */
  deserialize(data) {
    if (!data) return;
    this.clientQueue = data.clientQueue || [];
    this.currentClientIndex = data.currentClientIndex || 0;
  }

  /**
   * Получить статистику очереди
   * @returns {Object} Статистика
   */
  getStats() {
    return {
      total: this.clientQueue.length,
      remaining: this.getRemainingCount(),
      currentIndex: this.currentClientIndex,
      progress: this.getProgress()
    };
  }
}

export default DeckManager;
