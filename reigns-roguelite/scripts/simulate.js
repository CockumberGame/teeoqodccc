/**
 * Скрипт симуляции баланса для Gloryhole Quest v0.7
 * Запускает 1000 автоматических ночей и собирает статистику
 *
 * Запуск: npm run simulate
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Импортируем GameEngine
import GameEngine from '../src/engine/GameEngine.js';

console.log('🎮 Gloryhole Quest — Симуляция баланса v0.7');
console.log('============================================\n');

const SIMULATION_COUNT = 1000;

const stats = {
  totalNights: 0,
  completedNights: 0,
  earlyExits: 0,

  // Статистика по встречам
  avgClientsPerNight: 0,
  avgTurnsPerClient: 0,
  avgArousalPerAction: 0,

  // Экономика
  avgMoneyEarned: 0,
  avgXpEarned: 0,

  // Ресурсы
  avgStaminaSpent: 0,
  avgMentalSpent: 0,

  // Завершения
  climaxFinishes: 0,
  patienceFailures: 0,
  earlyFinishes: 0,

  // Рекорды
  bestNight: { money: 0, clients: 0 },
  worstNight: { money: Infinity, clients: Infinity }
};

const allNightsData = [];

function simulateNight() {
  const engine = new GameEngine();

  // Инициализация игрока
  engine.initPlayer('Симуляция');

  // Начало ночи
  const startResult = engine.startNightSession();

  if (!startResult.success) {
    return null;
  }

  const nightData = {
    turns: 0,
    clientsServed: 0,
    moneyEarned: 0,
    xpEarned: 0,
    staminaSpent: 0,
    mentalSpent: 0,
    finishes: {
      climax: 0,
      patience: 0,
      early: 0
    },
    arousalPerAction: []
  };

  const startMoney = engine.player.stats.money;
  const startStamina = engine.runState.stamina;
  const startMental = engine.runState.mental_health;

  let actionsTaken = 0;
  const maxActionsPerNight = 100; // Защита от бесконечного цикла

  // Игровой цикл ночи
  while (engine.gameState === 'playing' && engine.interactionSession && actionsTaken < maxActionsPerNight) {
    const session = engine.interactionSession;

    // Если есть карты действий
    if (engine.currentActionCards && engine.currentActionCards.length > 0) {
      // Выбираем случайное действие
      const actionIndex = Math.floor(Math.random() * engine.currentActionCards.length);
      const action = engine.currentActionCards[actionIndex];

      // Запоминаем arousal gain для статистики (v0.7: в effects.arousal)
      if (action.effects && action.effects.arousal) {
        nightData.arousalPerAction.push(action.effects.arousal);
      }

      // Делаем ход
      const result = engine.playActionCard(actionIndex);

      actionsTaken++;
      nightData.turns++;

      if (result.success) {
        // v0.7: стоимость в effects.stamina
        nightData.staminaSpent += action.effects?.stamina || 5;
        nightData.mentalSpent += action.effects?.mental || 1;
      }

      // Проверка: если действие не удалось из-за нехватки стамины — выход
      if (!result.success && result.reason && result.reason.includes('стамин')) {
        break;
      }
    } else {
      // Нет карт действий — проверяем, не конец ли ночи
      if (!engine.hasMoreClients || !engine.currentCard) {
        break;
      }
    }
  }

  // Сбор статистики
  const endMoney = engine.player.stats.money;

  nightData.moneyEarned = endMoney - startMoney;
  nightData.xpEarned = engine.player.stats.xp - (engine.player.stats.xp_at_start || 0);
  nightData.clientsServed = engine.sessionStats?.clientsServed || 0;

  // Подсчёт типов завершений
  nightData.finishes.climax = engine.sessionStats?.satisfiedClients || 0;
  nightData.finishes.early = engine.sessionStats?.earlyFinishes || 0;
  nightData.finishes.patience = nightData.clientsServed - nightData.finishes.climax - nightData.finishes.early;

  return nightData;
}

// Запуск симуляции
console.log(`🔄 Запуск ${SIMULATION_COUNT} симуляций ночей...\n`);

for (let i = 0; i < SIMULATION_COUNT; i++) {
  const nightData = simulateNight();
  
  if (!nightData) continue;
  
  allNightsData.push(nightData);
  stats.totalNights++;
  
  // Обновление статистики
  stats.avgClientsPerNight += nightData.clientsServed;
  stats.avgTurnsPerClient += nightData.turns / Math.max(1, nightData.clientsServed);
  stats.avgMoneyEarned += nightData.moneyEarned;
  stats.avgXpEarned += nightData.xpEarned;
  stats.avgStaminaSpent += nightData.staminaSpent;
  stats.avgMentalSpent += nightData.mentalSpent;
  
  if (nightData.arousalPerAction.length > 0) {
    const avgArousal = nightData.arousalPerAction.reduce((a, b) => a + b, 0) / nightData.arousalPerAction.length;
    stats.avgArousalPerAction += avgArousal;
  }
  
  // Завершения
  stats.climaxFinishes += nightData.finishes.climax;
  stats.patienceFailures += nightData.finishes.patience;
  stats.earlyFinishes += nightData.finishes.early;
  
  // Рекорды
  if (nightData.moneyEarned > stats.bestNight.money) {
    stats.bestNight.money = nightData.moneyEarned;
  }
  if (nightData.clientsServed > stats.bestNight.clients) {
    stats.bestNight.clients = nightData.clientsServed;
  }
  if (nightData.moneyEarned < stats.worstNight.money) {
    stats.worstNight.money = nightData.moneyEarned;
  }
  if (nightData.clientsServed < stats.worstNight.clients) {
    stats.worstNight.clients = nightData.clientsServed;
  }
  
  if ((i + 1) % 200 === 0) {
    console.log(`  Прогресс: ${i + 1}/${SIMULATION_COUNT}`);
  }
}

// Усреднение
if (stats.totalNights > 0) {
  stats.avgClientsPerNight = Math.round(stats.avgClientsPerNight / stats.totalNights * 100) / 100;
  stats.avgTurnsPerClient = Math.round(stats.avgTurnsPerClient / stats.totalNights * 100) / 100;
  stats.avgMoneyEarned = Math.round(stats.avgMoneyEarned / stats.totalNights);
  stats.avgXpEarned = Math.round(stats.avgXpEarned / stats.totalNights);
  stats.avgStaminaSpent = Math.round(stats.avgStaminaSpent / stats.totalNights);
  stats.avgMentalSpent = Math.round(stats.avgMentalSpent / stats.totalNights);
  stats.avgArousalPerAction = Math.round(stats.avgArousalPerAction / stats.totalNights * 100) / 100;
  
  const totalFinishes = stats.climaxFinishes + stats.patienceFailures + stats.earlyFinishes;
  stats.climaxFinishes = Math.round(stats.climaxFinishes / totalFinishes * 100);
  stats.patienceFailures = Math.round(stats.patienceFailures / totalFinishes * 100);
  stats.earlyFinishes = Math.round(stats.earlyFinishes / totalFinishes * 100);
}

// Вывод результатов
console.log('\n📊 Результаты симуляции\n');
console.log('═══════════════════════════════════════════\n');

console.log('📈 ОБЩАЯ СТАТИСТИКА:');
console.log(`  Всего ночей: ${stats.totalNights}`);
console.log(`  Среднее клиентов за ночь: ${stats.avgClientsPerNight}`);
console.log(`  Среднее ходов на клиента: ${stats.avgTurnsPerClient}\n`);

console.log('💰 ЭКОНОМИКА:');
console.log(`  Средний заработок: ${stats.avgMoneyEarned}$`);
console.log(`  Средний опыт: ${stats.avgXpEarned} XP\n`);

console.log('⚡ РЕСУРСЫ:');
console.log(`  Средняя трата стамины: ${stats.avgStaminaSpent}`);
console.log(`  Средняя трата психики: ${stats.avgMentalSpent}\n`);

console.log('🎯 ЗАВЕРШЕНИЯ ВСТРЕЧ:');
console.log(`  Кульминация (climax ≥75%): ${stats.climaxFinishes}%`);
console.log(`  Нетерпение (patience ≤0): ${stats.patienceFailures}%`);
console.log(`  Досрочно (игрок выбрал): ${stats.earlyFinishes}%\n`);

console.log('🏆 РЕКОРДЫ:');
console.log(`  Лучшая ночь (деньги): ${stats.bestNight.money}$`);
console.log(`  Лучшая ночь (клиенты): ${stats.bestNight.clients}`);
console.log(`  Худшая ночь (деньги): ${stats.worstNight.money}$`);
console.log(`  Худшая ночь (клиенты): ${stats.worstNight.clients}\n`);

console.log('═══════════════════════════════════════════\n');

// Рекомендации по балансу
console.log('💡 РЕКОМЕНДАЦИИ ПО БАЛАНСУ:\n');

// Проверка climax
if (stats.climaxFinishes < 50) {
  console.log('  ⚠️  Мало кульминаций! Меньше 50%');
  console.log('     → Увеличить baseArousalGain в actions.json');
  console.log('     → Снизить climaxThreshold в balance.json\n');
} else if (stats.climaxFinishes > 85) {
  console.log('  ⚠️  Слишком много кульминаций! Больше 85%');
  console.log('     → Уменьшить baseArousalGain');
  console.log('     → Увеличить climaxThreshold\n');
} else {
  console.log('  ✅ Баланс кульминаций в норме\n');
}

// Проверка ходов на клиента
if (stats.avgTurnsPerClient < 3) {
  console.log('  ⚠️  Короткие встречи! Меньше 3 ходов в среднем');
  console.log('     → Уменьшить baseArousalGain');
  console.log('     → Увеличить patience клиентов\n');
} else if (stats.avgTurnsPerClient > 7) {
  console.log('  ⚠️  Длинные встречи! Больше 7 ходов в среднем');
  console.log('     → Увеличить baseArousalGain');
  console.log('     → Уменьшить patience клиентов\n');
} else {
  console.log('  ✅ Длина встреч в норме (3-7 ходов)\n');
}

// Проверка экономики
if (stats.avgMoneyEarned < 50) {
  console.log('  ⚠️  Мало денег! Игроки не смогут прокачиваться');
  console.log('     → Увеличить baseReward в balance.json');
  console.log('     → Увеличить sizeBonus\n');
} else if (stats.avgMoneyEarned > 200) {
  console.log('  ⚠️  Много денег! Прокачка слишком быстрая');
  console.log('     → Уменьшить baseReward');
  console.log('     → Добавить расходы\n');
} else {
  console.log('  ✅ Экономика в норме\n');
}

console.log('═══════════════════════════════════════════');
console.log(`\n✅ Симуляция завершена!`);

// Сохранение результатов
const resultsPath = resolve(projectRoot, 'simulation_results.json');
writeFileSync(resultsPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  simulationCount: SIMULATION_COUNT,
  stats,
  allRunsData: allNightsData
}, null, 2));

console.log(`\n📁 Результаты сохранены в: ${resultsPath}`);
