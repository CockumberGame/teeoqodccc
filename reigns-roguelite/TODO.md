# 📋 TODO — Gloryhole Quest v0.1.0

**Дата создания:** 25 марта 2026 г.
**Статус:** 🔄 В работе
**Приоритет:** Критические баги → Баланс → Геймплей → Мета-прогрессия

---

## ✅ СДЕЛАНО В СЕССИИ #7 (25 марта 2026)

### Исправлено:
- [x] actionUsage передаётся в UI
- [x] climax threshold = 90 (вместо 95)
- [x] endNightEarly() с penalties в UI
- [x] playerStamina prop в CardView
- [x] Сброс usage между клиентами работает
- [x] Исправлен двойной префикс returning_returning_
- [x] getArousalPhase(100) работает корректно
- [x] Убрана строка "Потрачено" из UI

### Обновлены файлы:
- `src/engine/GameEngine.js` — actionUsage, finishInteraction, climax threshold
- `src/system/ClientGenerator.js` — arousalPhases, createReturningClientCard
- `src/core/InteractionSession.js` — arousal, finishInteraction
- `src/context/GameContext.jsx` — climaxChosen event, penalties
- `src/ui/GameScreen.jsx` — playerStamina prop, деньги сессии
- `src/ui/CardView.jsx` — playerStamina проверка
- `src/ui/NightSummaryOverlay.jsx` — штрафы
- `src/system/ClimaxSystem.js` — CLIMAX_THRESHOLD
- `src/data/balance.json` — climaxThreshold: 90, arousal phases
- `src/data/content/actions.json` — arousal: 28/42/60/80

### Обновлены документы:
- `package.json` — version 0.1.0
- `TODO.md` — создан с полным планом
- `QUICK_START.md` — обновлён до v0.1.0

### Результаты:
- ✅ 27/27 тестов проходят
- ✅ Сборка успешна
- ✅ Критические баги исправлены

---

## 🎯 ОБЗОР ВЕРСИИ 0.1.0

**Цель:** Исправление критических проблем геймплея на основе фидбека пользователей

**Ключевые проблемы:**
1. ❌ Лимиты действий не сбрасываются между клиентами
2. ❌ Все карты одинаковы по эффективности
3. ❌ Карта "Осмотреть клиента" не выпадает
4. ❌ Нет ощущения "боя" (психика не используется)
5. ❌ "Завершить раньше" не работает
6. ❌ Предметы не применяются в сессии
7. ❌ Награды не понятны игроку
8. ❌ Шанс успеха 95% всегда (нет риска)

---

## 🔴 ПРИОРИТЕТ 1: КРИТИЧЕСКИЕ БАГИ

### 1.1. Сброс actionUsage между клиентами

**Проблема:**
```
Игрок использует 3 действия на Клиенте 1 → 
На Клиенте 2 нет доступных действий (лимит исчерпан)
```

**Причина:** `InteractionSession` не сбрасывает `usage` при `startNextInteraction()`

**Решение:**
```javascript
// src/core/InteractionSession.js
startNextInteraction(clientData) {
  this.currentClient = this._createClientSession(clientData);
  this.usageTracker = {}; // ← СБРОС СЧЁТЧИКОВ
  this._edgeStackAppliedThisTurn = false;
  // ...
}
```

**Файлы для изменения:**
- [ ] `src/core/InteractionSession.js` — сброс `usageTracker`

**Тест:**
```
1. Использовать 3 действия на клиенте 1
2. Завершить клиента 1
3. Проверить: на клиенте 2 доступны все действия
```

---

### 1.2. Карта "Осмотреть клиента" гарантированно выпадает

**Проблема:** На 1 уровне карта не выпадает вообще

**Решение (2 варианта):**

**Вариант A:** Гарантированная карта на 1-2 ходу
```javascript
// src/system/ActionDeckSystem.js
generateActionCards(client, player, turn) {
  if (turn <= 2 && !this._hasInspected) {
    // Гарантировать inspect карту
    cards[0] = this._createInspectCard(client);
  }
  // ...
}
```

**Вариант B:** Inspect как отдельная категория действий
```json
// src/data/content/actions.json
"inspect_basic": {
  "name": "Осмотреть клиента",
  "category": "inspect",
  "effects": { "arousal": 0, "stamina": 0, "mental": 0 },
  "guaranteed": true,
  "guaranteedTurns": [1, 2]
}
```

**Файлы для изменения:**
- [ ] `src/data/content/actions.json` — добавить inspect действия
- [ ] `src/system/ActionDeckSystem.js` — логика гарантированной карты
- [ ] `src/system/InspectionSystem.js` — интеграция

**Тест:**
```
1. Начать сессию с новым клиентом
2. Проверить: на ходу 1 или 2 выпадает "Осмотреть клиента"
3. После осмотра: фетиши клиента открыты
```

---

### 1.3. "Завершить раньше" — формула шанса

**Проблема:** Кнопка есть, но шанс не считается от навыков

**Текущая формула (не работает):**
```javascript
// Всегда success: true
```

**Новая формула:**
```javascript
// src/core/InteractionSession.js
attemptEarlyFinish(client, player) {
  const baseChance = 0.50; // 50% база
  
  // Навыки
  const oralBonus = Math.min(player.skills.oral?.level || 0, 10) * 0.03; // +3%/ур
  const teaseBonus = Math.min(player.skills.tease?.level || 0, 10) * 0.02; // +2%/ур
  
  // Arousal фаза
  const phaseBonus = {
    'soft': -0.30,      // -30% в начале
    'interested': -0.15,
    'excited': 0,
    'ready': +0.15,
    'edge': +0.25,
    'climax': +0.40     // +40% на финале
  }[this.currentClient.phase] || 0;
  
  // Предметы
  const itemBonus = this._calculateItemBonus(player.items);
  
  const totalChance = Math.max(0.15, Math.min(0.95, 
    baseChance + oralBonus + teaseBonus + phaseBonus + itemBonus
  ));
  
  const success = Math.random() < totalChance;
  
  return {
    success,
    chance: totalChance,
    reason: success ? 'Успех!' : 'Клиент не готов'
  };
}
```

**Файлы для изменения:**
- [ ] `src/core/InteractionSession.js` — `attemptEarlyFinish()`
- [ ] `src/ui/GameScreen.jsx` — отображение шанса в %

**Тест:**
```
1. На фазе "soft": шанс ~20-35%
2. На фазе "edge": шанс ~75-85%
3. С навыком Oral 5: +15% к шансу
```

---

### 1.4. Предметы работают в сессии

**Проблема:** Магазин есть, купить можно, но предметы не применяются

**Решение:**
```javascript
// src/core/InteractionSession.js
playAction(action, player) {
  // Применить эффекты предметов
  if (player.items) {
    for (const item of player.items) {
      if (item.effect?.onAction) {
        const modified = item.effect.onAction(action, this.currentClient);
        if (modified) action = modified;
      }
    }
  }
  
  // ... остальная логика
}
```

**Интеграция InventorySystem → ActionDeckSystem:**
```javascript
// src/system/ActionDeckSystem.js
_getAvailableActions(client, player) {
  let actions = [...baseActions];
  
  // Предметы могут добавлять действия
  if (player.items) {
    for (const item of player.items) {
      if (item.effect?.addActions) {
        actions = [...actions, ...item.effect.addActions];
      }
    }
  }
  
  return actions;
}
```

**Файлы для изменения:**
- [ ] `src/core/InteractionSession.js` — применение эффектов предметов
- [ ] `src/system/ActionDeckSystem.js` — предметы добавляют карты
- [ ] `src/system/InventorySystem.js` — проверить структуру данных
- [ ] `src/data/content/items.json` — эффекты предметов

**Тест:**
```
1. Купить предмет в магазине (например, "Лубрикант +10% arousal")
2. Начать сессию
3. Использовать действие: arousal +10% от предмета
```

---

## 🟠 ПРИОРИТЕТ 2: БАЛАНС

### 2.1. Разные arousal значения (20-35 диапазон)

**Проблема:** 2 карты дают +28 arousal за одинаковую стамину

**Решение:**
```json
// src/data/content/actions.json
{
  "hand_soft": {
    "name": "Ласка руками (лёгкая)",
    "effects": { "arousal": 20, "stamina": 3, "mental": 0 }
  },
  "hand_mid": {
    "name": "Ласка руками (средняя)",
    "effects": { "arousal": 26, "stamina": 5, "mental": 0 }
  },
  "hand_intense": {
    "name": "Ласка руками (интенсивная)",
    "effects": { "arousal": 35, "stamina": 8, "mental": 1 }
  },
  "bj_soft": {
    "name": "Орально (лёгкое)",
    "effects": { "arousal": 22, "stamina": 4, "mental": 0 }
  },
  "bj_mid": {
    "name": "Орально (среднее)",
    "effects": { "arousal": 29, "stamina": 6, "mental": 1 }
  },
  "bj_intense": {
    "name": "Орально (интенсивное)",
    "effects": { "arousal": 35, "stamina": 9, "mental": 2 }
  }
}
```

**Файлы для изменения:**
- [ ] `src/data/content/actions.json` — все 32 действия

**Целевые значения:**
| Категория | Soft | Mid | Intense | Special |
|-----------|------|-----|---------|---------|
| hand | 20 | 26 | 32 | — |
| head | 22 | 28 | 34 | — |
| shaft | 21 | 27 | 33 | — |
| bj | 22 | 29 | 35 | 42 |
| deep | 24 | 31 | 38 | 45 |
| t_ease | 18 | 24 | 30 | 36 |
| rough | 25 | 32 | 40 | 48 |

---

### 2.2. Разная stamina cost (3-8)

**Проблема:** Нет вариативности в стоимости действий

**Решение:** Привязать stamina cost к интенсивности и категории

```json
{
  "hand_soft": { "effects": { "stamina": 3 } },
  "hand_mid": { "effects": { "stamina": 5 } },
  "hand_intense": { "effects": { "stamina": 7 } },
  
  "bj_soft": { "effects": { "stamina": 4 } },
  "bj_mid": { "effects": { "stamina": 6 } },
  "bj_intense": { "effects": { "stamina": 8 } },
  
  "deep_intense": { "effects": { "stamina": 9 } },
  "rough_intense": { "effects": { "stamina": 10 } }
}
```

**Файлы для изменения:**
- [ ] `src/data/content/actions.json`

---

### 2.3. Шанс успеха 70-85% базово

**Проблема:** 95% шанс всегда — нет ощущения риска

**Решение:**
```javascript
// src/core/InteractionSession.js
_calculateSuccessChance(action, client, player, usageCount) {
  // БАЗОВЫЙ ШАНС
  let baseChance = 0.75; // 75% вместо 95%
  
  // Diminishing returns от повторений
  const diminishing = this.diminishingReturns[usageCount - 1] || 0;
  baseChance -= diminishing; // -0/-10/-25/-40%
  
  // Навыки
  const skillBonus = this._getSkillBonus(action, player);
  baseChance += skillBonus; // +5-20%
  
  // Предметы
  const itemBonus = this._getItemBonus(action, player);
  baseChance += itemBonus; // +5-15%
  
  // Фаза клиента
  const phaseBonus = this._getPhaseBonus(action, client);
  baseChance += phaseBonus; // -10% до +20%
  
  return Math.max(0.40, Math.min(0.95, baseChance));
}
```

**Файлы для изменения:**
- [ ] `src/core/InteractionSession.js` — `_calculateSuccessChance()`
- [ ] `src/data/balance.json` — `diminishingReturns`

**Тест:**
```
1. Первое использование: 75-85%
2. Второе использование: 65-75%
3. Третье использование: 50-60%
4. Четвёртое: заблокировано
```

---

## 🟡 ПРИОРИТЕТ 3: ГЕЙМПЛЕЙ

### 3.1. Mental = HP (клиент "атакует")

**Проблема:** Психика не используется в сессии

**Решение:**
```javascript
// src/core/InteractionSession.js
startTurn() {
  // События во время сессии
  if (Math.random() < 0.15) { // 15% шанс каждый ход
    const event = this._generateClientPressureEvent();
    this._applyEvent(event);
  }
}

_generateClientPressureEvent() {
  const events = [
    {
      name: "Клиент давит",
      effect: { mental: -5 },
      choice: {
        text: "Клиент нервничает — успокоить или ускорить?",
        options: [
          { 
            label: "Успокоить", 
            effect: { mental: +3, arousal: -5 },
            chance: 0.80
          },
          { 
            label: "Ускорить", 
            effect: { arousal: +15, stamina: +2 },
            chance: 0.60
          }
        ]
      }
    },
    {
      name: "Требование",
      effect: { mental: -3 },
      // ...
    }
  ];
  
  return events[Math.floor(Math.random() * events.length)];
}
```

**Файлы для изменения:**
- [ ] `src/core/InteractionSession.js` — события сессии
- [ ] `src/system/EventSystem.js` — новые ивенты
- [ ] `src/ui/GameScreen.jsx` — UI для choice events
- [ ] `src/data/content/events.json` — данные событий

**Тест:**
```
1. Во время сессии: 15% шанс события каждый ход
2. Choice event: 2 варианта выбора
3. Психика уменьшается от событий
4. При 0 психики: game over
```

---

### 3.2. Choice events (2-3 за ночь)

**Проблема:** Нет интерактивности во время сессии

**Решение:**
```javascript
// src/core/InteractionSession.js
async handleChoiceEvent(event) {
  this.emit('choiceEvent', {
    event,
    choices: event.choice.options
  });
  
  // Ждать выбора игрока
  const choice = await this._waitForChoice();
  
  // Применить эффект
  const success = Math.random() < choice.chance;
  if (success) {
    this._applyEffects(choice.effect);
    return { success, outcome: 'Успех!' };
  } else {
    this._applyEffects(event.effect); // Штраф за неудачу
    return { success: false, outcome: 'Неудача!' };
  }
}
```

**Файлы для изменения:**
- [ ] `src/core/InteractionSession.js` — `handleChoiceEvent()`
- [ ] `src/ui/ChoiceEventModal.jsx` — новый компонент
- [ ] `src/data/content/events.json` — 10-15 событий

**Примеры событий:**
1. "Клиент нервничает" — успокоить / ускорить
2. "Требует конкретное действие" — согласиться / отказаться
3. "Становится грубым" — подчиниться / доминировать
4. "Предлагает чаевые" — принять / отказаться (репутация)
5. "Просит замедлиться" — замедлить / игнорировать

---

### 3.3. Прогноз награды в UI

**Проблема:** Игрок не видит сколько получит до завершения

**Решение:**
```jsx
// src/ui/GameScreen.jsx
const calculateRewardPrediction = () => {
  const baseReward = client.baseReward;
  const arousalPhase = getArousalPhase(client.arousal);
  
  // Множитель фазы
  const phaseMultipliers = {
    'soft': 0.3,
    'interested': 0.5,
    'excited': 0.7,
    'ready': 1.0,
    'edge': 1.3,
    'climax': 1.5
  };
  
  const minReward = Math.floor(baseReward * phaseMultipliers[arousalPhase] * 0.8);
  const maxReward = Math.floor(baseReward * phaseMultipliers[arousalPhase] * 1.2);
  
  return { min: minReward, max: maxReward };
};

// В UI:
<div className="reward-prediction">
  💰 Прогноз: ${prediction.min}-${prediction.max}
  {edgeStacks > 0 && ` (+${edgeStacks * 10}% бонус)`}
</div>
```

**Файлы для изменения:**
- [ ] `src/ui/GameScreen.jsx` — компонент прогноза
- [ ] `src/ui/ClientCard.jsx` — отображение в карте клиента

**Тест:**
```
1. На фазе "soft": прогноз 30-50% от базы
2. На фазе "edge": прогноз 100-140% от базы
3. С edge stacks: +10% за стек
```

---

## 🟢 ПРИОРИТЕТ 4: МЕТА-ПРОГРЕССИЯ

### 4.1. Репутация → новые типы клиентов

**Проблема:** Нет прогрессии в типах клиентов

**Решение:**
```javascript
// src/system/ClientGenerator.js
generateClient(player) {
  const reputationTiers = {
    0: { types: ['basic'], chance: [1.0] },           // 0-4 реп
    5: { types: ['basic', 'regular'], chance: [0.7, 0.3] }, // 5-9 реп
    10: { types: ['basic', 'regular', 'vip'], chance: [0.5, 0.35, 0.15] }, // 10-14
    15: { types: ['basic', 'regular', 'vip', 'legendary'], chance: [0.4, 0.35, 0.20, 0.05] } // 15+
  };
  
  const tier = Object.keys(reputationTiers).reverse()
    .find(key => player.reputation >= parseInt(key));
  
  const types = reputationTiers[tier].types;
  const chances = reputationTiers[tier].chance;
  
  const clientType = this._weightedRandom(types, chances);
  
  return this._createClient(clientType);
}
```

**Файлы для изменения:**
- [ ] `src/system/ClientGenerator.js` — генерация по репутации
- [ ] `src/data/content/clients.json` — новые типы клиентов

**Типы клиентов:**
| Тип | Репутация | Награда | Сложность |
|-----|-----------|---------|-----------|
| Basic | 0+ | 1.0x | Нормальная |
| Regular | 5+ | 1.3x | Легче |
| VIP | 10+ | 2.0x | Сложнее |
| Legendary | 15+ | 3.0x | Очень сложно |

---

### 4.2. Возвращающиеся клиенты (память)

**Проблема:** Клиенты не запоминаются

**Решение:** (Уже есть `ClientMemorySystem`, проверить интеграцию)

```javascript
// src/system/ClientMemorySystem.js
saveClientInteraction(clientId, data) {
  this.memory[clientId] = {
    ...this.memory[clientId],
    visits: (this.memory[clientId]?.visits || 0) + 1,
    lastVisit: Date.now(),
    preferences: data.preferences,
    fetishes: data.fetishes
  };
}

getClientMemory(clientId) {
  return this.memory[clientId] || null;
}
```

**Файлы для изменения:**
- [ ] `src/system/ClientMemorySystem.js` — проверить работу
- [ ] `src/engine/GameEngine.js` — сохранение после сессии
- [ ] `src/system/ClientGenerator.js` — шанс возврата 20-30%

---

### 4.3. Навыки → перки (упрощённо)

**Проблема:** Нет уникальных бонусов от навыков

**Решение:**
```javascript
// src/system/SkillSystem.js
getPerks(skillName, level) {
  const perks = {
    'oral': {
      3: { name: 'Слюна', effect: 'bj действия -1 stamina' },
      6: { name: 'Глубина', effect: 'deep действия +10% шанс' },
      10: { name: 'Мастер', effect: 'bj/deep +20% награда' }
    },
    'tease': {
      3: { name: 'Дразнение', effect: 'edge stacking +1' },
      6: { name: 'Контроль', effect: 'arousal сброс эффективнее' },
      10: { name: 'Манипулятор', effect: 'edge макс 7 стеков' }
    },
    // ... другие навыки
  };
  
  return perks[skillName]?.[level] || null;
}
```

**Файлы для изменения:**
- [ ] `src/system/SkillSystem.js` — перки
- [ ] `src/ui/SkillOverlay.jsx` — отображение перков

---

## 📊 ЧЕКЛИСТ РЕЛИЗА v0.1.0

### Критические баги (Приоритет 1)
- [ ] 1.1 Сброс actionUsage между клиентами
- [ ] 1.2 Карта "Осмотреть клиента" гарантированно
- [ ] 1.3 "Завершить раньше" формула шанса
- [ ] 1.4 Предметы работают в сессии

### Баланс (Приоритет 2)
- [ ] 2.1 Разные arousal значения (20-35 диапазон)
- [ ] 2.2 Разная stamina cost (3-8)
- [ ] 2.3 Шанс успеха 70-85% базово

### Геймплей (Приоритет 3)
- [ ] 3.1 Mental = HP (клиент "атакует")
- [ ] 3.2 Choice events (2-3 за ночь)
- [ ] 3.3 Прогноз награды в UI

### Мета-прогрессия (Приоритет 4)
- [ ] 4.1 Репутация → новые типы клиентов
- [ ] 4.2 Возвращающиеся клиенты (память)
- [ ] 4.3 Навыки → перки (упрощённо)

### Тестирование
- [ ] `npm run test` — все тесты проходят
- [ ] `npm run build` — сборка успешна
- [ ] `npm run simulate` — симуляция 1000 ночей
- [ ] Ручное тестирование всех механик

### Документация
- [ ] Обновить `QUICK_START.md`
- [ ] Обновить `GAME_DESIGN.md`
- [ ] Обновить `README.md`
- [ ] Обновить `package.json` (version: 0.1.0)

---

## 🔧 ТЕХНИЧЕСКИЕ ЗАДАЧИ

### Обновление версии
- [ ] `package.json`: `"version": "0.1.0"`
- [ ] `QUICK_START.md`: заголовок версии

### Рефакторинг
- [ ] Вынести формулы в `src/data/balance.json`
- [ ] Создать `src/data/content/events.json` для choice events
- [ ] Создать `src/ui/ChoiceEventModal.jsx`

### Интеграции
- [ ] InventorySystem → ActionDeckSystem
- [ ] InventorySystem → InteractionSession
- [ ] ClientMemorySystem → ClientGenerator
- [ ] SkillSystem → InteractionSession (перки)

---

## 📈 МЕТРИКИ БАЛАНСА

**Целевые значения после исправлений:**

| Метрика | Цель | Метод проверки |
|---------|------|----------------|
| Ходов на клиента | 3-5 | `npm run simulate` |
| Шанс успеха (1 использование) | 75-85% | Тесты |
| Шанс успеха (3 использование) | 50-60% | Тесты |
| Событий за ночь | 2-3 | Ручное тестирование |
| Психики теряется за ночь | 5-15 | Ручное тестирование |
| Награда (edge stacking) | +30-50% | Ручное тестирование |

---

## 📝 ПРИМЕЧАНИЯ

### Edge Cases
1. **0 психики:** Game over немедленно
2. **0 стамины:** Возврат в хаб, -10% денег
3. **Клиент уходит:** -репутация, 0 денег
4. **Побег:** -15-45% денег сессии

### Exploit Vectors
1. **Spam одной карты:** Блокируется diminishing returns
2. **Edge stacking loop:** Макс 5 стеков, сброс до 70%
3. **Предметы spam:** Лимит 1 предмет за сессию (если нужно)

### Future Improvements
- [ ] Анимации карт (shimmer, подача крупье)
- [ ] Звуковые эффекты
- [ ] Достижения
- [ ] Daily challenges
- [ ] Leaderboard

---

**Последнее обновление:** 25 марта 2026 г.
**Следующая проверка:** После завершения Приоритета 1
