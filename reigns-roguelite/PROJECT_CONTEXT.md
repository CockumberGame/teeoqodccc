# 📘 Gloryhole Quest — Документация Проекта

**Версия:** 0.5.0  
**Дата последнего обновления:** 16 марта 2026  
**Статус:** ✅ Этапы 1-2 завершены, Этап 3 в ожидании

---

## 🚀 БЫСТРЫЙ СТАРТ (для новой сессии)

### 1. Запуск проекта
```bash
cd C:\Users\LORD PHALLUS\Desktop\teeoqodccc-main\reigns-roguelite
npm install          # Если node_modules удалён
npm run dev          # Запуск сервера разработки (http://localhost:5173)
npm run build        # Сборка для продакшена
```

### 2. Структура проекта
```
reigns-roguelite/
├── src/
│   ├── core/              # Базовые классы (EventBus, InteractionSession)
│   ├── engine/            # GameEngine (оркестратор)
│   ├── system/            # Игровые системы (16 файлов)
│   ├── ui/                # React компоненты (CardView, GameScreen, HubScreen)
│   ├── data/              # JSON данные (balance, cards, events, content)
│   └── assets/            # Изображения, шрифты
├── package.json           # Зависимости
├── vite.config.js         # Конфигурация сборщика
├── README.md              # Описание игры (с уведомлением 18+)
├── REFACTORING_PLAN.md    # План рефакторинга (Этапы 1-3)
└── PROJECT_CONTEXT.md     # ЭТОТ ФАЙЛ — контекст для AI
```

### 3. Технологический стек
- **Frontend:** React 19.2.0 + Vite 7.3.1
- **Стили:** Tailwind CSS 3.4.19
- **Иконки:** Lucide React
- **Язык:** JavaScript (ES Modules)

---

## 📜 КОНТЕКСТ ПРОЕКТА

### Назначение
**Gloryhole Quest** — текстовая карточная игра в стиле Reigns (но с отличиями).


### Важное уведомление
- **Код и механики** — разрабатываются AI-ассистентом (Qwen)
- **Контент (тексты)** — заполняется владельцем вручную на основе заглушек от qwen в `src/data/content/`
- **Ответственность** за контент лежит на владельце проекта

---

## 🏗️ АРХИТЕКТУРА (5 СЛОЁВ)

```
┌─────────────────────────────────────────────────┐
│ Layer 1: CORE (базовые классы)                  │
│ └── EventBus.js, InteractionSession.js          │
├─────────────────────────────────────────────────┤
│ Layer 2: ENGINE (оркестрация)                   │
│ └── GameEngine.js (~550 строк)                  │
├─────────────────────────────────────────────────┤
│ Layer 3: SESSION (состояние встречи/ночи)       │
│ └── InteractionSession (инкапсуляция)           │
├─────────────────────────────────────────────────┤
│ Layer 4: SYSTEMS (бизнес-логика)                │
│ └── 16 систем (Patience, Mood, Reputation...)   │
├─────────────────────────────────────────────────┤
│ Layer 5: CONTENT (данные)                       │
│ └── JSON файлы (balance, cards, events...)      │
└─────────────────────────────────────────────────┘
```

### Ключевые принципы
1. **GameEngine = дирижёр, не исполнитель** (сокращён с 2235 до ~550 строк)
2. **Единый источник правды** — `clientQueue` в DeckManager
3. **Инкапсуляция встречи** — `InteractionSession`
4. **Data-driven** — баланс в JSON, не в коде
5. **Модульность** — системы изолированы, тестируемы

---

## 📁 КЛЮЧЕВЫЕ ФАЙЛЫ

### Core (ядро)

| Файл | Строк | Назначение |
|------|-------|------------|
| `src/core/EventBus.js` | 88 | События между модулями (emit/on/off) |
| `src/core/InteractionSession.js` | 398 | Объект встречи с клиентом (инкапсуляция) |

### Engine

| Файл | Строк | Назначение |
|------|-------|------------|
| `src/engine/GameEngine.js` | ~550 | Тонкий оркестратор (координация систем) |

**Основные методы:**
- `startNightSession()` — начало ночи
- `startNextInteraction()` — создание InteractionSession
- `playActionCard(actionIndex)` — ход игрока
- `finishInteraction()` — проверка кульминации
- `endNight(reason)` — завершение ночи

### Systems (16 файлов)

| Файл | Назначение | Ключевые методы |
|------|------------|-----------------|
| `PatienceSystem.js` | Терпение ожидающего клиента | `tick()`, `applyPatienceDebuff()` |
| `ReputationSystem.js` | Репутация (медленный рост) | `addReputation()` (макс. 25/ночь) |
| `MoodSystem.js` | Настроение клиента (5 фаз) | `autoTick()`, `getMoodPhase()` |
| `ClientGenerator.js` | Генерация клиентов | `generateClient()` (с модификаторами) |
| `ActionDeckSystem.js` | Карты действий | `generateActionCards()` (intensity) |
| `DeckManager.js` | Очередь клиентов | `generateQueue()` (3 + rep/20 + random) |
| `SkillSystem.js` | Навыки игрока | `upgradeSkill()`, `getObservationEffects()` |
| `TrustSystem.js` | Доверие клиента | `createTrustState()`, `updateTrust()` |
| `ClimaxSystem.js` | Выбор исхода сцены | `generateOutcomes()`, `calculateOutcome()` |
| `TagInteractionSystem.js` | Теги действий × черты | `calculateTagModifier()` |
| `EventSystem.js` | Случайные события | `checkRandomEvent()` (с условиями) |
| `TimeSystem.js` | Время (22:00-4:00) | `tick()`, `getRemainingTurns()` |
| `InventorySystem.js` | Предметы и магазин | `buyItem()`, `hasItem()` |
| `InspectionSystem.js` | Осмотр клиентов | `inspectClient()` |
| `SizeSystem.js` | Размеры (8-24 см) | `getSizeCategory()` |
| `ClientMemorySystem.js` | Память клиентов | `createMemory()`, `getReturnChance()` |

### Data (JSON)

| Файл | Назначение |
|------|------------|
| `src/data/balance.json` | Константы и формулы (reputation, reward, stamina, arousal) |
| `src/data/cards.json` | Карты действий (с intensity: slow/normal/intense) |
| `src/data/events.json` | Случайные события (с условиями) |
| `src/data/client_modifiers.json` | Модификаторы клиентов (10 типов) |
| `src/data/content/trust_levels.json` | ⏳ Заполнить вручную |
| `src/data/content/climax_choices.json` | ⏳ Заполнить вручную |
| `src/data/content/tag_compatibility.json` | ⏳ Заполнить вручную |

### UI (React)

| Файл | Назначение |
|------|------------|
| `src/ui/CardView.jsx` | Отображение карты (бейджи intensity, модификаторы) |
| `src/ui/GameScreen.jsx` | Экран игры (шкала patience, настроение) |
| `src/ui/HubScreen.jsx` | Экран дома (хаб) |

---

## 🎮 ГЕЙМПЛЕЙ (ТЕКУЩАЯ ВЕРСИЯ)

### Основной цикл
```
Ночная смена (22:00-4:00) → Дом → Отдых → Новая смена
```

### Ночная сессия
1. **Генерация очереди клиентов:**
   ```
   clientsTonight = 3 + floor(reputation / 20) + random(0-1)
   ```

2. **Встреча с клиентом (InteractionSession):**
   - Игрок получает 2 карты действий
   - Выбирает 1 карту (intensity: 🐢4 / ⚡6 / 🔥8 stamina)
   - Система рассчитывает эффект (теги × черты × предпочтения)
   - Обновляется: arousal, patience, mood, tension
   - Ожидающий клиент теряет терпение (-5-10 за ход)
   - Проверка завершения: climax (≥95), clientLeft (patience≤0), earlyFinish

3. **Завершение встречи:**
   - Расчёт satisfaction (0-100)
   - Награда: baseReward + sizeBonus + phaseBonus + tensionBonus
   - Репутация: satisfaction × 0.2 (макс. 25 за ночь)

4. **Следующий клиент** или конец ночи

### Дом (хаб)
- **Восстановление:** стаминa, психика, очки действий
- **Магазин:** предметы (линейка, дилдо, лубрикант, игрушки)
- **Навыки:** прокачка за XP (observation, adaptation, etc.)
- **Отдых:** переход к следующему дню

---

## 📊 БАЛАНС (ИЗ balance.json)

### Репутация
```json
{
  "baseClients": 3,
  "reputationBonus": "floor(reputation / 20)",
  "gainFormula": "satisfaction * 0.2",
  "maxPerNight": 25
}
```

### Награда
```json
{
  "baseReward": 30,
  "sizeBonus": {"small": 5, "medium": 10, "large": 20},
  "phaseBonus": [0, 5, 10, 15, 20, 25],
  "tensionBonus": "tensionLevel * 15"
}
```

### Стамина
```json
{
  "slow": 4,
  "normal": 6,
  "intense": 8
}
```

### Возбуждение (фазы)
```json
{
  "calm": {"min": 0, "max": 15},
  "interested": {"min": 15, "max": 35},
  "excited": {"min": 35, "max": 60},
  "ready": {"min": 60, "max": 80},
  "edge": {"min": 80, "max": 95},
  "climax": {"min": 95, "max": 100}
}
```

### Модификаторы клиентов
| ID | Эффекты | Шанс |
|----|---------|------|
| wealthy | +50% награда, -10% терпение | 8% |
| impatient | 1.5x decay, быстрее теряет интерес | 12% |
| experienced | +30% XP, сложнее удовлетворить | 10% |
| generous | +20% награда, +30% терпение | 15% |
| mysterious | Скрытые черты, вариативное настроение | 10% |
| demanding | Требовательный, выше оплата | 8% |
| dominant | Любит грубое обращение | 10% |
| submissive | Легче удовлетворить | 12% |
| sensitive | Быстрее возбуждается | 10% |
| thrill_seeker | Любит риск, скучает быстро | 7% |

---

## ✅ СТАТУС РЕАЛИЗАЦИИ

### 🔴 Этап 1: Критично (архитектура)
- [x] EventBus.js — события
- [x] InteractionSession.js — объект встречи
- [x] balance.json — баланс
- [x] DeckManager.js — очередь клиентов (убрано дублирование)
- [x] GameEngine.js — тонкий оркестратор (2235 → ~550 строк)
- [x] UI — интенсивность действий, patience ожидающего

**Статус:** ✅ **ЗАВЕРШЁН**  
**Результат:** Игра работает стабильно, встречи завершаются

---

### 🟡 Этап 2: Важно (геймплей)
- [x] PatienceSystem — терпение ожидающего клиента
- [x] ReputationSystem — медленный рост (макс. 25 за ночь)
- [x] ActionDeckSystem — интенсивность действий (4/6/8 stamina)
- [x] ClientGenerator — модификаторы вместо tier-ов (10 типов)
- [x] MoodSystem — авто-изменение настроения (5 фаз)
- [x] GameEngine — интеграция всех систем
- [x] UI — бейджи модификаторов, шкала patience, настроение

**Статус:** ✅ **ЗАВЕРШЁН**  
**Результат:** Геймплей глубже, баланс лучше

---

### 🟢 Этап 3: Желательно (глубина)
- [ ] MomentumSystem — бонус за серию действий одного типа
- [ ] SpecialClients — редкие клиенты (VIP, знаменитости)
- [ ] SessionStats — статистика ночи для достижений
- [ ] Контент — заполнение `src/data/content/*.json` (вручную)

**Статус:** ⏳ **В ОЖИДАНИИ**

---

## 🔧 ИЗВЕСТНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема 1: Сборка не работает
**Решение:**
```bash
npm install
npm run build
```

### Проблема 2: Встречи не завершаются
**Причина:** InteractionSession не создан  
**Решение:** Проверить `startNextInteraction()` в GameEngine.js

### Проблема 3: Карты не генерируются
**Причина:** DeckManager использует удалённый `nightDeck`  
**Решение:** Убедиться, что используется только `clientQueue`

### Проблема 4: Репутация растёт слишком быстро
**Причина:** Не применён лимит 25 за ночь  
**Решение:** Проверить `ReputationSystem.addReputation()`

---

## 📝 ЗАМЕТКИ ДЛЯ AI-АССИСТЕНТОВ

### Контекст
1. **Игра личная, 18+**, создаётся для жены (автору 35 лет)
2. **Контент в `src/data/content/`** заполняется вручную (заглушки для обхода фильтров)
3. **Технологии:** React 19 + Vite 7 + Tailwind 3 (максимально современные)
4. **Архитектура:** 5 слоёв (Core, Engine, Session, Systems, Content)
5. **Главный принцип:** GameEngine = дирижёр, не исполнитель

### Запрещено
- ❌ Добавлять мрачные события (нет HP, нет смерти)
- ❌ Делать God Object (один файл на всё)
- ❌ Писать формулы в коде (только JSON)
- ❌ Дублировать источники правды

### Разрешено
- ✅ Постепенный рефакторинг (без поломки игры)
- ✅ Data-driven контент (JSON без изменения кода)
- ✅ Модульные системы (изолированные, тестируемые)

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

### Для продолжения разработки:
1. Открыть `REFACTORING_PLAN.md` — полный план с примерами кода
2. Начать с **Этапа 3** (MomentumSystem, SpecialClients, SessionStats)
3. Заполнить контент в `src/data/content/*.json` (вручную)

### Для тестирования:
```bash
npm run dev
# Открыть http://localhost:5173
# Проверить:
# - Встречи завершаются (climax/clientLeft/earlyFinish)
# - Ожидающий клиент теряет терпение
# - Репутация растёт медленно (макс. 25 за ночь)
# - Действия имеют интенсивность (4/6/8 stamina)
```

### Для сборки:
```bash
npm run build
# Проверить dist/ на ошибки
```

---

## 📞 КОНТАКТЫ

**Владелец проекта:** L ORD PHALLUS  
**Репозиторий:** `C:\Users\LORD PHALLUS\Desktop\teeoqodccc-main\reigns-roguelite`

**Для продолжения в новой сессии:**
1. Дать доступ к папке проекта
2. Открыть `PROJECT_CONTEXT.md` (этот файл)
3. Следовать инструкциям из раздела "Быстрый старт"

---

**Создано для сохранения контекста между сессиями разработки.**  
**Последнее обновление:** 16 марта 2026
