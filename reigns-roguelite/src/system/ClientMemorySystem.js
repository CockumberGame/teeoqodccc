/**
 * ClientMemorySystem - Система памяти о клиентах
 * Хранит информацию о обслуженных клиентах между сессиями
 * Позволяет клиентам возвращаться с шансом на основе удовлетворённости
 * 
 * БАЛАНС:
 * - maxPoolSize: 30 клиентов (все обслуженные)
 * - maxReturningPerNight: 3 (макс. возвращающихся за ночь)
 * - visitCountThreshold: 5 (исчезает после 5 визитов)
 * - satisfactionThreshold: 50 (исчезает если satisfaction < 50%)
 */

import Logger from '../core/Logger.js';

class ClientMemorySystem {
  constructor() {
    // Пул обслуженных клиентов (сохраняется между сессиями)
    this.clientPool = [];

    // Максимальное количество клиентов в памяти
    this.maxPoolSize = 30;

    // Максимум возвращающихся клиентов за ночь
    this.maxReturningPerNight = 3;

    // Порог визитов для исчезновения
    this.visitCountThreshold = 5;

    // Порог удовлетворённости для исчезновения
    this.satisfactionThreshold = 50;

    // Шанс возврата для повторных клиентов
    this.returnChance = {
      excellent: { min: 80, max: 95 },    // ≥85% удовлетворённость
      good: { min: 50, max: 75 },         // 60-84%
      poor: { min: 5, max: 20 }           // <60%
    };
  }

  /**
   * Добавить клиента в память после обслуживания
   * @param {Object} clientData - Данные клиента
   * @param {number} satisfaction - Удовлетворённость (0-100)
   * @param {boolean} wasInspected - Был ли осмотр
   * @param {Array} revealedFetishes - Открытые фетиши
   */
  addClient(clientData, satisfaction, wasInspected = false, revealedFetishes = []) {
    const memoryEntry = {
      id: clientData.id,
      description: clientData.description,
      sizeCm: clientData.sizeCm,
      sizeCategory: clientData.size?.key || 'average',
      type: clientData.type?.id || 'unknown',
      typeName: clientData.type?.name || 'Неизвестен',
      fetishes: clientData.fetishes?.map(f => f.id) || [],
      revealedFetishes: wasInspected ? [...revealedFetishes] : [],
      wasInspected,
      satisfaction,
      visitDate: Date.now(),
      visitCount: 1
    };

    // Расчёт шанса возврата
    memoryEntry.returnChance = this._calculateReturnChance(satisfaction, wasInspected);

    // Добавляем в пул
    this.clientPool.push(memoryEntry);

    // Ограничиваем размер пула
    if (this.clientPool.length > this.maxPoolSize) {
      // Удаляем самых старых с низким шансом возврата
      this.clientPool.sort((a, b) => {
        if (b.returnChance !== a.returnChance) {
          return b.returnChance - a.returnChance;
        }
        return a.visitDate - b.visitDate; // Старые первыми
      });
      this.clientPool = this.clientPool.slice(0, this.maxPoolSize);
    }

    return memoryEntry;
  }

  /**
   * Рассчитать шанс возврата
   */
  _calculateReturnChance(satisfaction, wasInspected) {
    let range;

    if (satisfaction >= 85) {
      range = this.returnChance.excellent;
    } else if (satisfaction >= 60) {
      range = this.returnChance.good;
    } else {
      range = this.returnChance.poor;
    }

    // Базовый шанс
    let chance = Math.floor(
      range.min + Math.random() * (range.max - range.min)
    );

    // Бонус за осмотр (+10%)
    if (wasInspected) {
      chance = Math.min(95, chance + 10);
    }

    return chance;
  }

  /**
   * Получить клиентов для возврата в новой сессии
   * @param {number} targetCount - Желаемое количество повторных клиентов
   * @returns {Array} Массив клиентов для возврата
   */
  getReturningClients(targetCount = 5) {
    // Фильтруем клиентов с шансом возврата (исключаем тех кто исчез)
    const eligible = this.clientPool.filter(client => {
      // Проверяем не исчез ли клиент
      if (this._shouldDecayClient(client)) {
        return false;
      }
      
      // Проверяем шанс возврата
      const roll = Math.random() * 100;
      return roll < client.returnChance;
    });

    // Перемешиваем и берём нужное количество (но не больше maxReturningPerNight)
    eligible.sort(() => Math.random() - 0.5);

    const maxReturn = Math.min(targetCount, this.maxReturningPerNight, eligible.length);
    const result = eligible.slice(0, maxReturn);

    Logger.debugModule('clientMemory', `Возвращается ${result.length}/${this.clientPool.length} клиентов`);

    return result;
  }

  /**
   * Проверить, должен ли клиент исчезнуть из пула
   * @param {Object} client - Клиент
   * @returns {boolean}
   */
  _shouldDecayClient(client) {
    // Исчезает после visitCountThreshold визитов
    if (client.visitCount >= this.visitCountThreshold) {
      Logger.debugModule('clientMemory', `Клиент ${client.id} исчез (визитов: ${client.visitCount})`);
      return true;
    }

    // Исчезает если satisfaction < threshold
    if (client.satisfaction < this.satisfactionThreshold) {
      Logger.debugModule('clientMemory', `Клиент ${client.id} исчез (satisfaction: ${client.satisfaction})`);
      return true;
    }

    return false;
  }

  /**
   * Проверить, знакомый ли клиент
   * @param {string} clientId - ID клиента
   * @returns {Object|null} Информация о клиенте или null
   */
  getKnownClient(clientId) {
    return this.clientPool.find(c => c.id === clientId) || null;
  }

  /**
   * Обновить информацию о клиенте (повторный визит)
   * @param {string} clientId
   * @param {number} satisfaction
   * @param {boolean} wasInspected
   * @param {Array} newFetishes
   * @returns {Object|null} Обновлённый клиент или null если удалён
   */
  updateClient(clientId, satisfaction, wasInspected, newFetishes = []) {
    const client = this.clientPool.find(c => c.id === clientId);

    if (!client) return null;

    // Увеличиваем счётчик визитов
    client.visitCount++;

    // Обновляем удовлетворённость (среднее)
    client.satisfaction = Math.round(
      (client.satisfaction + satisfaction) / 2
    );

    // Проверяем не должен ли клиент исчезнуть
    if (this._shouldDecayClient(client)) {
      // Удаляем клиента из пула
      const index = this.clientPool.findIndex(c => c.id === clientId);
      if (index !== -1) {
        this.clientPool.splice(index, 1);
        Logger.debugModule('clientMemory', `Клиент ${clientId} удалён из пула`);
      }
      return null;
    }

    // Обновляем шанс возврата
    client.returnChance = this._calculateReturnChance(
      client.satisfaction,
      wasInspected
    );

    // Добавляем открытые фетиши
    if (wasInspected && newFetishes.length > 0) {
      const knownFetishes = new Set(client.revealedFetishes);
      newFetishes.forEach(f => knownFetishes.add(f));
      client.revealedFetishes = Array.from(knownFetishes);
    }

    client.wasInspected = client.wasInspected || wasInspected;
    client.visitDate = Date.now();

    return client;
  }

  /**
   * Получить статистику по клиенту
   * @param {string} clientId 
   * @returns {Object|null}
   */
  getClientStats(clientId) {
    const client = this.clientPool.find(c => c.id === clientId);
    
    if (!client) return null;

    return {
      visitCount: client.visitCount,
      avgSatisfaction: client.satisfaction,
      wasInspected: client.wasInspected,
      knownFetishes: client.revealedFetishes.length,
      totalFetishes: client.fetishes.length
    };
  }

  /**
   * Сериализация для сохранения
   */
  serialize() {
    return {
      clientPool: [...this.clientPool],
      maxPoolSize: this.maxPoolSize
    };
  }

  /**
   * Десериализация из сохранения
   */
  deserialize(data) {
    if (!data || !data.clientPool) return;
    
    this.clientPool = [...data.clientPool];
    this.maxPoolSize = data.maxPoolSize || 50;
  }

  /**
   * Очистить память (для тестов или сброса)
   */
  clear() {
    this.clientPool = [];
  }

  /**
   * Получить количество клиентов в памяти
   */
  getPoolSize() {
    return this.clientPool.length;
  }

  /**
   * Получить клиентов по типу
   * @param {string} type - Тип клиента
   * @returns {Array}
   */
  getClientsByType(type) {
    return this.clientPool.filter(c => c.type === type);
  }

  /**
   * Получить клиентов по размеру
   * @param {string} sizeCategory - Категория размера
   * @returns {Array}
   */
  getClientsBySize(sizeCategory) {
    return this.clientPool.filter(c => c.sizeCategory === sizeCategory);
  }
}

export default ClientMemorySystem;
