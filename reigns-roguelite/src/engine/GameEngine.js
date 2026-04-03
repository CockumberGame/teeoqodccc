/**
 * GameEngine - Тонкий оркестратор игровых систем
 * Gloryhole Quest - координирует системы, не содержит бизнес-логики
 *
 * Сокращено с 2235 до ~400 строк путём вынесения логики в:
 * - InteractionSession - управление встречей с клиентом
 * - DeckManager - генерация очереди клиентов
 * - EventBus - централизованная система событий
 * - BalanceSystem - константы и формулы
 */

import EventBus from '../core/EventBus.js';
import InteractionSession from '../core/InteractionSession.js';
import Logger from '../core/Logger.js';
import RunState from '../core/RunState.js';
import TimeSystem from '../system/TimeSystem.js';
import SkillSystem from '../system/SkillSystem.js';
import ClientGenerator from '../system/ClientGenerator.js';
import ReputationSystem from '../system/ReputationSystem.js';
import SizeSystem from '../system/SizeSystem.js';
import InventorySystem from '../system/InventorySystem.js';
import ClientMemorySystem from '../system/ClientMemorySystem.js';
import InspectionSystem from '../system/InspectionSystem.js';
import PatienceSystem from '../system/PatienceSystem.js';
import MoodSystem from '../system/MoodSystem.js';
import DeckManager from '../system/DeckManager.js';
import ActionDeckSystem from '../system/ActionDeckSystem.js';
import TrustSystem from '../system/TrustSystem.js';
import ClimaxSystem from '../system/ClimaxSystem.js';
import TagInteractionSystem from '../system/TagInteractionSystem.js';
import EventSystem from '../system/EventSystem.js';
import ConditionEngine from '../system/ConditionEngine.js';
import EffectEngine from '../system/EffectEngine.js';
import actionsData from '../data/content/actions.json' with { type: 'json' };
import combatRulesData from '../data/content/combat_rules.json' with { type: 'json' };

class GameEngine {
  constructor() {
    // EventBus - централизованная система событий
    this.eventBus = new EventBus();

    // Инициализация систем
    this.timeSystem = new TimeSystem();
    this.skillSystem = new SkillSystem();
    this.clientGenerator = new ClientGenerator();
    this.reputationSystem = new ReputationSystem();
    this.sizeSystem = new SizeSystem();
    this.inventorySystem = new InventorySystem();
    this.clientMemorySystem = new ClientMemorySystem();
    this.inspectionSystem = new InspectionSystem();
    this.patienceSystem = new PatienceSystem();
    this.moodSystem = new MoodSystem();
    this.deckManager = new DeckManager();
    this.actionDeckSystem = new ActionDeckSystem();
    this.actionDeckSystem.loadData(actionsData, combatRulesData);  // Загрузка данных
    this.trustSystem = new TrustSystem();
    this.climaxSystem = new ClimaxSystem();
    this.tagInteractionSystem = new TagInteractionSystem();
    this.eventSystem = new EventSystem();
    this.conditionEngine = new ConditionEngine(this);
    this.effectEngine = new EffectEngine(this);

    // Состояние игры
    this.player = null;
    this.runState = new RunState(); // Новое: состояние забега
    this.currentCard = null;
    this.gameState = 'menu';
    this.hubMode = true;

    // Система дней
    this.day = 1;
    this.needsRest = false;
    this.sessionCompleted = false; // Флаг: ночь завершена, нужно отдохнуть

    // Энергия действий
    this.actionPoints = 3;
    this.maxActionPoints = 3;
    this.actionPointsBonus = 0; // Бонус от навыков (+1 на 5 и 10 уровне)

    // Очередь клиентов (единственный источник правды)
    this.currentClientIndex = 0;

    // Текущая interaction сессия
    this.interactionSession = null;

    // Текущие карты действий
    this.currentActionCards = [];

    // Статистика сессии
    this.sessionStats = {
      clientsServed: 0,
      satisfiedClients: 0,
      totalEarned: 0,
      totalXp: 0,
      actionsTaken: 0,
      eventsTriggered: 0,
      earlyFinishes: 0
    };

    // Причина последней ночи
    this.lastNightReason = null;

    // Дневные лимиты (сбрасываются после сна)
    this.dailyActions = {
      paidStaminaRestore: false,
      paidMentalRestore: false
    };

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.eventBus.on('statChanged', (data) => Logger.debugModule('event', 'Стат изменился:', data));
    this.eventBus.on('cardChosen', (data) => Logger.debugModule('event', 'Выбор сделан:', data));
    this.eventBus.on('nightEnded', (data) => Logger.infoModule('game', 'Ночь окончена:', data));
    this.eventBus.on('skillUpgraded', (data) => Logger.infoModule('game', 'Навык улучшен:', data));
  }

  /**
   * Инициализировать игрока
   */
  initPlayer(name = 'Без имени') {
    // Сброс систем (нужно до player, чтобы получить бонусы)
    this.skillSystem = new SkillSystem();
    this.reputationSystem = new ReputationSystem();
    this.timeSystem = new TimeSystem();

    // Получаем бонусы от навыков
    const staminaBonus = this.skillSystem.getStaminaBonus();
    this.actionPointsBonus = this.skillSystem.getActionPointsBonus();

    // Player - постоянные данные (не сбрасываются)
    this.player = {
      name,
      stats: {
        stamina: 60 + staminaBonus,  // Базовое + бонус от навыка
        maxStamina: 60 + staminaBonus,
        mental_health: 80,
        maxMentalHealth: 80,
        money: 100,
        xp: 0,
        level: 1
      },
      metaProgression: {
        totalNights: 0,
        totalEarned: 0,
        totalClients: 0
      }
    };

    // RunState - временные данные на ночь (сбрасываются)
    this.runState = new RunState();
    this.runState.applyItemModifiers(this.player.items || []);

    this.day = 1;
    this.needsRest = false;
    this.sessionCompleted = false;
    this.actionPoints = this.maxActionPoints + this.actionPointsBonus;
    this.dailyActions = {
      paidStaminaRestore: false,
      paidMentalRestore: false
    };

    this.gameState = 'hub';
    this.hubMode = true;

    this.eventBus.emit('playerCreated', { player: this.player });
    return this.player;
  }

  /**
   * Начать ночную сессию (Этап 2: обновлено)
   * @returns {Object} { success, player, runState, startTime, clientCount, state }
   */
  startNightSession() {
    if (!this.player) this.initPlayer();

    // Проверка: ночь уже завершена, нужно отдохнуть
    if (this.sessionCompleted) {
      return { success: false, reason: 'Ночь завершена! Нужно отдохнуть.' };
    }

    if (this.needsRest) {
      return { success: false, reason: 'Нужно отдохнуть!' };
    }

    // Сброс перед сессией
    this.timeSystem.startSession();
    this.reputationSystem = new ReputationSystem();
    this.resetSessionStats();

    // Сброс runState на начало ночи
    this.runState.reset();
    this.runState.applyItemModifiers(this.player.items || []);

    // Генерация очереди клиентов (Этап 2: с модификаторами от репутации + возвращающиеся клиенты)
    this.deckManager.generateQueue(
      this.reputationSystem.reputation,
      this.runState.modifiers.luckMultiplier,
      this.clientGenerator,
      this.patienceSystem,
      this.moodSystem,
      this.clientMemorySystem  // Передаём ClientMemorySystem
    );

    this.hubMode = false;
    this.gameState = 'playing';
    this.currentCard = null;

    // Начинаем первую встречу
    this.startNextInteraction();

    // Отправляем событие ПОСЛЕ установки currentCard
    this.eventBus.emit('nightStarted', {
      player: this.player,
      runState: this.runState.getState(),
      startTime: this.timeSystem.getTimeString(),
      clientCount: this.deckManager.getTotalCount(),
      reputation: this.reputationSystem.reputation,
      modChance: this.reputationSystem.getTierChance(this.reputationSystem.reputation)
    });

    return {
      success: true,
      player: this.player,
      runState: this.runState.getState(),
      startTime: this.timeSystem.getTimeString(),
      clientCount: this.deckManager.getTotalCount(),
      state: this.getFullState()
    };
  }

  /**
   * Начать следующую встречу (Этап 2: с проверкой модификаторов от ожидания)
   */
  startNextInteraction() {
    const client = this.deckManager.getCurrentClient();
    this.currentClientIndex = this.deckManager.currentClientIndex;

    if (!client) {
      // Клиенты закончились - конец ночи
      this.endNight('clients_finished');
      return null;
    }

    // Этап 2: Проверка модификаторов от ожидания
    // Если patience_waiting <= 0, применяем дебаф
    if (client.patienceState && client.patienceState.current <= 0) {
      const debuffResult = this.patienceSystem.applyPatienceDebuff(client);
      if (debuffResult.applied) {
        Logger.debugModule('engine', `Клиент получил дебаф: ${debuffResult.debuffType}`);
      }
    }

    // Создаём карту клиента
    const visualAssessment = this.clientGenerator.sizeSystem.getAssessment(client.sizeCm, 0);
    this.currentCard = {
      id: client.id,
      clientData: client,
      text: this.clientGenerator.generateSensualDescription(client, visualAssessment),
      tags: ['client', client.size?.id || client.size?.key || 'average', client.type?.id || 'unknown'],
      patienceState: client.patienceState,
      moodState: client.moodState,
      sizeAssessment: visualAssessment,
      // Этап 2: информация о модификаторах для UI
      modifierInfo: client.modifiers?.map(mod => {
        const modData = this.clientGenerator.modifiersData[mod];
        return modData ? { id: mod, name: modData.name } : null;
      }).filter(Boolean) || []
    };

    // Создаём interaction сессию
    this.interactionSession = new InteractionSession(client, this.player);

    // Инициализируем доверие и передаём в сессию
    this.currentCard.trustState = this.trustSystem.createTrustState(client);
    // Передаём trust в сессию для формулы early finish
    this.interactionSession.client.trust = this.currentCard.trustState.current;

    // Сбрасываем отслеживание inspect для нового клиента
    this.actionDeckSystem.resetClientUsage(client.id);

    // Получаем фазу arousal из сессии
    const arousalPhase = this.interactionSession.getArousalPhase(client.arousal || 0).id;

    // Проверяем был ли осмотр (для бывалых клиентов)
    const clientMemory = this.clientMemorySystem.getKnownClient(client.id);
    const isInspected = clientMemory?.wasInspected || false;

    // Генерируем первые 2 карты действий с учётом фазы и осмотра
    // Передаём turnNumber = 1 для первого хода
    this.currentActionCards = this.actionDeckSystem.generateActionCards(
      client,
      this.player,
      this.skillSystem,
      client.id,
      1  // turnNumber: первый ход
    );

    this.eventBus.emit('interactionStarted', {
      clientId: client.id,
      actionCards: this.currentActionCards,
      trust: this.currentCard.trustState.current,
      modifiers: this.currentCard.modifierInfo
    });

    return {
      success: true,
      client,
      actionCards: this.currentActionCards
    };
  }

  /**
   * Сыграть карту действия (Этап 2: с авто-тиком настроения и терпения)
   */
  playActionCard(actionIndex) {
    if (!this.interactionSession) {
      return { success: false, reason: 'Нет активной встречи' };
    }

    if (!this.currentActionCards[actionIndex]) {
      return { success: false, reason: 'Неверный индекс карты' };
    }

    const action = this.currentActionCards[actionIndex];
    const client = this.currentCard.clientData;

    // Сохраняем текущую фазу arousal ДО применения действия
    const oldArousalPhase = this.interactionSession.getArousalPhase(
      this.interactionSession.client.arousal
    ).id;

    // Расчёт взаимодействия тегов
    const tagResult = this.tagInteractionSystem.calculateTagModifier(
      action.tags,
      client.traits || []
    );

    // Получаем эффекты предметов для этого действия
    const itemEffects = this.inventorySystem.getActiveEffectsForAction(action.id);

    // Применяем бонус доверия от предметов (пассивный)
    if (itemEffects.trustBonus && this.currentCard.trustState) {
      const trustBonus = Math.floor(this.currentCard.trustState.current * itemEffects.trustBonus);
      this.trustSystem.modifyTrust(
        this.currentCard.trustState,
        trustBonus,
        'passive_item_bonus'
      );
    }

    // Играем действие в сессии с эффектами предметов
    const result = this.interactionSession.playAction(action, {
      tagModifier: tagResult.modifier,
      itemEffects
    });

    // Применяем модификатор от тегов
    if (tagResult.modifier !== 1.0) {
      result.tagModifier = tagResult.modifier;
      result.tagBreakdown = tagResult.breakdown;
    }

    // Обновляем доверие
    if (this.currentCard.trustState) {
      const trustChange = result.success ? (result.successChance >= 0.8 ? 3 : 1) : -2;
      this.trustSystem.modifyTrust(
        this.currentCard.trustState,
        trustChange,
        `action_${action.id}`
      );
    }

    // Применяем эффекты к игроку
    this.applyActionResult(result, action);

    // Добавляем действие в историю с clientId для отслеживания повторов
    // Передаём текущую фазу для отслеживания inspect
    this.actionDeckSystem.addToHistory(action.id, client.id, oldArousalPhase);

    // Проверяем смену фазы arousal после применения действия
    const newArousalPhase = this.interactionSession.getArousalPhase(
      this.interactionSession.client.arousal
    ).id;

    if (oldArousalPhase !== newArousalPhase) {
      // Сбрасываем inspect для старой фазы
      this.actionDeckSystem.onArousalPhaseChanged(client.id, oldArousalPhase, newArousalPhase);
    }

    // Проверяем завершение по стамине (после applyActionResult)
    const staminaCheck = this.interactionSession.checkStaminaDepleted(
      this.runState.stamina
    );
    if (staminaCheck) {
      const finishResult = this.finishInteraction({
        ...result,
        isFinished: true,
        finishReason: 'staminaDepleted'
      });

      // ВАЖНО: Если вдруг arousal >= 95, ждём выбора кульминации
      if (this.gameState === 'climaxChoice') {
        return {
          ...finishResult,
          state: this.getFullState()
        };
      }

      return finishResult;
    }

    // Тик времени
    this.timeSystem.advanceTurn(15);

    // Тик эффектов runState
    this.runState.tickEffects();

    // Этап 2: Авто-тик настроения (каждый ход автоматически)
    const trustValue = this.currentCard.trustState?.current || 50;
    this.moodSystem.autoTick(
      this.currentCard.moodState,
      client,
      this.timeSystem.currentTurn,
      trustValue
    );

    // Этап 2: Обновляем терпение следующего клиента в очереди
    this.updatePatienceForNextClient();

    // Обновляем статистику
    this.sessionStats.actionsTaken++;

    // Проверяем завершение встречи
    if (result.isFinished) {
      const finishResult = this.finishInteraction(result);

      // ВАЖНО: Если ждём выбора кульминации, НЕ продолжаем обработку
      // Иначе ночь завершится преждевременно вместо перехода к выбору исхода
      if (this.gameState === 'climaxChoice') {
        return {
          ...finishResult,
          state: this.getFullState()
        };
      }

      // Для других причин завершения (staminaDepleted, clientLeft и т.д.)
      // Возвращаем результат и НЕ генерируем новые карты
      return finishResult;
    }

    // Если gameState === 'climaxChoice', НЕ продолжаем обработку
    // Это защита на случай если isFinished не был установлен правильно
    if (this.gameState === 'climaxChoice') {
      return {
        success: true,
        result,
        state: this.getFullState()
      };
    }

    // Получаем текущую фазу arousal
    const arousalPhase = this.interactionSession.getArousalPhase(
      this.interactionSession.client.arousal
    ).id;

    // Проверяем был ли осмотр
    const clientMemory = this.clientMemorySystem.getKnownClient(client.id);
    const isInspected = clientMemory?.wasInspected || false;

    // v0.8: Используем актуальный arousal из сессии, а НЕ из clientData
    const sessionClient = {
      ...client,
      arousal: this.interactionSession.client.arousal
    };

    // Получаем номер следующего хода (текущий turn + 1)
    const nextTurnNumber = (this.interactionSession.turn || 0) + 1;

    // Генерируем новые карты действий с учётом фазы
    this.currentActionCards = this.actionDeckSystem.generateActionCards(
      sessionClient,  // ← Актуальный arousal
      this.player,
      this.skillSystem,
      client.id,
      nextTurnNumber  // Передаём номер следующего хода
    );

    return {
      success: true,
      result,
      newActionCards: this.currentActionCards,
      tagInteraction: tagResult,
      moodTick: this.currentCard.moodState,
      itemEffects: Object.keys(itemEffects).some(k => itemEffects[k] > 0) ? itemEffects : null,
      state: this.getFullState()  // Новое: полное состояние для UI
    };
  }

  /**
   * Применить эффекты действия к игроку
   * @param {Object} result - Результат действия
   * @param {Object} action - Данные действия
   */
  applyActionResult(result, action = null) {
    // Расход стамины из runState
    if (result.staminaCost > 0) {
      this.runState.modifyStamina(-result.staminaCost);
    }

    // Расход менталки из runState
    if (result.mentalCost > 0) {
      this.runState.modifyMental(-result.mentalCost);
    }

    // Обновление статистики за ночь
    this.runState.actionsTaken++;

    // Обновление arousal клиента
    if (result.arousalGain !== undefined && result.arousalGain !== 0) {
      const oldArousal = this.currentCard.clientData.arousal || 0;
      this.currentCard.clientData.arousal = Math.max(0, Math.min(100, oldArousal + result.arousalGain));
      Logger.debugModule('game', `Arousal: ${oldArousal} → ${this.currentCard.clientData.arousal} (${result.arousalGain > 0 ? '+' : ''}${result.arousalGain})`);
    }

    // Получение опыта (с модификатором)
    // v0.7: XP из effects.xp или от arousalGain
    if (result.success) {
      const baseXp = result.effects?.xp || Math.floor(Math.abs(result.arousalGain) * 0.8);
      const xpGain = Math.floor(baseXp * this.runState.modifiers.xpMultiplier);
      this.player.stats.xp += xpGain;
      this.runState.totalXp += xpGain;
      this.checkLevelUp(this.player);
    }

    // Раскрытие предпочтений и черт
    if (action) {
      if (action.revealsPreference && action.preferenceHint) {
        if (!this.currentCard.revealedFetishes) {
          this.currentCard.revealedFetishes = [];
        }
        if (!this.currentCard.revealedFetishes.includes(action.preferenceHint)) {
          this.currentCard.revealedFetishes.push(action.preferenceHint);
        }
      }
    }

    this.eventBus.emit('actionPlayed', { result });
  }

  /**
   * Завершить встречу с клиентом
   * ВАЖНО: При climax НЕ вызывает resolveInteractionEnd — это происходит после выбора исхода
   */
  finishInteraction(result) {
    const client = this.currentCard.clientData;
    const session = this.interactionSession;

    // ВАЖНО: Обновляем arousal клиента из сессии (session — единственный источник правды)
    client.arousal = session.client.arousal;

    // Проверяем кульминацию (используем константу из ClimaxSystem)
    const climaxThreshold = ClimaxSystem.CLIMAX_THRESHOLD || 90;
    if (client.arousal >= climaxThreshold) {
      this.gameState = 'climaxChoice';

      const outcomes = this.climaxSystem.generateOutcomes(
        client,
        this.player,
        this.trustSystem.getTrustBonus(this.currentCard.trustState?.current || 50)
      );

      this.eventBus.emit('climaxReached', {
        clientId: client.id,
        outcomes,
        trustState: this.currentCard.trustState
      });

      // ВАЖНО: Сбрасываем isFinished сессии чтобы позволить выбор исхода
      // Сессия технически ещё не завершена — ждём выбора игрока
      if (session) {
        session.isFinished = false;
        session.finishReason = null;
      }

      // ВАЖНО: Не завершаем встречу, ждём выбора исхода кульминации
      return {
        success: true,
        clientClimaxed: true,
        climaxReached: true,
        climaxOutcomes: outcomes,
        isFinished: false,  // Изменено: false чтобы UI не считал что встреча завершена
        waitForClimaxChoice: true,  // Флаг: ждём выбора игрока
        gameState: 'climaxChoice'
      };
    }

    // Завершение по другой причине (не climax)
    return this.resolveInteractionEnd(result);
  }

  /**
   * Выбрать исход кульминации
   */
  chooseClimaxOutcome(outcomeId) {
    if (this.gameState !== 'climaxChoice') {
      return { success: false, reason: 'Не фаза выбора исхода' };
    }

    const client = this.currentCard?.clientData;
    if (!client) return { success: false, reason: 'Нет клиента' };

    const climaxResult = this.climaxSystem.calculateOutcome(
      outcomeId,
      client,
      this.player,
      this.trustSystem.getTrustBonus(this.currentCard.trustState?.current || 50)
    );

    // Применяем последствия
    this.player.stats.money += climaxResult.effects.money;
    this.player.metaProgression.totalEarned += climaxResult.effects.money;
    this.player.stats.xp += climaxResult.effects.xp;
    this.player.stats.mental_health = Math.max(0, 
      this.player.stats.mental_health + climaxResult.effects.mental
    );

    // Репутация
    const reputationGain = climaxResult.satisfaction >= 80 ? 3 : 
                          climaxResult.satisfaction >= 60 ? 2 : 1;
    this.reputationSystem.addReputation(reputationGain);

    if (climaxResult.satisfaction >= 80) {
      this.reputationSystem.recordSatisfiedClient();
      this.sessionStats.satisfiedClients++;
    }

    // Обновляем доверие
    if (this.currentCard.trustState && climaxResult.satisfaction >= 60) {
      const trustChange = climaxResult.satisfaction >= 80 ? 5 : 3;
      this.trustSystem.modifyTrust(
        this.currentCard.trustState,
        trustChange,
        `climax_${outcomeId}`
      );
    }

    // Запоминаем клиента с реальным satisfaction из climaxResult
    this.rememberClient(client, climaxResult.satisfaction, this.currentCard.revealedFetishes || []);

    // Обновляем статистику
    this.sessionStats.clientsServed++;
    this.sessionStats.totalEarned += climaxResult.effects.money;
    this.sessionStats.totalXp += climaxResult.effects.xp;

    this.eventBus.emit('interactionFinished', {
      clientId: client.id,
      satisfaction: climaxResult.satisfaction,
      reward: climaxResult.effects.money
    });

    // Переходим к следующему клиенту
    this.gameState = 'playing';
    this.deckManager.nextClient();
    this.currentClientIndex = this.deckManager.currentClientIndex;
    this.interactionSession = null;
    this.currentActionCards = [];

    // Начинаем следующую встречу или конец ночи
    if (this.deckManager.hasMoreClients()) {
      this.startNextInteraction();
      // Отправляем событие что выбор кульминации завершён и начался новый клиент
      this.eventBus.emit('climaxChosen', {
        clientId: client.id,
        climaxResult,
        hasNextClient: true
      });
    } else {
      this.endNight('clients_finished');
    }

    return { success: true, climaxResult };
  }

  /**
   * Разрешить завершение встречи (Этап 2: с обновлённой формулой репутации)
   */
  resolveInteractionEnd(result) {
    const client = this.currentCard.clientData;
    const session = this.interactionSession;

    // Расчёт награды
    const reward = session.calculateReward();
    this.player.stats.money += reward.totalReward;
    this.sessionStats.totalEarned += reward.totalReward;

    // Этап 2: Обновлённая формула репутации (медленный рост)
    const satisfaction = session.getSatisfaction();
    // addReputation теперь принимает satisfaction и использует формулу: gain = satisfaction * 0.2
    const reputationGain = this.reputationSystem.addReputation(satisfaction, {
      clientsServedInSession: 1
    });

    if (satisfaction >= 80) {
      this.reputationSystem.recordSatisfiedClient();
      this.sessionStats.satisfiedClients++;
    }

    // Запоминаем клиента с реальным satisfaction
    this.rememberClient(client, satisfaction, this.currentCard.revealedFetishes || []);

    // Обновляем статистику
    this.sessionStats.clientsServed++;

    this.eventBus.emit('interactionFinished', {
      clientId: client.id,
      finishReason: result.finishReason,
      satisfaction,
      reward: reward.totalReward,
      reputationGain
    });

    // Переходим к следующему клиенту
    this.deckManager.nextClient();
    this.currentClientIndex = this.deckManager.currentClientIndex;
    this.interactionSession = null;
    this.currentActionCards = [];

    if (this.deckManager.hasMoreClients()) {
      this.startNextInteraction();
    } else {
      this.endNight('clients_finished');
    }

    return { success: true, reward, finishReason: result.finishReason, reputationGain };
  }

  /**
   * Попытка раннего завершения
   */
  attemptEarlyFinish() {
    if (!this.interactionSession) {
      return { success: false, reason: 'Нет активной встречи' };
    }

    const result = this.interactionSession.attemptEarlyFinish();

    if (result.finished) {
      return this.finishInteraction({
        isFinished: true,
        finishReason: 'earlyFinish'
      });
    }

    return result;
  }

  /**
   * Получить шанс раннего завершения (для UI)
   * @returns {Object} { successChance, canAttempt, requiredArousal }
   */
  getEarlyFinishChance() {
    if (!this.interactionSession) {
      return { canAttempt: false, successChance: 0, requiredArousal: 75 };
    }

    return this.interactionSession.getEarlyFinishChance();
  }

  /**
   * Запомнить клиента в памяти
   * @param {Object} clientData - Данные клиента
   * @param {number} satisfaction - Удовлетворённость (0-100)
   * @param {Array} revealedFetishes - Открытые фетиши
   */
  rememberClient(clientData, satisfaction, revealedFetishes = []) {
    // Проверяем был ли осмотр
    const clientMemory = this.clientMemorySystem.getKnownClient(clientData.id);
    const wasInspected = clientMemory?.wasInspected || false;

    this.clientMemorySystem.addClient(
      clientData,
      satisfaction,
      wasInspected,
      revealedFetishes
    );

    this.eventBus.emit('clientRemembered', {
      clientId: clientData.id,
      satisfaction
    });
  }

  /**
   * Обновить терпение следующего клиента (Этап 2: реальная реализация)
   */
  updatePatienceForNextClient() {
    const currentIndex = this.deckManager.currentClientIndex || 0;
    const nextIndex = currentIndex + 1;
    const clients = this.deckManager.clientQueue || [];

    if (nextIndex < clients.length) {
      const nextClient = clients[nextIndex];
      if (nextClient && nextClient.patienceState) {
        // Уменьшаем терпение ожидающего клиента
        const tickResult = this.patienceSystem.tick(nextClient, this.timeSystem.currentTurn);

        // Если терпение <= 0, применяем дебаф
        if (tickResult.shouldApplyDebuff) {
          this.patienceSystem.applyPatienceDebuff(nextClient);
        }

        // Обновляем ссылку в currentCard для UI
        if (this.currentCard) {
          this.currentCard.nextClientPatience = {
            current: nextClient.patienceState.current,
            max: nextClient.patienceState.max,
            state: this.patienceSystem.getPatienceState(nextClient.patienceState),
            percent: this.patienceSystem.getPatiencePercent(nextClient.patienceState),
            color: this.patienceSystem.getPatienceColor(nextClient.patienceState)
          };
        }
      }
    }
  }

  /**
   * Проверить повышение уровня
   */
  checkLevelUp(player) {
    const xpNeeded = player.stats.level * 100;
    if (player.stats.xp >= xpNeeded) {
      player.stats.level++;
      player.stats.xp -= xpNeeded;
      player.stats.maxStamina += 10;
      player.stats.stamina = player.stats.maxStamina;
      player.stats.maxMentalHealth += 10;
      player.stats.mental_health = player.stats.maxMentalHealth;

      this.eventBus.emit('levelUp', { level: player.stats.level });
    }
  }

  /**
   * Закончить ночь
   * @param {string} reason - Причина завершения
   * @param {Object} penalties - Опционально: данные о штрафах (для endNightEarly)
   */
  endNight(reason, penalties = null) {
    // Переносим заработанное за ночь из runState в player
    const moneyEarned = Math.floor(this.runState.totalEarned * this.runState.modifiers.moneyMultiplier);

    this.player.stats.money += moneyEarned;
    this.player.metaProgression.totalEarned += moneyEarned;
    this.player.metaProgression.totalNights++;
    this.player.metaProgression.totalClients += this.runState.clientsServed;

    this.lastNightReason = reason;
    this.hubMode = false;  // Пока показываем оверлей
    this.gameState = 'nightSummary';  // Новое состояние для оверлея
    this.needsRest = true;
    this.sessionCompleted = true; // Флаг: ночь завершена, нужно отдохнуть
    this.interactionSession = null;
    this.currentActionCards = [];
    this.deckManager.reset();

    this.eventBus.emit('nightEnded', {
      reason,
      stats: this.sessionStats,
      runState: this.runState.getState(),
      moneyEarned,
      xpEarned: this.runState.totalXp,
      // Данные о штрафах (если есть)
      penalties: penalties ? {
        moneyLost: penalties.moneyLost,
        reputationLoss: penalties.reputationLoss,
        moneyPenaltyPercent: penalties.moneyPenaltyPercent,
        sessionMoney: penalties.sessionMoney,
        turnsPercent: penalties.turnsPercent,
        remainingClients: penalties.remainingClients
      } : null
    });
  }

  /**
   * Завершить показ оверлея и перейти в хаб
   */
  closeNightSummary() {
    this.hubMode = true;
    this.gameState = 'hub';
    this.eventBus.emit('nightSummaryClosed');
  }

  /**
   * Сбросить статистику сессии
   */
  resetSessionStats() {
    this.sessionStats = {
      clientsServed: 0,
      satisfiedClients: 0,
      totalEarned: 0,
      totalXp: 0,
      actionsTaken: 0,
      eventsTriggered: 0,
      earlyFinishes: 0
    };
    this.currentClientIndex = 0;
  }

  /**
   * Отдохнуть (восстановить стамину от кровати, сбросить dailyActions)
   * @returns {Object} Результат отдыха
   */
  rest() {
    if (!this.needsRest) {
      return { success: false, reason: 'Вы ещё не устали' };
    }

    // Определяем уровень кровати (последняя купленная в items)
    let bedLevel = 0;
    let staminaRestore = 50; // Базовое восстановление (без кровати)
    
    if (this.player.items && this.player.items.length > 0) {
      // Ищем последнюю купленную кровать
      const beds = ['bed_basic', 'bed_upgrade_1', 'bed_upgrade_2'];
      for (let i = this.player.items.length - 1; i >= 0; i--) {
        if (beds.includes(this.player.items[i])) {
          const bed = this.inventorySystem.getItem(this.player.items[i]);
          if (bed) {
            bedLevel = bed.bedLevel || 1;
            staminaRestore = bed.staminaRestore || 50;
          }
          break;
        }
      }
    }

    // Восстанавливаем стамину от кровати
    this.player.stats.stamina = Math.min(this.player.stats.maxStamina, staminaRestore);
    this.runState.stamina = this.player.stats.stamina;

    // Восстанавливаем runState
    this.runState.reset();
    this.runState.applyItemModifiers(this.player.items || []);

    // Сбрасываем флаги
    this.needsRest = false;
    this.sessionCompleted = false; // Разрешаем начать новую ночь
    this.actionPoints = this.maxActionPoints + this.actionPointsBonus; // Восстанавливаем очки действий
    this.dailyActions = {
      paidStaminaRestore: false,
      paidMentalRestore: false
    };

    // Переходим к следующему дню
    this.day++;

    this.eventBus.emit('playerRested', {
      day: this.day,
      runState: this.runState.getState(),
      bedLevel,
      staminaRestore
    });

    return {
      success: true,
      day: this.day,
      bedLevel,
      staminaRestore,
      runState: this.runState.getState()
    };
  }

  /**
   * Улучшить навык (с пересчётом бонусов)
   * @param {string} skillId - ID навыка
   * @returns {Object} Результат
   */
  upgradeSkill(skillId) {
    const oldStaminaBonus = this.skillSystem.getStaminaBonus();
    const oldActionPointsBonus = this.actionPointsBonus;

    // Проверяем XP игрока
    const xpNeeded = this.player.stats.xp;
    const cost = this.skillSystem.getUpgradeCost(skillId);

    if (xpNeeded < cost) {
      return { success: false, reason: 'Недостаточно XP' };
    }

    // Прокачиваем навык
    const result = this.skillSystem.upgradeSkill(skillId, xpNeeded);
    if (!result.success) {
      return result;
    }

    // Списываем XP
    this.player.stats.xp -= cost;

    // Пересчитываем бонусы
    const newStaminaBonus = this.skillSystem.getStaminaBonus();
    const newActionPointsBonus = this.skillSystem.getActionPointsBonus();

    // Обновляем стамину (разница)
    const staminaDiff = newStaminaBonus - oldStaminaBonus;
    if (staminaDiff > 0) {
      this.player.stats.maxStamina += staminaDiff;
      this.player.stats.stamina = Math.min(
        this.player.stats.stamina + staminaDiff,
        this.player.stats.maxStamina
      );
    }

    // Обновляем actionPointsBonus
    const actionPointsDiff = newActionPointsBonus - oldActionPointsBonus;
    if (actionPointsDiff > 0) {
      this.actionPointsBonus = newActionPointsBonus;
      this.actionPoints += actionPointsDiff;
    }

    this.eventBus.emit('skillUpgraded', {
      skillId,
      newLevel: result.newLevel,
      staminaBonus: newStaminaBonus,
      actionPointsBonus: newActionPointsBonus
    });

    return {
      ...result,
      staminaBonus: newStaminaBonus,
      actionPointsBonus: newActionPointsBonus
    };
  }

  /**
   * Получить полное состояние игры (для GameContext)
   * @returns {Object}
   */
  getFullState() {
    return {
      game: this.getGameState(),
      action: this.getActionState(),
      hub: this.getHubState()
    };
  }

  /**
   * Получить состояние игры
   */
  getGameState() {
    const queueStats = this.deckManager.getStats();

    return {
      player: this.player,
      runState: this.runState.getState(),
      currentCard: this.currentCard,
      gameState: this.gameState,
      hubMode: this.hubMode,
      time: this.timeSystem.getTimeString(),
      remainingTurns: 24 - this.timeSystem.currentTurn,
      day: this.day,
      sessionStats: this.sessionStats,
      lastNightReason: this.lastNightReason,
      clientQueueStats: {
        total: queueStats.total,
        remaining: queueStats.remaining,
        current: queueStats.total > 0 ? queueStats.currentIndex + 1 : 0
      }
    };
  }

  /**
   * Получить состояние хаба (для HubScreen)
   * @returns {Object}
   */
  getHubState() {
    return {
      player: this.player,
      day: this.day,
      needsRest: this.needsRest,
      sessionCompleted: this.sessionCompleted,
      actionPoints: this.actionPoints,
      maxActionPoints: this.maxActionPoints,
      actionPointsBonus: this.actionPointsBonus,
      reputation: this.reputationSystem.getReputation(),
      skills: this.skillSystem.getSkills(),
      upgradeCosts: this.skillSystem.getUpgradeCosts(),
      canStartNight: !this.needsRest && !this.sessionCompleted,
      canRest: this.needsRest,
      inventory: this.player.items || [],
      shopItems: this.inventorySystem.getShopItems ? this.inventorySystem.getShopItems() : [],
      dailyActions: this.dailyActions
    };
  }

  /**
   * Получить состояние действий для UI
   */
  getActionState() {
    if (!this.interactionSession) return null;

    const state = this.interactionSession.getState();
    const clientId = this.currentCard?.clientData?.id || null;

    return {
      interactionState: {
        started: !state.isFinished,
        finished: state.isFinished,
        actionsTaken: state.turn
      },
      currentActionCards: this.currentActionCards.map(card => ({ ...card })),
      edgeTension: state.edgeTension,
      tensionLevel: state.tensionLevel,
      actionHistory: state.actionHistory.map(entry => ({ ...entry })),
      actionUsage: { ...this.actionDeckSystem.currentClientUsage }  // ← Копия объекта!
    };
  }

  /**
   * Завершить ночь досрочно (побег)
   * Штраф зависит от % прошедших ходов (от денег сессии):
   * - 0-35% ходов: 15% от денег сессии
   * - 35-75% ходов: 30% от денег сессии
   * - 75-100% ходов: 45% от денег сессии
   * Репутация: -7 за каждого необслуженного клиента
   */
  endNightEarly(reason) {
    // Расчёт % прошедших ходов
    const totalTurns = 24;
    const turnsElapsed = this.timeSystem.currentTurn || 0;
    const turnsPercent = (turnsElapsed / totalTurns) * 100;

    // Определяем процент штрафа по тирам
    let moneyPenaltyPercent = 15;
    if (turnsPercent > 75) {
      moneyPenaltyPercent = 45;
    } else if (turnsPercent > 35) {
      moneyPenaltyPercent = 30;
    }

    // Штрафуем только деньги заработанные за сессию
    const sessionMoney = Math.floor(this.runState.totalEarned);
    const moneyLost = Math.floor(sessionMoney * (moneyPenaltyPercent / 100));

    // Вычитаем из денег игрока
    this.player.stats.money = Math.max(0, this.player.stats.money - moneyLost);

    // Потеря репутации за каждого необслуженного клиента
    const remainingClients = this.deckManager.getRemainingCount();
    const reputationLoss = remainingClients * 7;
    this.reputationSystem.addReputation(-reputationLoss);

    // Передаём данные о штрафах в endNight
    const penalties = {
      moneyLost,
      reputationLoss,
      moneyPenaltyPercent,
      sessionMoney,
      turnsPercent: Math.round(turnsPercent),
      remainingClients
    };

    this.endNight(reason, penalties);

    return {
      success: true,
      moneyLost,
      reputationLoss,
      remainingMoney: this.player.stats.money,
      turnsPercent: Math.round(turnsPercent),
      moneyPenaltyPercent,
      sessionMoney,
      remainingClients
    };
  }

  /**
   * Сохранить игру в localStorage
   */
  saveGame() {
    if (!this.player) return { success: false, reason: 'Нет игрока' };

    const saveData = {
      version: '0.6.0',
      timestamp: Date.now(),
      player: {
        ...this.player,
        stats: { ...this.player.stats },
        items: this.player.items || []
      },
      runState: this.runState.serialize(),
      day: this.day,
      needsRest: this.needsRest,
      sessionCompleted: this.sessionCompleted,
      actionPoints: this.actionPoints,
      maxActionPoints: this.maxActionPoints,
      actionPointsBonus: this.actionPointsBonus,
      dailyActions: this.dailyActions,
      reputation: this.reputationSystem.serialize(),
      skills: this.skillSystem.serialize(),
      inventory: this.inventorySystem.serialize(),
      clientMemory: this.clientMemorySystem.serialize(),
      sizeSystem: this.sizeSystem.serialize(),
      timeSystem: this.timeSystem.serialize(),
      // Сохранение текущей interaction сессии (если есть)
      interactionSession: this.interactionSession ? this.interactionSession.serialize() : null
    };

    try {
      localStorage.setItem('gloryhole_quest_save', JSON.stringify(saveData));
      Logger.info('Save', 'Игра сохранена успешно');
      return { success: true };
    } catch (e) {
      Logger.error('Save', `Ошибка сохранения: ${e.message}`);
      return { success: false, reason: e.message };
    }
  }

  /**
   * Загрузить игру из localStorage
   */
  loadGame() {
    try {
      const saveString = localStorage.getItem('gloryhole_quest_save');
      if (!saveString) {
        Logger.info('Load', 'Нет сохранённых данных');
        return { success: false, reason: 'Нет сохранений' };
      }

      const saveData = JSON.parse(saveString);
      Logger.info('Load', `Загрузка сохранения v${saveData.version}`);

      // Восстанавливаем игрока
      this.player = saveData.player;

      // Восстанавливаем runState
      if (saveData.runState) {
        this.runState.deserialize(saveData.runState);
      } else {
        this.runState = new RunState();
      }

      // Восстанавливаем прогресс
      this.day = saveData.day || 1;
      this.needsRest = saveData.needsRest || false;
      this.sessionCompleted = saveData.sessionCompleted || false;
      this.actionPoints = saveData.actionPoints || (this.maxActionPoints + this.actionPointsBonus);
      this.maxActionPoints = saveData.maxActionPoints || 3;
      this.actionPointsBonus = saveData.actionPointsBonus || 0;
      this.dailyActions = saveData.dailyActions || { paidStaminaRestore: false, paidMentalRestore: false };

      // Восстанавливаем системы
      this.reputationSystem.deserialize(saveData.reputation);
      this.skillSystem.deserialize(saveData.skills);
      this.inventorySystem.deserialize(saveData.inventory);
      this.clientMemorySystem.deserialize(saveData.clientMemory);
      this.sizeSystem.deserialize(saveData.sizeSystem);
      this.timeSystem.deserialize(saveData.timeSystem);

      // Восстанавливаем interaction сессию (если была)
      if (saveData.interactionSession) {
        this.interactionSession = new InteractionSession({}, this.player);
        this.interactionSession.deserialize(saveData.interactionSession);
        // Восстанавливаем currentCard из сессии
        const client = this.interactionSession.client;
        const visualAssessment = this.clientGenerator.sizeSystem.getAssessment(client.sizeCm, 0);
        this.currentCard = {
          id: client.id,
          clientData: client,
          text: this.clientGenerator.generateSensualDescription(client, visualAssessment),
          tags: ['client', client.size?.id || client.size?.key || 'average', client.type?.id || 'unknown']
        };
        // Получаем фазу arousal из восстановленной сессии
        const arousalPhase = this.interactionSession.getArousalPhase(client.arousal || 0).id;
        // Проверяем был ли осмотр
        const clientMemory = this.clientMemorySystem.getKnownClient(client.id);
        const isInspected = clientMemory?.wasInspected || false;
        // Получаем номер текущего хода из сессии
        const currentTurnNumber = this.interactionSession.turn || 1;
        // Генерируем карты действий для продолжения с учётом фазы
        this.currentActionCards = this.actionDeckSystem.generateActionCards(
          client,
          this.player,
          this.skillSystem,
          client.id,
          currentTurnNumber  // Передаём текущий номер хода
        );
      }

      // Сбрасываем состояние
      this.gameState = 'hub';
      this.hubMode = true;
      this.needsRest = false;
      
      if (!this.interactionSession) {
        // Если нет сессии — сбрасываем
        this.currentActionCards = [];
        this.currentClientIndex = 0;
        this.resetSessionStats();
      }

      Logger.info('Load', 'Игра загружена успешно');
      this.eventBus.emit('gameLoaded', { saveData });

      return { success: true, saveData };
    } catch (e) {
      Logger.error('Load', `Ошибка загрузки: ${e.message}`);
      return { success: false, reason: e.message };
    }
  }

  /**
   * Удалить сохранение
   */
  deleteSave() {
    try {
      localStorage.removeItem('gloryhole_quest_save');
      Logger.info('Save', 'Сохранение удалено');
      return { success: true };
    } catch (e) {
      Logger.error('Save', `Ошибка удаления: ${e.message}`);
      return { success: false, reason: e.message };
    }
  }

  /**
   * Проверить наличие сохранения
   */
  hasSave() {
    return !!localStorage.getItem('gloryhole_quest_save');
  }

  /**
   * Восстановить стамину за деньги (1 раз в день)
   * @param {number} amount - Сколько стамины восстановить
   * @returns {Object} Результат
   */
  restoreStamina(amount) {
    const cost = 20;
    
    // Проверка дневного лимита
    if (this.dailyActions.paidStaminaRestore) {
      return { success: false, reason: 'Уже восстанавливали сегодня (1 раз в день)' };
    }
    
    if (this.player.stats.money < cost) {
      return { success: false, reason: 'Недостаточно денег' };
    }
    if (this.player.stats.stamina >= this.player.stats.maxStamina) {
      return { success: false, reason: 'Стамина полная' };
    }

    this.player.stats.money -= cost;
    const actualRestore = Math.min(amount, this.player.stats.maxStamina - this.player.stats.stamina);
    this.player.stats.stamina += actualRestore;

    // Также восстанавливаем в runState
    this.runState.modifyStamina(actualRestore);
    
    // Устанавливаем флаг дневного лимита
    this.dailyActions.paidStaminaRestore = true;

    return {
      success: true,
      restored: actualRestore,
      cost,
      remainingMoney: this.player.stats.money
    };
  }

  /**
   * Восстановить психику за деньги (1 раз в день)
   * @param {number} amount - Сколько психики восстановить
   * @returns {Object} Результат
   */
  restoreMentalHealth(amount) {
    const cost = 30;
    
    // Проверка дневного лимита
    if (this.dailyActions.paidMentalRestore) {
      return { success: false, reason: 'Уже восстанавливали сегодня (1 раз в день)' };
    }
    
    if (this.player.stats.money < cost) {
      return { success: false, reason: 'Недостаточно денег' };
    }
    if (this.player.stats.mental_health >= this.player.stats.maxMentalHealth) {
      return { success: false, reason: 'Психика полная' };
    }

    this.player.stats.money -= cost;
    const actualRestore = Math.min(amount, this.player.stats.maxMentalHealth - this.player.stats.mental_health);
    this.player.stats.mental_health += actualRestore;

    // Также восстанавливаем в runState
    this.runState.modifyMental(actualRestore);
    
    // Устанавливаем флаг дневного лимита
    this.dailyActions.paidMentalRestore = true;

    return {
      success: true,
      restored: actualRestore,
      cost,
      remainingMoney: this.player.stats.money
    };
  }

  /**
   * Выполнить домашнее действие
   * @param {string} actionId - ID действия
   * @returns {Object} Результат
   */
  performHomeAction(actionId) {
    if (this.actionPoints < 1) {
      return { success: false, reason: 'Нет очков действий' };
    }

    const actions = {
      relax: {
        name: 'Расслабиться',
        cost: 1,  // Тратит 1 очко действия
        effect: () => {
          this.runState.modifyMental(20);
          this.player.stats.mental_health = Math.min(
            this.player.stats.maxMentalHealth,
            this.player.stats.mental_health + 20
          );
          this.runState.modifyStamina(10);
          this.player.stats.stamina = Math.min(
            this.player.stats.maxStamina,
            this.player.stats.stamina + 10
          );
          return '+20 🧠 +10 💪';
        }
      },
      masturbation: {
        name: 'Ласка',
        cost: 1,
        effect: () => {
          this.runState.modifyMental(40);
          this.player.stats.mental_health = Math.min(
            this.player.stats.maxMentalHealth,
            this.player.stats.mental_health + 40
          );
          return '+40 🧠';
        }
      },
      play_cat: {
        name: 'Играть с котом',
        requiresItem: 'cat',
        cost: 1,
        effect: () => {
          this.runState.modifyStamina(30);
          this.runState.modifyMental(20);
          this.player.stats.stamina = Math.min(
            this.player.stats.maxStamina,
            this.player.stats.stamina + 30
          );
          this.player.stats.mental_health = Math.min(
            this.player.stats.maxMentalHealth,
            this.player.stats.mental_health + 20
          );
          return '+30 💪 +20 🧠';
        }
      },
      erotic_chat: {
        name: 'Эротический чат',
        cost: 1,
        effect: () => {
          this.runState.modifyMental(25);
          this.runState.modifyStamina(15);
          this.player.stats.mental_health = Math.min(
            this.player.stats.maxMentalHealth,
            this.player.stats.mental_health + 25
          );
          this.player.stats.stamina = Math.min(
            this.player.stats.maxStamina,
            this.player.stats.stamina + 15
          );
          return '+25 🧠 +15 💪';
        }
      }
    };

    const action = actions[actionId];
    if (!action) {
      return { success: false, reason: 'Действие не найдено' };
    }

    // Проверка требования предмета
    if (action.requiresItem && !this.inventorySystem.hasItem(action.requiresItem)) {
      return { success: false, reason: `Нужен предмет: ${action.requiresItem}` };
    }

    // Применяем эффект
    const effectText = action.effect();
    
    // Тратим очко действия
    this.actionPoints--;

    this.eventBus.emit('homeActionPerformed', {
      actionId,
      actionName: action.name,
      effect: effectText
    });

    return {
      success: true,
      action: action.name,
      effect: effectText,
      remainingActionPoints: this.actionPoints
    };
  }

  /**
   * Купить предмет
   * @param {string} itemId - ID предмета
   * @returns {Object} Результат
   */
  buyItem(itemId) {
    if (!this.player) {
      return { success: false, reason: 'Нет игрока' };
    }

    const result = this.inventorySystem.buyItem(itemId, this.player.stats.money);
    if (!result.success) {
      return result;
    }

    // Списываем деньги
    this.player.stats.money -= result.cost;

    // Добавляем в player.items для сохранения
    if (!this.player.items) {
      this.player.items = [];
    }
    this.player.items.push(itemId);

    this.eventBus.emit('itemPurchased', {
      itemId,
      itemName: result.item.name,
      cost: result.cost
    });

    return {
      success: true,
      item: result.item,
      cost: result.cost,
      remainingMoney: this.player.stats.money
    };
  }
}

export default GameEngine;
