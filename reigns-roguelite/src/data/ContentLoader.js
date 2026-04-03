/**
 * ContentLoader - Загрузчик контента для взрослых
 * Отделяет текстовый контент от игровой логики
 *
 * Использование:
 * - ClientGenerator использует content.descriptions для генерации текстов
 * - ActionDeckSystem использует content.actions для текстов действий
 * - Все тексты хранятся в src/data/content/*.json
 *
 * ВАЖНО: Этот файл можно редактировать самостоятельно без обсуждения с AI
 * если контент становится слишком откровенным для фильтров
 */

import clientDescriptions from '../data/content/client_descriptions.json' with { type: 'json' };

class ContentLoader {
  constructor() {
    this.content = {
      descriptions: clientDescriptions
    };
    
    this.loaded = true;
  }

  /**
   * Получить описание клиента по размеру
   * @param {string} sizeKey - 'small', 'average', 'large', 'extreme'
   * @param {string} visualAssessment - Визуальная оценка размера
   * @param {string} clientDescription - Базовое описание клиента
   * @returns {string} Сгенерированное описание
   */
  getClientDescription(sizeKey, visualAssessment, clientDescription) {
    const sizeData = this.content.descriptions.size_descriptions[sizeKey] || 
                     this.content.descriptions.size_descriptions['average'];
    
    // Выбор случайного base варианта
    const baseVariants = sizeData.base_variants || [];
    const baseTemplate = baseVariants[Math.floor(Math.random() * baseVariants.length)] || 
                         '${client_description} заказывает услугу.';
    
    // Замена плейсхолдеров
    let baseText = baseTemplate
      .replace('${client_description}', clientDescription)
      .replace('${visual_assessment}', visualAssessment);
    
    // Выбор случайного arousal варианта
    const arousalVariants = sizeData.arousal_variants || [];
    const arousalText = arousalVariants[Math.floor(Math.random() * arousalVariants.length)] || '';
    
    return `${baseText}\n\n${arousalText}`;
  }

  /**
   * Получить намёк на фетиш
   * @param {string} fetishId - ID фетиша
   * @returns {string} Текстовый намёк
   */
  getFetishHint(fetishId) {
    const hints = this.content.descriptions.fetish_hints || {};
    return hints[fetishId] || '';
  }

  /**
   * Получить случайное базовое описание клиента
   * @returns {string} Описание клиента
   */
  getRandomClientDescription() {
    const descriptions = this.content.descriptions.client_base_descriptions || [];
    return descriptions[Math.floor(Math.random() * descriptions.length)] || 'Незнакомец';
  }

  /**
   * Загрузить дополнительный контент (для расширения)
   * @param {string} contentType - Тип контента
   * @param {Object} contentData - Данные контента
   */
  loadContent(contentType, contentData) {
    this.content[contentType] = contentData;
    this.loaded = true;
  }

  /**
   * Получить весь загруженный контент
   * @returns {Object} Все контент данные
   */
  getAllContent() {
    return this.content;
  }

  /**
   * Проверить готовность загрузчика
   * @returns {boolean} Готов ли к использованию
   */
  isReady() {
    return this.loaded;
  }
}

export default ContentLoader;
