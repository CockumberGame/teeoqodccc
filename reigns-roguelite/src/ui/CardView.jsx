/**
 * CardView - DOS Terminal Style
 * Gloryhole Quest - карта клиента + 2 карты действий
 *
 * Стиль: DOS терминал (классический серый #c0c0c0)
 * - Двойные рамки с символами ╔╗╚╝
 * - Розовая внешняя (#e94560) + голубая внутренняя (#00d9ff)
 * - Точечные тени (без размытия)
 * - Анимация подачи карты: дуга с cubic-bezier
 * - Карты действий рядом (flex row)
 * - Моноширинный шрифт Courier New
 */

import React, { useEffect, useState } from 'react';
import ClimaxChoice from './ClimaxChoice.jsx';

function CardView({
  clientCard,
  card,  // Для событий
  actionCards = [],
  actionState = {},
  onPlayAction,
  onEarlyFinish,
  onChoice,  // Для событий
  showEarlyFinish = false,
  climaxReached = false,
  climaxOutcomes = [],
  onSelectClimax,
  inventorySystem = null,
  onActivateItem = null,
  isNewClient = false,  // Флаг для анимации нового клиента
  isNewCards = false,    // Флаг для анимации новых карт действий
  actionUsage = {},      // Статистика использования действий { actionId: count }
  clientId = null,       // ID клиента для проверки повторов
  sessionEdgeStacks = 0, // Текущие стеки edge из сессии
  playerStamina = 60,    // Текущая стамина игрока (из game.runState.stamina)
  playerMental = 80      // Текущая менталка игрока (из game.runState.mental_health)
}) {
  // Анимации
  const [clientAnimate, setClientAnimate] = useState(isNewClient);
  const [cardsAnimate, setCardsAnimate] = useState(isNewCards);
  const [usedCardIdx, setUsedCardIdx] = useState(null);
  const [activatingItem, setActivatingItem] = useState(null);

  useEffect(() => {
    if (isNewClient) {
      setClientAnimate(true);
      const timer = setTimeout(() => setClientAnimate(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isNewClient]);

  useEffect(() => {
    if (isNewCards) {
      setCardsAnimate(true);
      const timer = setTimeout(() => setCardsAnimate(false), 700);
      return () => clearTimeout(timer);
    }
  }, [isNewCards]);

  // Обработка использования карты
  const handlePlayAction = (index) => {
    setUsedCardIdx(index);
    setTimeout(() => {
      onPlayAction(index);
      setUsedCardIdx(null);
    }, 300);
  };

  // Обработка активации предмета
  const handleActivateItem = (itemId, actionId) => {
    setActivatingItem(itemId);
    setTimeout(() => {
      onActivateItem(itemId, actionId);
      setActivatingItem(null);
    }, 500);
  };

  // === КАРТОЧКА СОБЫТИЯ ===
  if (card && card.choices) {
    return (
      <div className="card-view dos-style">
        <div className="event-card">
          <div className="card-border-outer">
            <div className="card-border-inner">
              <div className="card-content">
                <div className="event-header">
                  <span className="event-icon">🎲</span>
                  <span className="event-title">{card.name || 'СОБЫТИЕ'}</span>
                </div>
                <div className="event-text">{card.text || '...'}</div>
                <div className="event-choices">
                  {card.choices.map((choice, index) => (
                    <button
                      key={index}
                      className="dos-button event-choice"
                      onClick={() => onChoice && onChoice(index)}
                    >
                      {`> ${choice.text}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Угловые символы для внешней рамки (розовые) */}
            <span className="corner-tl">╔</span>
            <span className="corner-tr">╗</span>
            <span className="corner-bl">╚</span>
            <span className="corner-br">╝</span>
            {/* Угловые символы для внутренней рамки (голубые) */}
            <span className="corner-tl inner">╔</span>
            <span className="corner-tr inner">╗</span>
            <span className="corner-bl inner">╚</span>
            <span className="corner-br inner">╝</span>
          </div>
        </div>
      </div>
    );
  }

  // === ЗАГЛУШКА ===
  if (!clientCard) {
    return (
      <div className="card-view dos-style">
        <div className="no-card">
          <div className="card-border-outer">
            <div className="card-border-inner">
              <div className="card-content">
                <p className="loading-text">ЗАГРУЗКА...</p>
              </div>
            </div>
            {/* Угловые символы для внешней рамки (серые) */}
            <span className="corner-tl">╔</span>
            <span className="corner-tr">╗</span>
            <span className="corner-bl">╚</span>
            <span className="corner-br">╝</span>
            {/* Угловые символы для внутренней рамки */}
            <span className="corner-tl inner">╔</span>
            <span className="corner-tr inner">╗</span>
            <span className="corner-bl inner">╚</span>
            <span className="corner-br inner">╝</span>
          </div>
        </div>
      </div>
    );
  }

  // === ДАННЫЕ КЛИЕНТА ===
  const clientData = clientCard.clientData || {};
  const arousalPercent = clientData.arousal || 0;
  const trustState = clientCard.trustState;
  const moodState = clientCard.moodState;

  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

  // Цвет шкалы возбуждения (6 фаз v0.7)
  const getArousalColor = (percent) => {
    if (percent < 0) return '#6b7280';      // 🩶 soft
    if (percent < 25) return '#22c55e';     // 🟢 interested
    if (percent < 50) return '#3b82f6';     // 🔵 excited
    if (percent < 75) return '#a855f7';     // 🟣 ready
    if (percent < 95) return '#f97316';     // 🟠 edge
    return '#ef4444';                        // 🔴 climax
  };

  // Состояние возбуждения (6 фаз v0.7)
  const getArousalState = (percent) => {
    if (percent < 0) return 'ХОЛОДНЫЙ';
    if (percent < 25) return 'ЗАИНТЕРЕСОВАН';
    if (percent < 50) return 'ВОЗБУЖДЁН';
    if (percent < 75) return 'ГОТОВ';
    if (percent < 95) return 'НА ГРАНИ';
    return 'ФИНАЛ';
  };

  // Бейдж доверия
  const getTrustBadge = () => {
    if (!trustState) return null;
    const trust = trustState.current || 50;
    const level = trustState.level || { name: 'НЕЗНАКОМЕЦ' };
    
    let color, icon;
    if (trust >= 75) { color = '#00ff88'; icon = '💚'; }
    else if (trust >= 50) { color = '#00d9ff'; icon = '💙'; }
    else if (trust >= 25) { color = '#ffaa00'; icon = '💛'; }
    else { color = '#888888'; icon = '⭐'; }
    
    return { color, icon, name: level.name.toUpperCase() };
  };

  // Модификаторы (настроение + особенности)
  const getModifierBadge = (modifierId) => {
    const modifiers = {
      wealthy: { name: 'БОГАТЫЙ', color: '#ffaa00', icon: '💰' },
      impatient: { name: 'НЕТЕРПЕЛИВЫЙ', color: '#ff6600', icon: '😤' },
      experienced: { name: 'ОПЫТНЫЙ', color: '#aa00ff', icon: '🎯' },
      generous: { name: 'ЩЕДРЫЙ', color: '#00ff88', icon: '🎁' },
      mysterious: { name: 'ЗАГАДОЧНЫЙ', color: '#6666ff', icon: '🎭' },
      demanding: { name: 'ТРЕБОВАТЕЛЬНЫЙ', color: '#ff0055', icon: '💢' },
      dominant: { name: 'ДОМИНИРУЮЩИЙ', color: '#cc0000', icon: '👑' },
      submissive: { name: 'ПОКОРНЫЙ', color: '#aa66ff', icon: '🏳️' },
      sensitive: { name: 'ЧУВСТВИТЕЛЬНЫЙ', color: '#ff66aa', icon: '💕' },
      thrill_seeker: { name: 'ИСКАТЕЛЬ ОЩУЩЕНИЙ', color: '#ffcc00', icon: '🎢' },
      chatty: { name: 'РАЗГОВОРЧИВЫЙ', color: '#3399ff', icon: '💬' },
      quiet: { name: 'МОЛЧАЛИВЫЙ', color: '#667788', icon: '🤫' },
      needy: { name: 'НУЖДАЮЩИЙСЯ', color: '#ff88cc', icon: '🥺' }
    };
    return modifiers[modifierId] || { name: modifierId.toUpperCase(), color: '#888888', icon: '❓' };
  };

  // Интенсивность
  const getIntensityData = (intensity) => {
    const data = {
      slow: { icon: '🐢', name: 'МЕДЛЕННО', color: '#00d9ff' },
      normal: { icon: '⚡', name: 'СРЕДНЕ', color: '#00ff88' },
      intense: { icon: '🔥', name: 'ЖЁСТКО', color: '#ff0055' }
    };
    return data[intensity] || data.normal;
  };

  const trustBadge = getTrustBadge();
  const arousalColor = getArousalColor(arousalPercent);
  const arousalState = getArousalState(arousalPercent);

  // === РЕНДЕР ===
  return (
    <div className="card-view dos-style">
      <div className="three-cards-layout">

        {/* === КАРТА КЛИЕНТА === */}
        <div className={`client-card-panel ${clientAnimate ? 'animate-new-client' : ''}`}>
          <div className="card-border-outer">
            <div className="card-border-inner">
              <div className="card-content client-content">

                {/* === КЛИМАКС ВЫБОР (перекрывает контент) === */}
                {climaxReached && climaxOutcomes && climaxOutcomes.length > 0 && (
                  <div className="climax-overlay-dos">
                    <div className="climax-header-dos">
                      <span className="climax-icon-dos">💦</span>
                      <h2 className="climax-title-dos">КУЛЬМИНАЦИЯ</h2>
                    </div>
                    <p className="climax-text-dos">ВЫБЕРИТЕ ИСХОД...</p>
                    <div className="climax-outcomes-dos">
                      {climaxOutcomes.map((outcome, idx) => (
                        <button
                          key={idx}
                          className="dos-button climax-choice-dos"
                          onClick={() => onSelectClimax && onSelectClimax(outcome.id)}
                        >
                          {`> ${outcome.text || outcome.name}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Верхняя строка: доверие + размер + тип */}
                <div className="client-top-row">
                  {trustBadge && (
                    <span className="trust-badge-dos" style={{ color: trustBadge.color }}>
                      {trustBadge.icon} {trustBadge.name}
                    </span>
                  )}
                  <span className="client-size-tag">
                    РАЗМЕР: {(clientData.size?.name || 'СРЕДНИЙ').toUpperCase()}
                  </span>
                  <span className="client-type-tag">
                    {(clientData.type?.name || 'ОБЫЧНЫЙ').toUpperCase()}
                  </span>
                </div>

                {/* Описание */}
                <div className="client-description-box">
                  <p className="client-description-text">
                    {clientCard.text || clientData.description || 'НЕИЗВЕСТНЫЙ КЛИЕНТ'}
                  </p>
                </div>

                {/* Шкала возбуждения — единая строка 100% ширины */}
                <div className="arousal-box">
                  <div className="arousal-full-row">
                    {/* Левая часть: иконка + прогресс-бар + проценты */}
                    <div className="arousal-bar-section">
                      <div className="arousal-bar-inner">
                        <span className="arousal-icon">🍆</span>
                        <div className="arousal-progress-track">
                          <div 
                            className="arousal-progress-fill" 
                            style={{ 
                              width: `${arousalPercent}%`,
                              backgroundColor: arousalColor
                            }}
                          />
                        </div>
                        <span className="arousal-percent" style={{ color: arousalColor }}>{arousalPercent}%</span>
                      </div>
                    </div>
                    {/* Правая часть: фаза */}
                    <div className="arousal-phase-section">
                      <span className="arousal-phase-text" style={{ color: arousalColor }}>
                        {arousalState}
                      </span>
                    </div>
                  </div>
                  {/* Разделительная линия */}
                  <div className="arousal-divider" />
                  
                  {/* Подсказка стратегии для фазы */}
                  <div className="strategy-hint-box">
                    <span className="strategy-hint-text">
                      {arousalPercent < 0 && '🩶 soft: Разогрев: начни с мягких действий'}
                      {arousalPercent >= 0 && arousalPercent < 25 && '🟢 interested: Интерес: используй базовые действия'}
                      {arousalPercent >= 25 && arousalPercent < 50 && '🔵 excited: Возбуждение: увеличивай интенсивность'}
                      {arousalPercent >= 50 && arousalPercent < 75 && '🟣 ready: Готовность: мощные действия работают лучше'}
                      {arousalPercent >= 75 && arousalPercent < 95 && '🟠 edge: НА КРАЮ: тизинг для бонусов или финал!'}
                      {arousalPercent >= 95 && '🔴 climax: КУЛЬМИНАЦИЯ: выбери исход'}
                    </span>
                  </div>
                </div>

                {/* Модификаторы (настроение + особенности) */}
                {(moodState || clientCard.modifierInfo?.length > 0 || clientData.modifiers?.length > 0) && (
                  <div className="modifiers-box">
                    <span className="modifiers-label">✨ ОСОБЕННОСТИ:</span>
                    <div className="modifier-tags-row">
                      {/* Настроение как модификатор */}
                      {moodState && (
                        <span
                          className="modifier-tag-dos"
                          style={{
                            borderColor: getModifierBadge(moodState.current)?.color || '#888888',
                            color: getModifierBadge(moodState.current)?.color || '#888888'
                          }}
                        >
                          {getModifierBadge(moodState.current)?.icon} {getModifierBadge(moodState.current)?.name || moodState.current.toUpperCase()}
                        </span>
                      )}
                      {/* Остальные модификаторы */}
                      {(clientCard.modifierInfo || clientData.modifiers || []).map((mod, idx) => {
                        const modId = typeof mod === 'string' ? mod : mod.id;
                        const badge = getModifierBadge(modId);
                        return (
                          <span
                            key={idx}
                            className="modifier-tag-dos"
                            style={{ borderColor: badge.color, color: badge.color }}
                          >
                            {badge.icon} {badge.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Фетиши */}
                {clientData.fetishes && clientData.fetishes.length > 0 && (
                  <div className="fetishes-box">
                    <span className="fetishes-label">💡 ФЕТИШИ:</span>
                    <div className="fetishes-row">
                      {clientCard.revealedFetishes && clientCard.revealedFetishes.map((fetish, idx) => (
                        <span key={idx} className="fetish-tag-dos">{fetish}</span>
                      ))}
                      {(!clientCard.revealedFetishes || clientCard.revealedFetishes.length < clientData.fetishes.length) && (
                        <span className="fetish-tag-dos hidden">❓ ???</span>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
            {/* Угловые символы для внешней рамки (розовые) */}
            <span className="corner-tl">╔</span>
            <span className="corner-tr">╗</span>
            <span className="corner-bl">╚</span>
            <span className="corner-br">╝</span>
            {/* Угловые символы для внутренней рамки (голубые) */}
            <span className="corner-tl inner">╔</span>
            <span className="corner-tr inner">╗</span>
            <span className="corner-bl inner">╚</span>
            <span className="corner-br inner">╝</span>
          </div>
        </div>

        {/* === КАРТЫ ДЕЙСТВИЙ === */}
        <div className={`actions-container-dos ${cardsAnimate ? 'animate-new-cards' : ''}`}>
          {actionCards.length === 0 ? (
            <div className="no-actions-dos">
              <div className="card-border-outer">
                <div className="card-border-inner">
                  <div className="card-content">
                    <p>НЕТ ДЕЙСТВИЙ</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            actionCards.map((action, index) => {
              const intensityData = getIntensityData(action.intensity || 'normal');
              // v0.7: stamina в effects.stamina
              const staminaCost = action.effects?.stamina || action.staminaCost || 5;
              const canAfford = playerStamina >= staminaCost;
              const isUsed = usedCardIdx === index;
              const isFading = usedCardIdx !== null && usedCardIdx !== index;

              // Проверка повторов
              const usageCount = actionUsage[action.id] || 0;
              const isRepeated = usageCount > 0;
              const isBlocked = usageCount >= 3;
              const repeatLabel = usageCount > 0 ? `(${usageCount}x)` : '';

              // Расчёт diminishing returns для шанса успеха
              let effectiveSuccessChance = action.successChance;
              let diminishingPenalty = 0;
              if (usageCount > 0) {
                diminishingPenalty = 0.15 * usageCount; // -15% за каждое повторение
                effectiveSuccessChance = Math.max(0.3, action.successChance - diminishingPenalty);
              }
              const chancePercent = Math.round(effectiveSuccessChance * 100);
              // Показываем только итоговый шанс (без "-15%" текста)

              // Проверка предметов
              const availableItem = inventorySystem ?
                inventorySystem.getAllItems().find(item =>
                  inventorySystem.hasItem(item.id) &&
                  inventorySystem.canActivateOnAction(item.id, action.id)
                ) : null;
              const hasItem = !!availableItem;
              const isActivating = activatingItem === availableItem?.id;

              return (
                <button
                  key={index}
                  className={`action-card-dos ${isUsed ? 'used' : ''} ${isFading ? 'fading' : ''} ${isActivating ? 'activating' : ''} ${isRepeated ? 'repeated' : ''} ${isBlocked ? 'blocked' : ''}`}
                  onClick={() => handlePlayAction(index)}
                  disabled={!canAfford || isUsed || isBlocked}
                  style={{
                    opacity: isFading ? 0.3 : 1
                  }}
                >
                  <div className="card-border-outer">
                    <div className="card-border-inner">
                      <div className="card-content action-content">

                        {/* Маркер повтора */}
                        {isRepeated && (
                          <div className={`repeat-marker-dos ${usageCount >= 2 ? 'warning' : ''} ${isBlocked ? 'blocked' : ''}`}>
                            <span className="repeat-icon">🔄</span>
                            <span className="repeat-count">{repeatLabel}</span>
                          </div>
                        )}

                        {/* Слот предмета */}
                        {hasItem && (
                          <div className="item-slot-dos">
                            <button
                              className="item-button-dos"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActivateItem(availableItem.id, action.id);
                              }}
                              title={`Активировать: ${availableItem.name}`}
                            >
                              <span className="item-icon">{availableItem.icon}</span>
                              <span className="item-name-dos">{availableItem.name}</span>
                            </button>
                          </div>
                        )}

                        {/* Требования навыков */}
                        {action.requiredSkills && Object.keys(action.requiredSkills).length > 0 && (
                          <div className="skill-req-dos">
                            {Object.entries(action.requiredSkills).map(([skill, level]) => (
                              <span key={skill} className="skill-req-text">
                                {skill.toUpperCase()}: {level}+
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Эффекты */}
                        <div className="effects-dos">
                          <span className="effect-text">
                            {action.effects?.arousal > 0 ? '+' : ''}{action.effects?.arousal || action.baseArousalGain || 0} AROUSAL
                          </span>
                          <span className="effect-chance">
                            ШАНС: {chancePercent}%
                          </span>
                        </div>

                        {/* Название */}
                        <h3 className="action-name-dos">{action.name}</h3>

                        {/* Стоимость */}
                        <div className="cost-dos">
                          <span className={`cost-stamina ${!canAfford ? 'cant-afford' : ''}`}>
                            ⚡{staminaCost}
                          </span>
                          {action.effects?.mental > 0 && (
                            <span className="cost-mental">
                              🧠{action.effects.mental}
                            </span>
                          )}
                        </div>

                        {/* Интенсивность */}
                        <div className="intensity-dos" style={{ color: intensityData.color }}>
                          {intensityData.icon} {intensityData.name}
                        </div>

                        {/* Индикатор edge stacking */}
                        {action?.edgeStackGain > 0 && sessionEdgeStacks > 0 && (
                          <div className="edge-stack-indicator-dos">
                            <span className="edge-stack-icon">⚡</span>
                            <span className="edge-stack-text">{sessionEdgeStacks}/5 (+{sessionEdgeStacks * 10}%)</span>
                          </div>
                        )}

                        {/* Теги */}
                        {action.tags && action.tags.length > 0 && (
                          <div className="tags-dos">
                            {action.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="tag-dos">[{tag.toUpperCase()}]</span>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                    {/* Угловые символы для внешней рамки */}
                    <span className="corner-tl">╔</span>
                    <span className="corner-tr">╗</span>
                    <span className="corner-bl">╚</span>
                    <span className="corner-br">╝</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

      </div>

      <style>{`
        /* === ОБЩИЕ СТИЛИ === */
        .card-view.dos-style {
          width: 100%;
          max-width: 100%;
          padding: 10px;
          box-sizing: border-box;
          font-family: 'Courier New', Courier, monospace;
          background: #c0c0c0;
        }

        .three-cards-layout {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        /* === ДВОЙНЫЕ РАМКИ С СИМВОЛАМИ ╔╗╚╝ === */
        .card-border-outer {
          position: relative;
          border: 3px solid #e94560;
          border-radius: 0;
          padding: 3px;
          background: #e94560;
          box-shadow:
            4px 4px 0 rgba(0, 0, 0, 0.4),
            8px 8px 0 rgba(0, 0, 0, 0.3),
            12px 12px 0 rgba(0, 0, 0, 0.2);
        }

        .card-border-inner {
          border: 2px solid #00d9ff;
          border-radius: 0;
          background: #000000;
          position: relative;
        }

        /* === УГЛОВЫЕ СИМВОЛЫ ╔╗╚╝ — АБСОЛЮТНОЕ ПОЗИЦИОНИРОВАНИЕ === */
        /* Верхние углы для внешней рамки (розовые) */
        .corner-tl {
          position: absolute;
          top: -3px;
          left: -3px;
          color: #e94560;
          font-size: 14px;
          line-height: 1;
          pointer-events: none;
          background: #e94560;
          padding: 0 3px;
          z-index: 2;
        }

        .corner-tr {
          position: absolute;
          top: -3px;
          right: -3px;
          color: #e94560;
          font-size: 14px;
          line-height: 1;
          pointer-events: none;
          background: #e94560;
          padding: 0 3px;
          z-index: 2;
        }

        /* Нижние углы для внешней рамки (розовые) */
        .corner-bl {
          position: absolute;
          bottom: -3px;
          left: -3px;
          color: #e94560;
          font-size: 14px;
          line-height: 1;
          pointer-events: none;
          background: #e94560;
          padding: 0 3px;
          z-index: 2;
        }

        .corner-br {
          position: absolute;
          bottom: -3px;
          right: -3px;
          color: #e94560;
          font-size: 14px;
          line-height: 1;
          pointer-events: none;
          background: #e94560;
          padding: 0 3px;
          z-index: 2;
        }

        /* Внутренние углы (голубые) — для карточек событий и клиента */
        .client-card-panel .corner-tl.inner,
        .client-card-panel .corner-tr.inner,
        .client-card-panel .corner-bl.inner,
        .client-card-panel .corner-br.inner,
        .event-card .corner-tl.inner,
        .event-card .corner-tr.inner,
        .event-card .corner-bl.inner,
        .event-card .corner-br.inner {
          position: absolute;
          color: #00d9ff;
          background: #000000;
          font-size: 12px;
          padding: 0 2px;
          line-height: 1;
          pointer-events: none;
          z-index: 3;
        }

        .client-card-panel .corner-tl.inner,
        .event-card .corner-tl.inner {
          top: -2px;
          left: -2px;
        }

        .client-card-panel .corner-tr.inner,
        .event-card .corner-tr.inner {
          top: -2px;
          right: -2px;
        }

        .client-card-panel .corner-bl.inner,
        .event-card .corner-bl.inner {
          bottom: -2px;
          left: -2px;
        }

        .client-card-panel .corner-br.inner,
        .event-card .corner-br.inner {
          bottom: -2px;
          right: -2px;
        }

        /* Для карт действий — зелёные внешние углы */
        .action-card-dos .corner-tl,
        .action-card-dos .corner-tr,
        .action-card-dos .corner-bl,
        .action-card-dos .corner-br {
          color: #00ff88;
          background: #00ff88;
        }

        /* Для заглушки — серые углы */
        .no-card .corner-tl,
        .no-card .corner-tr,
        .no-card .corner-bl,
        .no-card .corner-br,
        .no-actions-dos .corner-tl,
        .no-actions-dos .corner-tr,
        .no-actions-dos .corner-bl,
        .no-actions-dos .corner-br {
          color: #888888;
          background: #888888;
        }

        .no-card .corner-tl.inner,
        .no-card .corner-tr.inner,
        .no-card .corner-bl.inner,
        .no-card .corner-br.inner,
        .no-actions-dos .corner-tl.inner,
        .no-actions-dos .corner-tr.inner,
        .no-actions-dos .corner-bl.inner,
        .no-actions-dos .corner-br.inner {
          color: #666666;
          background: #000000;
        }

        .card-content {
          padding: 12px;
          color: #f0f0f0;
          position: relative;
          z-index: 1;
        }

        /* === КАРТА КЛИЕНТА === */
        .client-card-panel {
          width: 100%;
          position: relative;
        }

        .client-content {
          min-height: 280px;
          position: relative;
        }

        /* === CLIMAX OVERLAY === */
        .climax-overlay-dos {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .climax-header-dos {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .climax-icon-dos {
          font-size: 24px;
        }

        .climax-title-dos {
          font-size: 16px;
          color: #ff0055;
          margin: 0;
          font-weight: bold;
        }

        .climax-text-dos {
          font-size: 11px;
          color: #888888;
          margin-bottom: 20px;
        }

        .climax-outcomes-dos {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .climax-choice-dos {
          font-size: 11px;
          padding: 10px;
          text-align: left;
          border: 2px solid #ff0055;
          background: rgba(255, 0, 85, 0.1);
          color: #ff0055;
          transition: all 0.2s;
        }

        .climax-choice-dos:hover {
          background: rgba(255, 0, 85, 0.3);
          transform: translateY(-2px);
        }

        /* Анимация исчезновения для пройденной карты */
        .client-card-panel.fade-out {
          animation: fadeOutDissolve 0.6s ease-out forwards;
        }

        @keyframes fadeOutDissolve {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.95);
          }
        }

        .client-top-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 10px;
          font-weight: bold;
        }

        .trust-badge-dos {
          padding: 3px 8px;
          border: 1px solid;
          border-radius: 0;
          background: rgba(0, 0, 0, 0.5);
        }

        .client-size-tag,
        .client-type-tag {
          padding: 3px 8px;
          border: 1px solid #888888;
          border-radius: 0;
          color: #888888;
          background: rgba(0, 0, 0, 0.5);
        }

        .client-description-box {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #333333;
          border-radius: 0;
          padding: 8px;
          margin-bottom: 10px;
          max-height: 80px;
          overflow-y: auto;
        }

        .client-description-text {
          font-size: 11px;
          line-height: 1.4;
          margin: 0;
          color: #cccccc;
        }

        .arousal-box {
          background: rgba(233, 69, 96, 0.1);
          border: 1px solid #e94560;
          border-radius: 0;
          padding: 10px;
          margin-bottom: 10px;
        }

        /* === ЕДИНАЯ СТРОКА ШКАЛЫ AROUSAL 100% === */
        .arousal-full-row {
          display: flex;
          width: 100%;
          gap: 12px;
          align-items: center;
        }

        .arousal-bar-section {
          flex: 1;
          min-width: 0;
        }

        .arousal-bar-inner {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .arousal-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .arousal-progress-track {
          flex: 1;
          height: 14px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #444444;
          border-radius: 0;
          position: relative;
          overflow: hidden;
        }

        .arousal-progress-fill {
          height: 100%;
          transition: width 0.3s ease;
          position: relative;
        }

        /* Текстура для прогресс-бара */
        .arousal-progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.2) 2px,
              rgba(0, 0, 0, 0.2) 4px
            );
        }

        .arousal-percent {
          font-size: 11px;
          font-weight: bold;
          min-width: 45px;
          text-align: right;
        }

        .arousal-phase-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-left: 1px solid #444444;
          padding-left: 12px;
        }

        .arousal-phase-text {
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: bold;
          font-size: 11px;
          text-align: center;
        }

        .arousal-divider {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            #e94560 20%,
            #e94560 80%,
            transparent
          );
          margin-top: 8px;
          opacity: 0.5;
        }

        /* Подсказка стратегии */
        .strategy-hint-box {
          margin-top: 8px;
          padding: 6px 8px;
          background: rgba(233, 69, 96, 0.15);
          border: 1px dashed #e94560;
          border-radius: 0;
          text-align: center;
        }

        .strategy-hint-text {
          font-size: 9px;
          color: #e94560;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Старые классы для совместимости */
        .arousal-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
          font-size: 10px;
          font-weight: bold;
        }

        .arousal-state-text {
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .arousal-bar-dos {
          font-size: 14px;
          letter-spacing: 1px;
          line-height: 1;
          font-weight: bold;
        }

        .modifiers-box {
          margin-bottom: 10px;
        }

        .modifiers-label {
          display: block;
          font-size: 9px;
          color: #888888;
          margin-bottom: 5px;
        }

        .modifier-tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .modifier-tag-dos {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border: 1px solid;
          border-radius: 0;
          background: rgba(0, 0, 0, 0.5);
          font-size: 9px;
          text-transform: uppercase;
        }

        .fetishes-box {
          margin-top: 10px;
        }

        .fetishes-label {
          display: block;
          font-size: 9px;
          color: #888888;
          margin-bottom: 5px;
        }

        .fetishes-row {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .fetish-tag-dos {
          padding: 3px 8px;
          border: 1px solid #666666;
          border-radius: 0;
          background: rgba(100, 100, 100, 0.2);
          font-size: 9px;
          color: #aaaaaa;
        }

        .fetish-tag-dos.hidden {
          border-color: #444444;
          color: #666666;
        }

        /* === КАРТЫ ДЕЙСТВИЙ — РЯДОМ === */
        .actions-container-dos {
          display: flex;
          flex-direction: row;
          gap: 12px;
          justify-content: center;
        }

        .action-card-dos {
          flex: 1;
          max-width: 280px;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-card-dos .card-border-outer {
          border-color: #00ff88;
          background: #00ff88;
          box-shadow: 
            4px 4px 0 rgba(0, 0, 0, 0.4),
            8px 8px 0 rgba(0, 0, 0, 0.3),
            12px 12px 0 rgba(0, 0, 0, 0.2);
        }

        .action-card-dos .card-border-inner {
          border-color: #00d9ff;
        }

        .action-card-dos:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .action-card-dos:hover .card-border-outer {
          box-shadow: 
            6px 6px 0 rgba(0, 0, 0, 0.5),
            10px 10px 0 rgba(0, 0, 0, 0.4),
            14px 14px 0 rgba(0, 0, 0, 0.3);
        }

        .action-card-dos:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        /* Маркер повтора */
        .action-card-dos.repeated .card-border-outer {
          border-color: #ffaa00;
          background: #ffaa00;
        }

        .action-card-dos.blocked .card-border-outer {
          border-color: #666666;
          background: #666666;
          opacity: 0.6;
        }

        .repeat-marker-dos {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 3px 6px;
          background: rgba(255, 170, 0, 0.2);
          border: 1px solid #ffaa00;
          border-radius: 0;
          margin-bottom: 5px;
        }

        .repeat-marker-dos.warning {
          background: rgba(255, 170, 0, 0.35);
          border-color: #ff8800;
        }

        .repeat-marker-dos.blocked {
          background: rgba(100, 100, 100, 0.3);
          border-color: #666666;
        }

        .repeat-icon {
          font-size: 12px;
        }

        .repeat-count {
          font-size: 9px;
          font-weight: bold;
          color: #ffaa00;
          text-transform: uppercase;
        }

        .repeat-marker-dos.blocked .repeat-count {
          color: #888888;
        }

        .action-content {
          min-height: 200px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .item-slot-dos {
          margin-bottom: 5px;
        }

        .item-button-dos {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 8px;
          background: rgba(0, 255, 136, 0.15);
          border: 1px dashed #00ff88;
          border-radius: 0;
          cursor: pointer;
          font-family: inherit;
          font-size: 9px;
          color: #00ff88;
        }

        .item-button-dos:hover {
          background: rgba(0, 255, 136, 0.25);
        }

        .item-icon {
          font-size: 14px;
        }

        .item-name-dos {
          text-transform: uppercase;
          font-size: 8px;
        }

        .skill-req-dos {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 5px;
        }

        .skill-req-text {
          font-size: 8px;
          color: #666666;
          text-transform: uppercase;
        }

        .effects-dos {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 5px;
        }

        .effect-text {
          font-size: 10px;
          color: #00ff88;
          font-weight: bold;
        }

        .effect-chance {
          font-size: 9px;
          color: #888888;
        }

        .penalty-text {
          color: #ff0055;
          font-size: 8px;
          margin-left: 4px;
        }

        .action-name-dos {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          color: #00d9ff;
          margin: 5px 0;
          text-align: center;
        }

        .cost-dos {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 5px;
        }

        .cost-stamina,
        .cost-mental {
          font-size: 11px;
          font-weight: bold;
          padding: 3px 8px;
          border-radius: 0;
          background: rgba(0, 0, 0, 0.3);
        }

        .cost-stamina.cant-afford {
          color: #ff0055;
        }

        .intensity-dos {
          font-size: 10px;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .edge-stack-indicator-dos {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 4px 8px;
          background: rgba(255, 170, 0, 0.15);
          border: 1px solid #ffaa00;
          border-radius: 0;
          margin-bottom: 5px;
        }

        .edge-stack-icon {
          font-size: 14px;
        }

        .edge-stack-text {
          font-size: 9px;
          color: #ffaa00;
          font-weight: bold;
          text-transform: uppercase;
        }

        .tags-dos {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          justify-content: center;
        }

        .tag-dos {
          font-size: 8px;
          color: #666666;
        }

        /* === АНИМАЦИИ === */
        
        /* Подача карты крупье — дуга с cubic-bezier */
        @keyframes dealCard {
          from {
            opacity: 0;
            transform: translateY(-100px) translateX(50px) rotate(5deg) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(0deg) scale(1);
          }
        }

        /* Подача карт действий — дуга снизу */
        @keyframes dealCardNew {
          from {
            opacity: 0;
            transform: translateY(100px) translateX(-30px) rotate(-5deg) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(0deg) scale(1);
          }
        }

        /* Блеск по краю после появления */
        @keyframes shimmer {
          0%, 100% {
            box-shadow: 
              4px 4px 0 rgba(0, 0, 0, 0.4),
              8px 8px 0 rgba(0, 0, 0, 0.3),
              12px 12px 0 rgba(0, 0, 0, 0.2);
          }
          50% {
            box-shadow: 
              4px 4px 0 rgba(0, 217, 255, 0.5),
              8px 8px 0 rgba(0, 217, 255, 0.3),
              12px 12px 0 rgba(0, 217, 255, 0.2),
              0 0 20px rgba(0, 217, 255, 0.4);
          }
        }

        /* Блеск для зелёных карт действий */
        @keyframes shimmerGreen {
          0%, 100% {
            box-shadow: 
              4px 4px 0 rgba(0, 0, 0, 0.4),
              8px 8px 0 rgba(0, 0, 0, 0.3),
              12px 12px 0 rgba(0, 0, 0, 0.2);
          }
          50% {
            box-shadow: 
              4px 4px 0 rgba(0, 255, 136, 0.5),
              8px 8px 0 rgba(0, 255, 136, 0.3),
              12px 12px 0 rgba(0, 255, 136, 0.2),
              0 0 20px rgba(0, 255, 136, 0.4);
          }
        }

        /* Подъём снизу для карт действий */
        @keyframes slideUpCard {
          from {
            opacity: 0;
            transform: translateY(80px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }

        @keyframes wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }

        .animate-new-client {
          animation: dealCard 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-new-client .card-border-outer {
          animation: shimmer 0.7s ease-in-out 0.3s;
        }

        .animate-new-cards {
          animation: dealCardNew 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-new-cards .action-card-dos .card-border-outer {
          animation: shimmerGreen 0.6s ease-in-out 0.3s;
        }

        .animate-new-cards .action-card-dos:nth-child(2) {
          animation-delay: 0.1s;
        }

        .animate-new-cards .action-card-dos:nth-child(2) .card-border-outer {
          animation-delay: 0.4s;
        }

        .action-card-dos.used {
          animation: shake 0.3s ease-in-out;
        }

        .action-card-dos.fading {
          transition: opacity 0.3s ease-out;
        }

        .action-card-dos.activating .item-button-dos {
          animation: wobble 0.5s ease-in-out;
        }

        /* === СОБЫТИЯ === */
        .event-card {
          width: 100%;
        }

        .event-card .card-border-outer {
          border-color: #e94560;
          background: #e94560;
        }

        /* Углы для событий — розовые внешние, голубые внутренние */
        .event-card .corner-tl,
        .event-card .corner-tr,
        .event-card .corner-bl,
        .event-card .corner-br {
          color: #e94560;
          background: #e94560;
        }

        .event-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 12px;
          font-weight: bold;
          color: #00d9ff;
        }

        .event-icon {
          font-size: 18px;
        }

        .event-text {
          font-size: 11px;
          line-height: 1.5;
          color: #cccccc;
          margin-bottom: 15px;
        }

        .event-choices {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .event-choice {
          width: 100%;
          padding: 10px;
          background: rgba(0, 217, 255, 0.1);
          border: 1px solid #00d9ff;
          border-radius: 0;
          color: #00d9ff;
          font-family: inherit;
          font-size: 10px;
          text-align: left;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .event-choice:hover {
          background: rgba(0, 217, 255, 0.2);
        }

        /* === ЗАГЛУШКА === */
        .no-card .card-border-outer,
        .no-actions-dos .card-border-outer {
          border-color: #888888;
          background: #888888;
        }

        .loading-text {
          text-align: center;
          font-size: 12px;
          color: #666666;
          padding: 40px;
        }

        /* === iOS SAFE AREA === */
        @supports (padding: max(0px)) {
          .card-view.dos-style {
            padding-left: max(10px, env(safe-area-inset-left));
            padding-right: max(10px, env(safe-area-inset-right));
          }
        }
      `}</style>
    </div>
  );
}

export default CardView;
