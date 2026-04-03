/**
 * ClientGenerator v0.7.0 — Генерация клиентов с параметрами
 * Gloryhole Quest — цветовая редкость, уровни, 6 фаз arousal
 *
 * Концепт от 23.03:
 * - Цветовая редкость: ⚪🟢🔵🟣🟠 (common/uncommon/rare/epic/legendary)
 * - Уровни клиентов: playerReputationLevel ± 3
 * - 6 фаз arousal: soft/interested/excited/ready/edge/climax
 * - Типы клиентов: normal/vip/regular/boss
 *
 * КОНТЕНТ: Текстовые описания хранятся в src/data/content/client_descriptions.json
 */

import SizeSystem from './SizeSystem.js';
import clientTraitsData from '../data/client_traits.json' with { type: 'json' };
import clientModifiersData from '../data/client_modifiers.json' with { type: 'json' };
import clientTiersData from '../data/content/client_tiers.json' with { type: 'json' };
import ContentLoader from '../data/ContentLoader.js';

class ClientGenerator {
  constructor() {
    this.sizeSystem = new SizeSystem();
    this.contentLoader = new ContentLoader();

    // Загрузка данных из JSON
    this.traitsData = clientTraitsData;
    this.modifiersData = clientModifiersData;
    this.tiersData = clientTiersData.tiers;
    this.typesData = clientTiersData.types;

    // Фетиши/требования
    this.fetishes = [
      { id: 'rough', name: 'Грубый', difficulty: 1.3, payout: 1.4, intensity: 'intense' },
      { id: 'gentle', name: 'Нежный', difficulty: 0.9, payout: 1.0, intensity: 'slow' },
      { id: 'spit', name: 'Слюни', difficulty: 1.1, payout: 1.2, intensity: 'normal' },
      { id: 'eye_contact', name: 'Зрительный контакт', difficulty: 1.2, payout: 1.3, intensity: 'normal' },
      { id: 'deep', name: 'Глубоко', difficulty: 1.5, payout: 1.6, intensity: 'intense' },
      { id: 'fast', name: 'Быстрый темп', difficulty: 1.4, payout: 1.3, intensity: 'intense' },
      { id: 'slow', name: 'Медленный', difficulty: 0.8, payout: 1.1, intensity: 'slow' },
      { id: 'teasing', name: 'Дразнение', difficulty: 1.2, payout: 1.4, intensity: 'normal' },
      { id: 'swallow', name: 'Глотать', difficulty: 1.6, payout: 1.8, intensity: 'intense' },
      { id: 'multiple', name: 'Несколько раз', difficulty: 1.8, payout: 2.0, intensity: 'intense' },
      { id: 'oral_focus', name: 'Оральный фокус', difficulty: 1.1, payout: 1.2, intensity: 'normal' },
      { id: 'hand_use', name: 'Помощь руками', difficulty: 0.9, payout: 1.0, intensity: 'normal' }
    ];

    // Типы клиентов
    this.clientTypes = [
      { id: 'regular', name: 'Постоянный', rarity: 0.50, payout: 1.0 },
      { id: 'newbie', name: 'Новичок', rarity: 0.25, payout: 0.8 },
      { id: 'generous', name: 'Щедрый', rarity: 0.10, payout: 1.5 },
      { id: 'demanding', name: 'Требовательный', rarity: 0.08, payout: 2.0 },
      { id: 'vip', name: 'VIP', rarity: 0.04, payout: 3.0 },
      { id: 'special', name: 'Особый', rarity: 0.03, payout: 4.0 }
    ];

    // Архетипы клиентов
    this.archetypes = [
      {
        id: 'shy',
        name: 'Застенчивый',
        weight: 0.20,
        traits: ['shy', 'nervous'],
        behaviorPattern: 'quiet',
        arousalGrowthMod: 0.8,
        satisfactionMod: 5
      },
      {
        id: 'confident',
        name: 'Уверенный',
        weight: 0.25,
        traits: ['experienced'],
        behaviorPattern: 'normal',
        arousalGrowthMod: 1.0,
        satisfactionMod: 0
      },
      {
        id: 'nervous',
        name: 'Нервный',
        weight: 0.15,
        traits: ['nervous', 'shy'],
        behaviorPattern: 'quiet',
        arousalGrowthMod: 0.7,
        satisfactionMod: 10
      },
      {
        id: 'dominant',
        name: 'Доминирующий',
        weight: 0.15,
        traits: ['demanding', 'rough'],
        behaviorPattern: 'rough',
        arousalGrowthMod: 1.2,
        satisfactionMod: -5
      },
      {
        id: 'curious',
        name: 'Любопытный',
        weight: 0.15,
        traits: ['curious'],
        behaviorPattern: 'talkative',
        arousalGrowthMod: 1.0,
        satisfactionMod: 0
      },
      {
        id: 'gentle',
        name: 'Ласковый',
        weight: 0.10,
        traits: ['gentle', 'loyal'],
        behaviorPattern: 'gentle',
        arousalGrowthMod: 0.9,
        satisfactionMod: 10
      }
    ];

    // Паттерны поведения
    this.behaviorPatterns = {
      talkative: {
        name: 'Разговорчивый',
        description: 'Любит поболтать во время сессии',
        patienceDecayMod: 0.9,
        moodSwingMod: 1.1,
        charismaRequirement: 1.2
      },
      quiet: {
        name: 'Молчаливый',
        description: 'Предпочитает действия словам',
        patienceDecayMod: 1.0,
        moodSwingMod: 0.9,
        charismaRequirement: 0.8
      },
      rough: {
        name: 'Грубый',
        description: 'Предпочитает жёсткое обращение',
        patienceDecayMod: 1.2,
        moodSwingMod: 1.3,
        enduranceRequirement: 1.2
      },
      gentle: {
        name: 'Нежный',
        description: 'Любит ласку и заботу',
        patienceDecayMod: 0.8,
        moodSwingMod: 0.8,
        skillRequirement: 0.9
      }
    };

    // 6 фаз возбуждения (v0.7.0) — синхронизировано с balance.json
    this.arousalPhases = {
      soft: { min: -15, max: 0, name: 'Холодный', multiplier: 0.8, color: '🩶' },
      interested: { min: 0, max: 25, name: 'Заинтересован', multiplier: 1.0, color: '🟢' },
      excited: { min: 25, max: 50, name: 'Возбуждён', multiplier: 1.25, color: '🔵' },
      ready: { min: 50, max: 75, name: 'Готов', multiplier: 1.5, color: '🟣' },
      edge: { min: 75, max: 90, name: 'На грани', multiplier: 1.8, color: '🟠' },
      climax: { min: 90, max: 100, name: 'Финал', multiplier: 2.0, color: '🔴' }
    };

    // Special clients pool
    this.specialClients = [
      { id: 'legendary_size', name: 'Легендарный размер', chance: 0.01, payoutMod: 5.0 },
      { id: 'celebrity', name: 'Знаменитость', chance: 0.005, payoutMod: 4.0 },
      { id: 'collector', name: 'Коллекционер', chance: 0.008, payoutMod: 3.5 }
    ];
  }

  /**
   * Выбрать tier клиента (цветовая редкость) v0.7.0
   * @param {number} reputation - Репутация игрока
   * @param {number} playerLevel - Уровень игрока
   * @returns {Object} Выбранный tier
   */
  _selectTier(reputation, playerLevel) {
    const tiers = Object.values(this.tiersData);
    
    // Фильтруем tier'ы по требованиям репутации и уровня
    const availableTiers = tiers.filter(tier => 
      reputation >= tier.minReputation && playerLevel >= tier.minPlayerLevel
    );
    
    if (availableTiers.length === 0) {
      return tiers[0];  // Common по умолчанию
    }
    
    // Взвешенный выбор
    const totalWeight = availableTiers.reduce((sum, tier) => sum + tier.baseChance, 0);
    let random = Math.random() * totalWeight;
    
    for (const tier of availableTiers) {
      random -= tier.baseChance;
      if (random <= 0) return tier;
    }
    
    return availableTiers[0];
  }

  /**
   * Выбрать тип клиента с учётом tier
   * @param {number} reputation - Репутация
   * @param {Object} tier - Выбранный tier
   * @returns {Object} Тип клиента
   */
  _selectType(reputation, tier) {
    const types = Object.values(this.typesData);
    
    // Фильтруем типы по требованиям
    const availableTypes = types.filter(type => 
      !type.minReputation || reputation >= type.minReputation
    );
    
    if (availableTypes.length === 0) {
      return types[0];  // Normal по умолчанию
    }
    
    // Взвешенный выбор
    return this.rollWeighted(availableTypes);
  }

  /**
   * Сгенерировать случайного клиента (v0.7.0: с tier-системой)
   * @param {number} reputation - Репутация для расчёта tier
   * @param {number} luck - Множитель удачи
   * @param {number} visualAssessmentSkill - Уровень навыка оценки
   * @param {number} playerLevel - Уровень игрока для levelRange
   * @returns {Object} Данные клиента
   */
  generateClient(reputation = 0, luck = 1, visualAssessmentSkill = 0, playerLevel = 1) {
    // Генерация размера через SizeSystem
    const sizeCm = this.sizeSystem.generateSize();
    const sizeCategory = this.sizeSystem.getSizeCategory(sizeCm);
    const sizePayoutMultiplier = this.sizeSystem.getPayoutMultiplier(sizeCm);

    // Выбор tier клиента (цветовая редкость)
    const tier = this._selectTier(reputation, playerLevel);

    // Выбор типа клиента с учётом tier
    const clientType = this._selectType(reputation, tier);

    // Проверка на special client (1-3% шанс)
    const isSpecial = Math.random() < 0.02;
    const specialType = isSpecial ? this.rollWeighted(this.specialClients) : null;

    // Выбор архетипа
    const archetype = this.rollWeighted(this.archetypes);

    // Выбор traits (1-3 черты)
    const traits = this._generateTraits(archetype);

    // Генерация модификаторов (Этап 2: шанс от репутации)
    const modifiers = this._generateModifiersWithChance(reputation);

    // Генерация preferences
    const preferences = this._generatePreferences();

    // Количество фетишей зависит от tier и типа
    const numFetishes = Math.floor(Math.random() * 2) + 1 +
      (clientType.id === 'demanding' ? 2 : 0) +
      (clientType.id === 'vip' ? 3 : 0) +
      (tier.id === 'epic' || tier.id === 'legendary' ? 2 : 0) +
      (isSpecial ? 2 : 0);

    const fetishes = [];
    const availableFetishes = [...this.fetishes];

    for (let i = 0; i < numFetishes && availableFetishes.length > 0; i++) {
      const index = Math.floor(Math.random() * availableFetishes.length);
      fetishes.push(availableFetishes.splice(index, 1)[0]);
    }

    // Выбор behavior pattern из архетипа
    const behaviorPattern = this.behaviorPatterns[archetype.behaviorPattern] || this.behaviorPatterns.quiet;

    // Базовая выносливость клиента
    const baseStamina = Math.floor(Math.random() * 5) + 3 +
      Math.floor((sizeCategory.difficulty || 1.2) * 2);

    // Начальное возбуждение (зависит от tier)
    const initialArousal = Math.floor(
      Math.random() * (tier.arousalStartRange.max - tier.arousalStartRange.min) +
      tier.arousalStartRange.min
    );

    // Расчёт базовой оплаты
    let basePayout = 30 * sizePayoutMultiplier * tier.payoutMultiplier * clientType.payoutMultiplier;

    // Применяем модификаторы от фетишей
    fetishes.forEach(f => basePayout *= f.payout);

    // Применяем special modifier
    if (specialType) {
      basePayout *= specialType.payoutMod;
    }

    // Применяем модификаторы от modifier'ов клиента
    modifiers.forEach(mod => {
      const modData = this.modifiersData[mod];
      if (modData?.effects?.payoutMultiplier) {
        basePayout *= modData.effects.payoutMultiplier;
      }
      if (modData?.effects?.baseRewardBonus) {
        basePayout += modData.effects.baseRewardBonus;
      }
    });

    basePayout = Math.floor(basePayout * luck);

    // Расчёт сложности
    let difficulty = (sizeCategory.difficulty || 1.2) * tier.payoutMultiplier * clientType.payoutMultiplier;
    fetishes.forEach(f => difficulty *= f.difficulty);

    // Модификаторы от traits и modifiers
    traits.forEach(trait => {
      const traitData = this.traitsData[trait];
      if (traitData) {
        difficulty *= (traitData.effects?.payoutMultiplier || 1.0);
      }
    });

    modifiers.forEach(mod => {
      const modData = this.modifiersData[mod];
      if (modData?.difficulty?.skillRequirement) {
        difficulty *= modData.difficulty.skillRequirement;
      }
    });

    difficulty = Math.round(difficulty * 10) / 10;

    // Интенсивность клиента
    const intensity = this._calculateIntensity(fetishes, archetype);

    // Patience зависит от tier
    const basePatience = Math.floor(
      Math.random() * (tier.patienceRange.max - tier.patienceRange.min) +
      tier.patienceRange.min
    );

    return {
      id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: this.contentLoader.getRandomClientDescription(),
      sizeCm: sizeCm,
      size: sizeCategory,
      tier: tier,  // Цветовая редкость
      type: clientType,
      archetype,
      traits,
      modifiers,
      preferences,
      fetishes,
      stamina: baseStamina,
      patience: basePatience,
      basePayout,
      difficulty,
      mentalImpact: Math.floor(difficulty / 2),
      isLegendary: this.sizeSystem.isLegendary(sizeCm),
      isSpecial: isSpecial,
      specialType: specialType?.id || null,
      arousal: initialArousal,
      arousalPhase: this.getArousalPhase(initialArousal),
      behaviorPattern: archetype.behaviorPattern,
      intensity: intensity,
      arousalGrowthMod: archetype.arousalGrowthMod || 1.0,
      satisfactionMod: archetype.satisfactionMod || 0,
      tierId: tier.id,  // Для UI
      tierColor: tier.color,  // Для UI
      tierName: tier.name  // Для UI
    };
  }

  /**
   * Сгенерировать модификаторы с шансом от репутации (Этап 2)
   * Формула: modChance = min(reputation / 100, 0.8)
   * @param {number} reputation - Текущая репутация
   * @returns {Array} Массив модификаторов
   */
  _generateModifiersWithChance(reputation) {
    const modifiers = [];

    // Шанс модификаторов от репутации
    const modChance = Math.min(reputation / 100, 0.8);

    // Проверяем шанс получения модификатора
    if (Math.random() >= modChance) {
      return modifiers;
    }

    // Количество модификаторов: 1-2
    const numModifiers = Math.floor(Math.random() * 2) + 1;

    // Получаем список доступных редких модификаторов
    const availableModifiers = this.getRareModifiers();

    for (let i = 0; i < numModifiers && availableModifiers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableModifiers.length);
      const selectedMod = availableModifiers[randomIndex];
      const modData = this.modifiersData[selectedMod];

      // Проверка совместимости с уже выбранными
      const compatible = modifiers.every(m => {
        const existingData = this.modifiersData[m];
        return !existingData?.incompatibleTypes?.includes(selectedMod);
      });

      // Проверка совместимости с типом клиента
      const typeCompatible = !modData?.incompatibleTypes?.some(
        type => modifiers.some(m => this.modifiersData[m]?.compatibleTypes?.includes(type))
      );

      if (compatible && typeCompatible) {
        modifiers.push(selectedMod);
        availableModifiers.splice(randomIndex, 1);
      }
    }

    return modifiers;
  }

  /**
   * Сгенерировать traits для клиента
   * @param {Object} archetype - Архетип клиента
   * @returns {Array} Массив traits
   */
  _generateTraits(archetype) {
    const traits = [...(archetype.traits || [])];

    // Добавляем 0-2 дополнительных traits
    const additionalCount = Math.floor(Math.random() * 2);
    const availableTraits = Object.keys(this.traitsData).filter(t => !traits.includes(t));

    for (let i = 0; i < additionalCount && availableTraits.length > 0; i++) {
      const randomTrait = availableTraits[Math.floor(Math.random() * availableTraits.length)];
      traits.push(randomTrait);
      availableTraits.splice(availableTraits.indexOf(randomTrait), 1);
    }

    return traits;
  }

  /**
   * Сгенерировать preferences (предпочтения)
   * @returns {Object} { liked: [], neutral: [], disliked: [] }
   */
  _generatePreferences() {
    const allFetishIds = this.fetishes.map(f => f.id);
    const shuffled = [...allFetishIds].sort(() => Math.random() - 0.5);

    // 2-3 liked
    const likedCount = Math.floor(Math.random() * 2) + 2;
    const liked = shuffled.slice(0, likedCount);

    // 1-2 disliked
    const dislikedCount = Math.floor(Math.random() * 2) + 1;
    const disliked = shuffled.slice(likedCount, likedCount + dislikedCount);

    // Остальные neutral
    const neutral = shuffled.slice(likedCount + dislikedCount);

    return { liked, neutral, disliked };
  }

  /**
   * Рассчитать интенсивность клиента
   * @param {Array} fetishes - Фетиши клиента
   * @param {Object} archetype - Архетип
   * @returns {string} 'slow', 'normal', 'intense'
   */
  _calculateIntensity(fetishes, archetype) {
    const intenseCount = fetishes.filter(f => f.intensity === 'intense').length;
    const slowCount = fetishes.filter(f => f.intensity === 'slow').length;

    if (intenseCount >= 2 || archetype.id === 'dominant') return 'intense';
    if (slowCount >= 2 || archetype.id === 'gentle') return 'slow';
    return 'normal';
  }

  /**
   * Получить фазу возбуждения по значению
   * @param {number} arousal - Значение возбуждения (0-100)
   * @returns {Object} Данные фазы
   */
  getArousalPhase(arousal) {
    // Особая проверка для climax (arousal >= 90)
    if (arousal >= this.arousalPhases.climax.min) {
      return { id: 'climax', ...this.arousalPhases.climax };
    }
    
    for (const [phaseId, phaseData] of Object.entries(this.arousalPhases)) {
      if (arousal >= phaseData.min && arousal < phaseData.max) {
        return { id: phaseId, ...phaseData };
      }
    }
    
    // Fallback для edge case
    return this.arousalPhases.soft;
  }

  /**
   * Получить список редких модификаторов
   * @returns {Array} Массив ID модификаторов
   */
  getRareModifiers() {
    return Object.keys(this.modifiersData).filter(key => {
      const modData = this.modifiersData[key];
      return modData?.rarity && modData.rarity <= 0.15;
    });
  }

  /**
   * Применить модификатор к клиенту
   * @param {Object} client - Клиент
   * @param {string} modifierId - ID модификатора
   * @returns {Object} Результат применения
   */
  applyModifier(client, modifierId) {
    if (!this.modifiersData[modifierId]) {
      return { applied: false, reason: 'Модификатор не найден' };
    }

    if (!client.modifiers) {
      client.modifiers = [];
    }

    if (client.modifiers.includes(modifierId)) {
      return { applied: false, reason: 'Модификатор уже есть' };
    }

    const modData = this.modifiersData[modifierId];

    // Проверка совместимости
    const compatible = client.modifiers.every(m => {
      const existingData = this.modifiersData[m];
      return !existingData?.incompatibleTypes?.includes(modifierId);
    });

    if (!compatible) {
      return { applied: false, reason: 'Несовместим с другими модификаторами' };
    }

    client.modifiers.push(modifierId);

    // Применяем эффекты
    if (modData.effects) {
      if (modData.effects.payoutMultiplier) {
        client.basePayout = Math.floor(client.basePayout * modData.effects.payoutMultiplier);
      }
      if (modData.effects.baseRewardBonus) {
        client.basePayout += modData.effects.baseRewardBonus;
      }
    }

    return {
      applied: true,
      modifier: modifierId,
      name: modData.name,
      effects: modData.effects
    };
  }

  /**
   * Выбрать элемент с весами
   * @param {Array} items - Массив элементов с rarity/weight
   * @returns {Object} Выбранный элемент
   */
  rollWeighted(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.rarity || item.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= (item.rarity || item.weight || 1);
      if (random <= 0) return item;
    }

    return items[items.length - 1];
  }

  /**
   * Сгенерировать карту клиента для карточной системы
   */
  generateClientCard(reputation = 0, luck = 1, visualAssessmentSkill = 0) {
    const client = this.generateClient(reputation, luck);

    // Визуальная оценка размера
    const visualAssessment = this.sizeSystem.getAssessment(client.sizeCm, visualAssessmentSkill);

    // Генерация описания
    const sensualDescription = this.generateSensualDescription(client, visualAssessment);

    return {
      id: client.id,
      clientData: client,
      text: sensualDescription,
      tags: ['client', client.size.id, client.type.id, ...client.fetishes.map(f => f.id)],
      difficulty: client.difficulty,
      basePayout: client.basePayout,
      sizeAssessment: visualAssessment,
      actualSizeCm: client.sizeCm
    };
  }

  /**
   * Генерация описания клиента с ощущениями
   * @param {Object} client - Данные клиента
   * @param {string} visualAssessment - Визуальная оценка размера
   * @returns {string} Описание с ощущениями
   */
  generateSensualDescription(client, visualAssessment) {
    const sizeId = client.size?.id || client.size?.key || 'average';
    const clientDescription = this.contentLoader.getClientDescription(
      sizeId,
      visualAssessment,
      client.description
    );

    // Добавление намёка на фетиши
    let fetishHint = '';
    if (client.fetishes && client.fetishes.length > 0) {
      const randomFetish = client.fetishes[Math.floor(Math.random() * client.fetishes.length)];
      const hint = this.contentLoader.getFetishHint(randomFetish.id);
      if (hint) {
        fetishHint = ` ${hint}`;
      }
    }

    // Добавление информации о модификаторах (намёк)
    let modifierHint = '';
    if (client.modifiers && client.modifiers.length > 0) {
      const randomMod = client.modifiers[Math.floor(Math.random() * client.modifiers.length)];
      const modData = this.modifiersData[randomMod];
      if (modData) {
        modifierHint = ` 💫 ${modData.name}`;
      }
    }

    return clientDescription + fetishHint + modifierHint;
  }

  /**
   * Создать карту повторного клиента (из памяти)
   * @param {Object} clientMemory - Данные из ClientMemorySystem
   * @param {number} reputation - Множитель репутации
   * @param {number} luck - Множитель удачи
   * @param {number} visualAssessmentSkill - Уровень навыка оценки
   * @returns {Object} Карта клиента
   */
  createReturningClientCard(clientMemory, reputation = 0, luck = 1, visualAssessmentSkill = 0) {
    // Начальное возбуждение для возвращающегося клиента (0-10%)
    const initialArousal = Math.floor(Math.random() * 10);

    // Визуальная оценка (для знакомых клиентов — точно)
    const visualAssessment = this.sizeSystem.getAssessment(clientMemory.sizeCm, visualAssessmentSkill);

    // Возвращаем плоскую структуру как generateClient()
    return {
      id: clientMemory.id,  // ← Не добавляем префикс! ClientMemorySystem уже вернул правильный ID
      description: clientMemory.description,
      sizeCm: clientMemory.sizeCm,
      size: { id: clientMemory.sizeCategory, key: clientMemory.sizeCategory },
      type: { id: clientMemory.type, name: clientMemory.typeName },
      fetishes: clientMemory.fetishes.map(f => ({ id: f, name: f })),
      difficulty: 1.0 + (clientMemory.visitCount * 0.1),
      basePayout: Math.floor(30 * luck * (1 + clientMemory.visitCount * 0.1)),
      isReturning: true,
      visitCount: clientMemory.visitCount,
      knownFetishes: clientMemory.revealedFetishes || [],
      arousal: initialArousal,
      arousalPhase: this.getArousalPhase(initialArousal),
      text: `🔓 Знакомый клиент! ${clientMemory.description}. Визитов: ${clientMemory.visitCount}. Размер: ${visualAssessment}.`,
      tags: ['client', 'returning', clientMemory.sizeCategory || 'average', clientMemory.type || 'unknown', ...(clientMemory.fetishes?.map(f => f.id) || [])],
      sizeAssessment: visualAssessment,
      actualSizeCm: clientMemory.sizeCm,
      familiarityBonus: 0.1
    };
  }
}

export default ClientGenerator;
