/**
 * HubScreen - DOS Terminal Style
 * Gloryhole Quest - хаб (дом) между ночными сменами
 */

import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

function HubScreen({ hubState, onStartNight }) {
  const { state, dispatch, rest, upgradeSkill, startNight, restoreStamina, restoreMentalHealth, performHomeAction, buyItem } = useGame();
  
  // Используем hubState из пропсов или state.hub
  const hub = hubState || state.hub;
  const phase = state.phase;
  
  // Игрок из hub.player или state.game?.player
  const player = hub?.player || state.game?.player;

  const [notification, setNotification] = useState(null);
  const [showSkillsOverlay, setShowSkillsOverlay] = useState(false);
  const [showShopOverlay, setShowShopOverlay] = useState(false);
  const [performingAction, setPerformingAction] = useState(null);

  const skills = hub?.skills ? Object.values(hub.skills) : [];
  const upgradeCosts = hub?.upgradeCosts || {};
  const inventory = hub?.inventory || [];
  const shopItems = hub?.shopItems || [];
  const canStartNight = hub?.canStartNight !== false;
  const canRest = hub?.canRest || false;
  const sessionCompleted = hub?.sessionCompleted || false;
  const needsRest = hub?.needsRest || false;
  const day = hub?.day || 1;
  const actionPoints = hub?.actionPoints || 3;
  const maxActionPoints = hub?.maxActionPoints || 3;
  const actionPointsBonus = hub?.actionPointsBonus || 0;
  const reputation = hub?.reputation || 0;
  const dailyActions = hub?.dailyActions || {};

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpgradeSkill = (skillId) => {
    const result = upgradeSkill(skillId);
    if (result.success) {
      showNotification(`✅ "${getSkillDisplayName(skillId)}" → ур. ${result.newLevel}!`, 'success');
    } else {
      showNotification(`❌ ${result.reason}`, 'error');
    }
  };

  const handleRest = () => {
    const result = rest();
    if (result.success) {
      showNotification(`🌙 День ${result.day} | Восстановлено!`, 'success');
    } else {
      showNotification(`❌ ${result.reason}`, 'error');
    }
  };

  const handleRestoreStamina = () => {
    const result = restoreStamina(50);
    if (result.success) {
      showNotification(`💤 +${result.restored} стамины (-$${result.cost})`, 'success');
    } else {
      showNotification(`❌ ${result.reason}`, 'error');
    }
  };

  const handleRestoreMental = () => {
    const result = restoreMentalHealth(50);
    if (result.success) {
      showNotification(`🛁 +${result.restored} психики (-$${result.cost})`, 'success');
    } else {
      showNotification(`❌ ${result.reason}`, 'error');
    }
  };

  const handleHomeAction = (actionId, actionName) => {
    if (performingAction) return;
    setPerformingAction({ actionId, actionName });
    setTimeout(() => {
      const result = performHomeAction(actionId);
      setPerformingAction(null);
      if (result.success) {
        showNotification(result.effect || result.message, 'success');
      } else {
        showNotification(`❌ ${result.reason}`, 'error');
      }
    }, 1500);
  };

  const getSkillDisplayName = (skillId) => {
    const skill = skills.find(s => s.id === skillId);
    return skill?.name || skillId;
  };

  const canAffordUpgrade = (skillId) => {
    const cost = upgradeCosts[skillId];
    return player?.stats?.xp >= cost;
  };

  const isMaxLevel = (skill) => skill.level >= skill.maxLevel;

  const handleBuyItem = (itemId) => {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;
    const result = buyItem(itemId);
    if (result.success) {
      showNotification(`✅ Куплено: ${item.icon} ${item.name} (-$${result.cost})`, 'success');
    } else {
      showNotification(`❌ ${result.reason}`, 'error');
    }
  };

  const canAffordItem = (itemId) => {
    const item = shopItems.find(i => i.id === itemId);
    return item && player?.stats?.money >= item.price;
  };

  const hasItem = (itemId) => inventory.some(i => i.id === itemId);

  const energyActions = [
    { id: 'relax', name: 'Расслабиться', icon: '🧘', effect: '+1 ⚡', requiresItem: null },
    { id: 'masturbation', name: 'Ласка', icon: '🔞', effect: '+40 🧠', requiresItem: null },
    { id: 'play_cat', name: 'Кот', icon: '🐱', effect: '+30 💪 +20 🧠', requiresItem: 'cat' },
    { id: 'erotic_chat', name: 'Чат', icon: '📱', effect: '+25 🧠 +15 💪', requiresItem: null }
  ].filter(action => !action.requiresItem || hasItem(action.requiresItem));

  return (
    <div className="hub-screen dos-terminal">
      {/* Уведомления */}
      {notification && (
        <div className={`notification-dos notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Логотип - кнопка начала */}
      <button
        className="quest-logo-dos"
        onClick={() => {
          const result = startNight();
          if (result.success && onStartNight) onStartNight();
          else if (!result.success) showNotification(`❌ ${result.reason}`, 'error');
        }}
        disabled={!canStartNight}
      >
        <div className="logo-content">
          {needsRest && <span className="logo-warning">⚠️ ОТДОХНИ СНАЧАЛА!</span>}
          {!needsRest && !canStartNight && <span className="logo-warning">⚠️ НУЖНО 10+ ⚡</span>}
          <span className="logo-text">GLORYHOLE QUEST</span>
        </div>
      </button>

      {/* Инфо игрока */}
      <div className="player-info-dos">
        <div className="player-row">
          <span className="player-name">🏠 {player?.name}</span>
          <span className="day-text">📅 ДЕНЬ {day}</span>
        </div>
        <div className="rep-row">
          <span className="rep-level">🏆 {reputation.levelName}</span>
          <div className="rep-bar-dos">
            <div className="rep-fill-dos" style={{ width: `${Math.min(100, reputation.reputation)}%` }} />
          </div>
          <span className="rep-stats">{reputation.satisfactionRate}% удовл.</span>
        </div>
      </div>

      {/* Статы */}
      <div className="stats-grid-dos">
        <div className="stat-row-dos">
          <div className="stat-dos stamina"><span>⚡</span><span>{player?.stats?.stamina}/{player?.stats?.maxStamina}</span></div>
          <div className="stat-divider">|</div>
          <div className="stat-dos mental"><span>🧠</span><span>{player?.stats?.mental_health}/{player?.stats?.maxMentalHealth}</span></div>
          <div className="stat-divider">|</div>
          <div className="stat-dos actions"><span>✨</span><span>{actionPoints}/{maxActionPoints}{actionPointsBonus > 0 && `(+${actionPointsBonus})`}</span></div>
        </div>
        <div className="stat-row-dos">
          <div className="stat-dos money"><span>💰</span><span>${player?.stats?.money}</span></div>
          <div className="stat-divider">|</div>
          <div className="stat-dos level"><span>⭐</span><span>ур.{player?.stats?.level}</span></div>
          <div className="stat-divider">|</div>
          <div className="stat-dos xp"><span>✨</span><span>{player?.stats?.xp} XP</span></div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="quick-actions-dos">
        <button className="quick-btn-dos rest" onClick={handleRest} disabled={!canRest || performingAction}>
          <span className="btn-icon">🌙</span>
          <span className="btn-text">ОТДОХНУТЬ</span>
          <span className="btn-sub">{canRest ? `ДЕНЬ ${day}→${day+1}` : 'СНАЧАЛА СМЕНА!'}</span>
        </button>
        <button className="quick-btn-dos" onClick={handleRestoreStamina} disabled={player?.stats?.stamina >= player?.stats?.maxStamina || performingAction}>
          <span className="btn-icon">💤</span>
          <span className="btn-text">ОТДЫХ</span>
          <span className="btn-cost">-$20</span>
        </button>
        <button className="quick-btn-dos" onClick={handleRestoreMental} disabled={player?.stats?.mental_health >= player?.stats?.maxMentalHealth || performingAction}>
          <span className="btn-icon">🛁</span>
          <span className="btn-text">ВАННА</span>
          <span className="btn-cost">-$30</span>
        </button>
      </div>

      {/* Кнопки */}
      <div className="buttons-row-dos">
        <button className="hub-btn-dos skills" onClick={() => setShowSkillsOverlay(true)} disabled={performingAction}>
          <span className="btn-icon-dos">📚</span><span className="btn-text-dos">НАВЫКИ</span>
        </button>
        <button className="hub-btn-dos shop" onClick={() => setShowShopOverlay(true)} disabled={performingAction}>
          <span className="btn-icon-dos">🛍️</span><span className="btn-text-dos">МАГАЗИН</span>
        </button>
      </div>

      {/* Домашние действия */}
      {energyActions.length > 0 && (
        <div className="actions-section-dos">
          <h3 className="actions-title-dos">⚡ ДЕЙСТВИЯ ({actionPoints}/{maxActionPoints}{actionPointsBonus > 0 && ` +${actionPointsBonus}`})</h3>
          <div className="actions-grid-dos">
            {energyActions.map(action => (
              <button
                key={action.id}
                className={`action-btn-dos ${performingAction?.actionId === action.id ? 'performing' : ''}`}
                onClick={() => handleHomeAction(action.id, action.name)}
                disabled={performingAction || actionPoints < 1}
              >
                <span className="action-icon-dos">{action.icon}</span>
                <span className="action-name-dos">{action.name}</span>
                <span className="action-effect-dos">{action.effect}</span>
                {performingAction?.actionId === action.id && (
                  <><div className="progress-dos"><div className="progress-fill-dos" /></div><span className="performing-dos">...</span></>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Оверлей навыков */}
      {showSkillsOverlay && (
        <div className="overlay-dos" onClick={() => setShowSkillsOverlay(false)}>
          <div className="overlay-content-dos" onClick={e => e.stopPropagation()}>
            <div className="overlay-header-dos">
              <h2>📚 НАВЫКИ</h2>
              <button className="close-btn-dos" onClick={() => setShowSkillsOverlay(false)}>✕</button>
            </div>
            <div className="overlay-list-dos">
              {skills.map(skill => (
                <div key={skill.id} className="skill-card-dos">
                  <div className="skill-header-dos">
                    <span className="skill-name-dos">{skill.name}</span>
                    <span className="skill-level-dos">ур.{skill.level}/{skill.maxLevel}</span>
                  </div>
                  <p className="skill-desc-dos">{skill.description}</p>
                  <div className="skill-progress-dos">
                    <div className="skill-fill-dos" style={{ width: `${(skill.level / skill.maxLevel) * 100}%` }} />
                  </div>
                  <button
                    className={`upgrade-btn-dos ${isMaxLevel(skill) ? 'maxed' : ''} ${!canAffordUpgrade(skill.id) ? 'cant-afford' : ''}`}
                    onClick={() => handleUpgradeSkill(skill.id)}
                    disabled={isMaxLevel(skill) || !canAffordUpgrade(skill.id)}
                  >
                    {isMaxLevel(skill) ? 'МАКСИМУМ' : `✨ ${upgradeCosts[skill.id]} XP → ур.${skill.level + 1}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Оверлей магазина */}
      {showShopOverlay && (
        <div className="overlay-dos" onClick={() => setShowShopOverlay(false)}>
          <div className="overlay-content-dos" onClick={e => e.stopPropagation()}>
            <div className="overlay-header-dos">
              <h2>🛍️ МАГАЗИН</h2>
              <button className="close-btn-dos" onClick={() => setShowShopOverlay(false)}>✕</button>
            </div>
            <div className="overlay-list-dos">
              {shopItems.map(item => {
                const owned = hasItem(item.id);
                const canAfford = canAffordItem(item.id);
                const consumable = item.category === 'consumable';
                return (
                  <div key={item.id} className="skill-card-dos">
                    <div className="skill-header-dos">
                      <span className="skill-name-dos">{item.icon} {item.name}</span>
                      <span className="skill-level-dos">{owned && !consumable ? '✅' : `$${item.price}`}</span>
                    </div>
                    <p className="skill-desc-dos">{item.description}</p>
                    <button
                      className={`upgrade-btn-dos ${owned && !consumable ? 'maxed' : ''} ${!canAfford ? 'cant-afford' : ''}`}
                      onClick={() => handleBuyItem(item.id)}
                      disabled={owned && !consumable}
                    >
                      {owned && !consumable ? 'КУПЛЕНО' : `💰 $${item.price}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hub-screen.dos-terminal {
          min-height: 100vh;
          background: #1a1a1a;
          padding: 10px;
          font-family: 'Courier New', Courier, monospace;
        }
        @supports (padding: max(0px)) {
          .hub-screen.dos-terminal {
            padding-top: max(10px, env(safe-area-inset-top));
            padding-bottom: max(10px, env(safe-area-inset-bottom));
          }
        }
        .notification-dos {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2000;
          padding: 10px 20px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          animation: slideDown 0.3s ease-out;
        }
        .notification-success { background: #00ff88; color: #000; border: 2px solid #00ff88; }
        .notification-error { background: #ff0055; color: #fff; border: 2px solid #ff0055; }
        .notification-info { background: #00d9ff; color: #000; border: 2px solid #00d9ff; }
        @keyframes slideDown { from { top: -50px; opacity: 0; } to { top: 20px; opacity: 1; } }
        
        .quest-logo-dos {
          width: 100%;
          max-width: 400px;
          margin: 0 auto 15px;
          padding: 20px;
          background: #000;
          border: 3px solid #e94560;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 0 20px rgba(233, 69, 96, 0.4);
        }
        .quest-logo-dos:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 0 30px rgba(233, 69, 96, 0.7); }
        .quest-logo-dos:disabled { opacity: 0.5; cursor: not-allowed; }
        .logo-content { display: flex; flex-direction: column; gap: 8px; align-items: center; }
        .logo-text { font-size: 18px; font-weight: 900; color: #e94560; letter-spacing: 3px; text-shadow: 0 0 10px rgba(233, 69, 96, 0.5); }
        .logo-warning { font-size: 10px; color: #ffaa00; text-transform: uppercase; }
        
        .player-info-dos {
          max-width: 400px;
          margin: 0 auto 15px;
          background: #000;
          border: 2px solid #333;
          border-radius: 6px;
          padding: 12px;
        }
        .player-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .player-name { font-size: 12px; color: #e94560; font-weight: bold; }
        .day-text { font-size: 11px; color: #a78bfa; }
        .rep-row { display: flex; align-items: center; gap: 8px; border-top: 1px solid #333; padding-top: 8px; }
        .rep-level { font-size: 10px; color: #a78bfa; white-space: nowrap; }
        .rep-bar-dos { flex: 1; height: 6px; background: #222; border-radius: 3px; overflow: hidden; }
        .rep-fill-dos { height: 100%; background: linear-gradient(90deg, #a78bfa, #8b5cf6); }
        .rep-stats { font-size: 9px; color: #666; }
        
        .stats-grid-dos { max-width: 400px; margin: 0 auto 15px; display: flex; flex-direction: column; gap: 8px; }
        .stat-row-dos { display: flex; align-items: center; background: #000; border: 1px solid #444; border-radius: 4px; padding: 8px; }
        .stat-dos { display: flex; align-items: center; gap: 5px; font-size: 10px; flex: 1; justify-content: center; }
        .stat-divider { color: #444; font-size: 8px; }
        .stat-dos.stamina { color: #fbbf24; }
        .stat-dos.mental { color: #a78bfa; }
        .stat-dos.actions { color: #f97316; }
        .stat-dos.money { color: #4ade80; }
        .stat-dos.level { color: #f472b6; }
        .stat-dos.xp { color: #a78bfa; }
        
        .quick-actions-dos { max-width: 400px; margin: 0 auto 15px; display: flex; gap: 8px; }
        .quick-btn-dos { flex: 1; padding: 10px 6px; background: #000; border: 1px solid #444; border-radius: 4px; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; transition: all 0.2s; }
        .quick-btn-dos:hover:not(:disabled) { border-color: #666; background: #111; }
        .quick-btn-dos:disabled { opacity: 0.4; cursor: not-allowed; }
        .quick-btn-dos.rest { border-color: #a78bfa; }
        .btn-icon { font-size: 16px; }
        .btn-text { font-size: 9px; color: #f0f0f0; font-weight: bold; }
        .btn-cost { font-size: 8px; color: #fbbf24; }
        .btn-sub { font-size: 7px; color: #a78bfa; }
        
        .buttons-row-dos { max-width: 400px; margin: 0 auto 15px; display: flex; gap: 10px; }
        .hub-btn-dos { flex: 1; padding: 12px; background: #000; border: 2px solid; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; }
        .hub-btn-dos.skills { border-color: #e94560; color: #e94560; }
        .hub-btn-dos.shop { border-color: #a78bfa; color: #a78bfa; }
        .hub-btn-dos:hover:not(:disabled) { transform: translateY(-2px); }
        .btn-icon-dos { font-size: 18px; }
        .btn-text-dos { font-size: 11px; font-weight: bold; }
        
        .actions-section-dos { max-width: 400px; margin: 0 auto 15px; }
        .actions-title-dos { font-size: 11px; color: #e94560; margin: 0 0 10px 0; text-align: center; }
        .actions-grid-dos { display: flex; gap: 8px; flex-wrap: wrap; }
        .action-btn-dos { flex: 1; min-width: 80px; padding: 10px 8px; background: #000; border: 1px solid #444; border-radius: 4px; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s; }
        .action-btn-dos:hover:not(:disabled) { border-color: #666; }
        .action-btn-dos:disabled { opacity: 0.4; cursor: not-allowed; }
        .action-btn-dos.performing { border-color: #00d9ff; }
        .action-icon-dos { font-size: 20px; }
        .action-name-dos { font-size: 9px; color: #f0f0f0; font-weight: bold; }
        .action-effect-dos { font-size: 8px; color: #666; }
        .progress-dos { width: 100%; height: 3px; background: #222; border-radius: 2px; overflow: hidden; margin-top: 4px; }
        .progress-fill-dos { height: 100%; background: #00d9ff; animation: progressAnim 1.5s ease-out; }
        @keyframes progressAnim { from { width: 0; } to { width: 100%; } }
        .performing-dos { font-size: 10px; color: #00d9ff; }
        
        .overlay-dos { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 1500; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .overlay-content-dos { background: #000; border: 3px solid #e94560; border-radius: 8px; width: 100%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
        .overlay-header-dos { display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 2px solid #e94560; }
        .overlay-header-dos h2 { margin: 0; font-size: 16px; color: #e94560; text-transform: uppercase; }
        .close-btn-dos { background: transparent; border: 2px solid #e94560; color: #e94560; border-radius: 4px; width: 30px; height: 30px; cursor: pointer; font-size: 16px; font-weight: bold; }
        .close-btn-dos:hover { background: #e94560; color: #000; }
        .overlay-list-dos { padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        
        .skill-card-dos { background: #111; border: 2px solid #333; border-radius: 6px; padding: 12px; }
        .skill-header-dos { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .skill-name-dos { font-size: 11px; color: #f0f0f0; font-weight: bold; }
        .skill-level-dos { font-size: 10px; color: #666; }
        .skill-desc-dos { font-size: 9px; color: #888; margin: 0 0 10px 0; }
        .skill-progress-dos { height: 6px; background: #222; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
        .skill-fill-dos { height: 100%; background: linear-gradient(90deg, #e94560, #c73659); }
        .upgrade-btn-dos { width: 100%; padding: 8px; background: transparent; border: 1px solid #444; border-radius: 4px; color: #666; font-size: 9px; font-family: inherit; font-weight: bold; cursor: pointer; transition: all 0.2s; }
        .upgrade-btn-dos:hover:not(:disabled):not(.maxed) { border-color: #e94560; color: #e94560; }
        .upgrade-btn-dos.maxed { border-color: #4ade80; color: #4ade80; cursor: default; }
        .upgrade-btn-dos.cant-afford { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

export default HubScreen;
