/**
 * Экспорт логов игры для отладки
 * 
 * Использование в браузере (F12 Console):
 * 1. Скопировать этот код
 * 2. Вставить в консоль
 * 3. Нажать Enter
 * 4. Скопировать результат и отправить разработчику
 */

(function exportGameLogs() {
  console.log('🔍 Экспорт логов игры...\n');
  
  const logs = {};
  
  // 1. Сохранения
  const save = localStorage.getItem('gloryhole_quest_save');
  if (save) {
    try {
      logs.saveData = JSON.parse(save);
      logs.saveDataExists = true;
    } catch(e) {
      logs.saveData = 'ERROR: ' + e.message;
      logs.saveDataExists = false;
    }
  } else {
    logs.saveDataExists = false;
  }
  
  // 2. Сессионный лог (если есть)
  const sessionLog = localStorage.getItem('game_session_log');
  if (sessionLog) {
    try {
      logs.sessionLog = JSON.parse(sessionLog);
    } catch(e) {
      logs.sessionLog = 'ERROR: ' + e.message;
    }
  }
  
  // 3. Версия
  logs.gameVersion = '0.6.0';
  logs.exportTime = new Date().toISOString();
  logs.userAgent = navigator.userAgent;
  
  // 4. Статистика
  logs.stats = {
    saveDataSize: save ? save.length : 0,
    sessionLogSize: sessionLog ? sessionLog.length : 0,
    localStorageSize: localStorage.length
  };
  
  // Вывод
  const json = JSON.stringify(logs, null, 2);
  console.log('📋 ЛОГ ЭКСПОРТИРОВАН (скопируй текст ниже):\n');
  console.log('═══════════════════════════════════════════');
  console.log(json);
  console.log('═══════════════════════════════════════════');
  console.log('\n💡 Совет: сохрани этот текст в файл и отправь разработчику');
  
  // Автоматическое копирование (если поддерживается)
  if (navigator.clipboard) {
    navigator.clipboard.writeText(json).then(() => {
      console.log('✅ Лог скопирован в буфер обмена!');
    }).catch(() => {
      console.log('⚠️ Не удалось скопировать в буфер, скопируй вручную');
    });
  }
  
  return logs;
})();
