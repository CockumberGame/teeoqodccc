# 📓 SESSION_LOG.md — Лог сессий разработки

## Сессия #1 — 19 марта 2026 (Часть 1: Багфикс)

**Участники**: Разработчик, Qwen Code  
**Цель**: Исправление критических багов, чистка документации, запуск игры

---

## Сессия #2 — 19 марта 2026 (Часть 2: Механики)

**Участники**: Разработчик, Qwen Code  
**Цель**: Реализация механик кровати, дневных лимитов, actionPoints

### Проблемы на начало сессии

1. **Неправильная логика actionPoints** — relax давал +1 очко вместо траты
2. **Нет флага sessionCompleted** — кнопка игры не блокировалась после ночи
3. **Нет кроватей в магазине** — rest() восстанавливал всё, а не от кровати
4. **Нет дневных лимитов** — можно спамить восстановлениями за деньги

---

### Выполненные задачи

#### 1. Добавлены кровати в items.json ✅

```json
{
  "bed_basic": {
    "id": "bed_basic",
    "name": "Кровать ур.1",
    "price": 500,
    "bedLevel": 1,
    "staminaRestore": 50
  },
  "bed_upgrade_1": {
    "id": "bed_upgrade_1", 
    "name": "Кровать ур.2",
    "price": 1000,
    "bedLevel": 2,
    "staminaRestore": 100,
    "requires": "bed_basic"
  },
  "bed_upgrade_2": {
    "id": "bed_upgrade_2",
    "name": "Кровать ур.3", 
    "price": 2000,
    "bedLevel": 3,
    "staminaRestore": 200,
    "requires": "bed_upgrade_1"
  }
}
```

**Также добавлены предметы с дневным лимитом**:
- 🍦 Мороженое ($35, +50 🧠, 1 раз в день)
- ⚡ Энергетик XL ($40, +50 💪, 1 раз в день)

---

#### 2. Добавлен флаг sessionCompleted ✅

**GameEngine.js**:
```javascript
this.sessionCompleted = false; // Флаг: ночь завершена, нужно отдохнуть

// В startNightSession():
if (this.sessionCompleted) {
  return { success: false, reason: 'Ночь завершена! Нужно отдохнуть.' };
}

// В endNight():
this.sessionCompleted = true;
```

**Логика**:
- После ночи: `sessionCompleted = true` → кнопка игры заблокирована
- После сна: `sessionCompleted = false` → кнопка игры активна

---

#### 3. Исправлен rest() — восстановление от кровати ✅

**Было**:
```javascript
rest() {
  // Восстанавливает ВСЁ (full restore)
}
```

**Стало**:
```javascript
rest() {
  // Определяет последнюю купленную кровать
  // Восстанавливает stamina = bed.staminaRestore
  // Сбрасывает: needsRest, sessionCompleted, dailyActions
  // Восстанавливает actionPoints = maxActionPoints + actionPointsBonus
}
```

---

#### 4. Добавлены дневные лимиты ✅

**Новые поля**:
```javascript
this.dailyActions = {
  paidStaminaRestore: false,  // Было ли восстановление за $20
  paidMentalRestore: false    // Было ли восстановление за $30
};
```

**Проверка в restoreStamina/restoreMentalHealth**:
```javascript
if (this.dailyActions.paidStaminaRestore) {
  return { success: false, reason: 'Уже восстанавливали сегодня (1 раз в день)' };
}
```

**Сброс после сна**:
```javascript
this.dailyActions = {
  paidStaminaRestore: false,
  paidMentalRestore: false
};
```

---

#### 5. Добавлен actionPointsBonus ✅

**Поля**:
```javascript
this.actionPoints = 3;
this.maxActionPoints = 3;
this.actionPointsBonus = 0; // Бонус от навыков (+1 на 5 и 10 уровне)
```

**Восстановление после сна**:
```javascript
this.actionPoints = this.maxActionPoints + this.actionPointsBonus;
```

**Отображение в UI**:
```
⚡ Действия (3/3 +2 бонус)
```

---

#### 6. Обновлён HubScreen ✅

**Взаимная блокировка кнопок**:
```javascript
const canStartNight = hub?.canStartNight !== false;
const canRest = hub?.canRest || false;

// Кнопка игры:
disabled={!canStartNight}

// Кнопка отдыха:
disabled={!canRest || performingAction}
```

**Отображение**:
- После ночи: кнопка игры ⛔, кнопка отдыха ✅
- После сна: кнопка игры ✅, кнопка отдыха ⛔

---

#### 7. Сохранение/загрузка ✅

**Добавлено в saveData**:
```javascript
{
  needsRest,
  sessionCompleted,
  actionPointsBonus,
  dailyActions
}
```

**Восстановление в loadGame()**:
```javascript
this.needsRest = saveData.needsRest || false;
this.sessionCompleted = saveData.sessionCompleted || false;
this.actionPointsBonus = saveData.actionPointsBonus || 0;
this.dailyActions = saveData.dailyActions || { ... };
```

---

### Итоги сессии #2

**Время сессии**: ~2 часа  
**Изменено файлов**: 4 (GameEngine.js, HubScreen.jsx, items.json, SESSION_LOG.md)  
**Добавлено предметов**: 5 (3 кровати, 2 расходника с лимитом)  
**Статус**: ✅ Все тесты пройдены (22/22), сборка работает

---

### Следующие шаги (Сессия #3)

1. **Навык "Выносливость"** — добавить actionPointsBonus на 5 и 10 уровне
2. **Проверка кровати в магазине** — блокировать покупку если нет предыдущей
3. **Тестирование в браузере** — проверить полный цикл
4. **Этап 3** — MomentumSystem, SpecialClients, SessionStats
