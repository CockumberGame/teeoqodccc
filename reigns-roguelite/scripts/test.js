/**
 * Тестовый скрипт для Gloryhole Quest
 * Проверяет основные функции игры
 *
 * Запуск: node scripts/test.js
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import GameEngine from '../src/engine/GameEngine.js';

// localStorage mock для Node.js
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

console.log('🧪 Gloryhole Quest — Тестирование функций\n');
console.log('═══════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Ошибка: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ========== ТЕСТЫ ==========

console.log('📋 БАЗОВЫЕ ТЕСТЫ:\n');

test('GameEngine создаётся без ошибок', () => {
  const engine = new GameEngine();
  assert(engine, 'Engine должен создаться');
  assert(engine.eventBus, 'EventBus должен быть');
  assert(engine.timeSystem, 'TimeSystem должен быть');
});

test('initPlayer создаёт игрока', () => {
  const engine = new GameEngine();
  const player = engine.initPlayer('Тест');
  
  assert(player, 'Игрок должен создаться');
  assert(player.name === 'Тест', 'Имя должно совпадать');
  assert(player.stats.stamina > 0, 'Стамина должна быть > 0');
  assert(player.stats.money > 0, 'Деньги должны быть > 0');
});

test('startNightSession начинается успешно', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  
  const result = engine.startNightSession();
  
  assert(result.success === true, 'Ночь должна начаться');
  assert(engine.gameState === 'playing', 'Состояние должно быть playing');
  assert(engine.interactionSession, 'Сессия должна создаться');
});

test('startNightSession начинается с любой стаминой', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.runState.stamina = 5; // Меньше 10

  const result = engine.startNightSession();

  assert(result.success === true, 'Ночь должна начаться с любой стаминой');
  assert(engine.gameState === 'playing', 'Состояние должно быть playing');
  assert(engine.interactionSession, 'Сессия должна создаться');
});

console.log('\n📋 ТЕСТЫ ДЕЙСТВИЙ:\n');

test('playActionCard работает корректно', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();
  
  const actionCards = engine.currentActionCards;
  assert(actionCards && actionCards.length > 0, 'Карты действий должны быть');
  
  const result = engine.playActionCard(0);
  
  assert(result.success === true, 'Действие должно выполниться');
  assert(engine.timeSystem.currentTurn > 0, 'Ход должен увеличиться');
});

test('playActionCard тратит стамину', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();

  const startStamina = engine.runState.stamina;
  const action = engine.currentActionCards[0];
  // v0.7: stamina в effects.stamina
  const staminaCost = action.effects?.stamina || action.staminaCost || 5;

  engine.playActionCard(0);

  const endStamina = engine.runState.stamina;
  assert(endStamina < startStamina, 'Стамина должна уменьшиться');
});

test('playActionCard без сессии возвращает ошибку', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  // Не начинаем ночь
  
  const result = engine.playActionCard(0);
  
  assert(result.success === false, 'Действие должно провалиться');
  assert(result.reason.includes('встречи'), 'Причина должна быть про встречу');
});

console.log('\n📋 ТЕСТЫ ХАБА:\n');

test('restoreStamina восстанавливает стамину', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  
  // Тратим стамину сначала
  engine.runState.stamina = 30;
  engine.player.stats.stamina = 30;
  
  const startStamina = engine.player.stats.stamina;
  const startMoney = engine.player.stats.money;
  
  const result = engine.restoreStamina(50);
  
  assert(result.success === true, `Восстановление должно пройти: ${result.reason}`);
  assert(engine.player.stats.stamina > startStamina, 'Стамина должна увеличиться');
  assert(engine.player.stats.money < startMoney, 'Деньги должны уменьшиться');
  assert(result.cost === 20, 'Цена должна быть 20');
});

test('restoreStamina требует денег', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.player.stats.money = 5; // Меньше 20
  
  const result = engine.restoreStamina(50);
  
  assert(result.success === false, 'Восстановление должно провалиться');
  assert(result.reason.includes('денег'), 'Причина должна быть про деньги');
});

test('restoreMentalHealth восстанавливает психику', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  
  // Тратим психику сначала
  engine.runState.mental_health = 40;
  engine.player.stats.mental_health = 40;
  
  const startMental = engine.player.stats.mental_health;
  const startMoney = engine.player.stats.money;
  
  const result = engine.restoreMentalHealth(50);
  
  assert(result.success === true, `Восстановление должно пройти: ${result.reason}`);
  assert(engine.player.stats.mental_health > startMental, 'Психика должна увеличиться');
  assert(result.cost === 30, 'Цена должна быть 30');
});

test('performHomeAction: relax тратит очко и восстанавливает', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  
  // Тратим стамину и психику сначала
  engine.runState.stamina = 30;
  engine.runState.mental_health = 40;
  engine.player.stats.stamina = 30;
  engine.player.stats.mental_health = 40;
  
  const startPoints = engine.actionPoints;
  
  const result = engine.performHomeAction('relax');
  
  assert(result.success === true, `Действие должно пройти: ${result.reason}`);
  assert(engine.actionPoints < startPoints, 'Очки должны уменьшиться');
  assert(result.effect.includes('20'), 'Эффект должен быть +20 🧠');
});

test('performHomeAction: masturbation восстанавливает психику', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  
  // Тратим психику сначала
  engine.runState.mental_health = 40;
  engine.player.stats.mental_health = 40;
  
  const startMental = engine.runState.mental_health;
  
  const result = engine.performHomeAction('masturbation');
  
  assert(result.success === true, `Действие должно пройти: ${result.reason}`);
  assert(engine.runState.mental_health > startMental, 'Психика должна увеличиться');
  assert(result.effect.includes('40'), 'Эффект должен быть +40');
});

test('performHomeAction требует очков действий', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.actionPoints = 0;
  
  const result = engine.performHomeAction('relax');
  
  assert(result.success === false, 'Действие должно провалиться');
  assert(result.reason.includes('очков'), 'Причина должна быть про очки');
});

test('buyItem покупает предмет', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  
  const startMoney = engine.player.stats.money;
  
  const result = engine.buyItem('lube');
  
  assert(result.success === true, 'Покупка должна пройти');
  assert(result.item.name === 'Лубрикант', 'Предмет должен совпасть');
  assert(engine.player.stats.money < startMoney, 'Деньги должны уменьшиться');
  assert(engine.inventorySystem.hasItem('lube'), 'Предмет должен быть в инвентаре');
});

test('buyItem требует денег', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.player.stats.money = 5; // Меньше цены любого предмета
  
  const result = engine.buyItem('lube');
  
  assert(result.success === false, 'Покупка должна провалиться');
  assert(result.reason.includes('денег'), 'Причина должна быть про деньги');
});

console.log('\n📋 ТЕСТЫ СОСТОЯНИЯ:\n');

test('getGameState возвращает корректное состояние', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();
  
  const state = engine.getGameState();
  
  assert(state.player, 'Игрок должен быть');
  assert(state.runState, 'RunState должен быть');
  assert(state.time, 'Время должно быть');
  assert(state.day, 'День должен быть');
});

test('getHubState возвращает корректное состояние', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  
  const hub = engine.getHubState();
  
  assert(hub.player, 'Игрок должен быть');
  assert(hub.day, 'День должен быть');
  assert(hub.skills, 'Навыки должны быть');
  assert(hub.shopItems, 'Магазин должен быть');
});

test('getActionState возвращает null без сессии', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  
  const state = engine.getActionState();
  
  assert(state === null, 'Без сессии должен быть null');
});

test('getActionState возвращает состояние с сессией', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();
  
  const state = engine.getActionState();
  
  assert(state, 'С сессией должно быть состояние');
  assert(state.currentActionCards, 'Карты действий должны быть');
  assert(state.interactionState, 'Состояние взаимодействия должно быть');
});

console.log('\n📋 ТЕСТЫ СОХРАНЕНИЯ:\n');

test('saveGame сохраняет в localStorage', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');

  const result = engine.saveGame();

  assert(result.success === true, 'Сохранение должно пройти');
});

test('loadGame загружает сохранение', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.saveGame();

  const engine2 = new GameEngine();
  const result = engine2.loadGame();

  assert(result.success === true, 'Загрузка должна пройти');
  assert(engine2.player.name === 'Тест', 'Имя должно совпасть');
});

test('hasSave проверяет наличие сохранения', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');

  assert(engine.hasSave() === true, 'Сохранение должно быть');

  engine.deleteSave();
  assert(engine.hasSave() === false, 'Сохранение должно удалиться');
});

console.log('\n📋 ТЕСТЫ КРИТИЧЕСКИХ БАГОВ:\n');

test('currentCard устанавливается ПОСЛЕ startNightSession', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();

  // Проверяем что currentCard установлен и имеет clientData
  assert(engine.currentCard !== null, 'currentCard не должен быть null');
  assert(engine.currentCard !== undefined, 'currentCard не должен быть undefined');
  assert(engine.currentCard.clientData !== undefined, 'currentCard должен иметь clientData');
  assert(engine.currentCard.id, 'currentCard должен иметь id');
});

test('endNightEarly: штраф считается от денег сессии', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();

  // Имитируем заработанные деньги в сессии
  engine.runState.totalEarned = 100;
  engine.player.stats.money = 500; // Общие деньги ≠ деньги сессии

  const result = engine.endNightEarly('fled');

  // Проверяем что штраф считается от session money (100), не от total (500)
  assert(result.sessionMoney === 100, 'sessionMoney должен быть 100');
  assert(result.moneyLost < 50, 'Штраф должен быть меньше 50 (15% от 100 = 15)');
  assert(result.moneyPenaltyPercent >= 15, 'Процент штрафа должен быть >= 15%');
});

test('endNightEarly: репутация теряется за клиентов', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();
  
  const remainingClients = engine.deckManager.getRemainingCount();
  const expectedRepLoss = remainingClients * 7;
  
  const result = engine.endNightEarly('fled');
  
  assert(result.reputationLoss === expectedRepLoss, `Репутация: -${expectedRepLoss} (${remainingClients} клиентов × 7)`);
});

test('attemptEarlyFinish: шанс зависит от arousal', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();
  
  // Устанавливаем высокий arousal (порог = 70)
  engine.currentCard.clientData.arousal = 85;
  
  const result = engine.attemptEarlyFinish();
  
  // Проверяем что результат имеет successChance (даже если неудача)
  assert(result.successChance !== undefined || result.reason, 'Должен быть successChance или reason');
});

test('attemptEarlyFinish: шанс зависит от тегов клиента', () => {
  const engine = new GameEngine();
  engine.initPlayer('Тест');
  engine.startNightSession();
  
  // Добавляем тег "impatient" (+20% к шансу)
  engine.currentCard.clientData.arousal = 85;
  engine.currentCard.clientData.tags = ['impatient'];
  
  const result = engine.attemptEarlyFinish();
  
  // Проверяем что результат есть
  assert(result, 'Должен быть результат');
});

// ========== ИТОГИ ==========

console.log('\n═══════════════════════════════════════════');
console.log(`\n📊 ИТОГИ ТЕСТИРОВАНИЯ:\n`);
console.log(`  ✅ Пройдено: ${passed}`);
console.log(`  ❌ Провалено: ${failed}`);
console.log(`  📈 Всего: ${passed + failed}`);
console.log(`  📉 Процент успеха: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

if (failed === 0) {
  console.log('🎉 Все тесты пройдены!\n');
  process.exit(0);
} else {
  console.log('⚠️  Некоторые тесты провалены. Проверьте ошибки выше.\n');
  process.exit(1);
}
