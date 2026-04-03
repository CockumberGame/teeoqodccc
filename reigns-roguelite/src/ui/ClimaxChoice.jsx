/**
 * ClimaxChoice — Компонент выбора исхода сцены (кульминация)
 * Отображает 2-3 карты с вариантами завершения
 * 
 * Пропсы:
 * - outcomes: массив вариантов исхода
 * - trustLevel: уровень доверия (для отображения)
 * - onSelect: callback при выборе
 */

import React from 'react';
import { Heart, Zap, Smile, Crown, Star } from 'lucide-react';

function ClimaxChoice({ outcomes = [], trustLevel = 'Незнакомец', onSelect }) {
  // Получение иконки для исхода
  const getOutcomeIcon = (outcomeId) => {
    const icons = {
      quick: <Zap size={24} color="#fbbf24" />,
      gentle: <Heart size={24} color="#ef4444" />,
      intense: <Zap size={24} color="#ef4444" />,
      controlled: <Crown size={24} color="#a78bfa" />,
      dominant: <Crown size={24} color="#ef4444" />,
      submissive: <Smile size={24} color="#4ade80" />
    };
    return icons[outcomeId] || <Star size={24} color="#9ca3af" />;
  };

  // Получение цвета для исхода
  const getOutcomeColor = (outcomeId) => {
    const colors = {
      quick: '#fbbf24',
      gentle: '#ef4444',
      intense: '#ef4444',
      controlled: '#a78bfa',
      dominant: '#ef4444',
      submissive: '#4ade80'
    };
    return colors[outcomeId] || '#9ca3af';
  };

  // Получение описания последствий
  const getConsequences = (outcome) => {
    const parts = [];
    
    if (outcome.reward >= 40) {
      parts.push({ text: `+${outcome.reward}$`, color: '#fbbf24' });
    } else if (outcome.reward >= 30) {
      parts.push({ text: `${outcome.reward}$`, color: '#f0f0f0' });
    }
    
    if (outcome.satisfaction >= 80) {
      parts.push({ text: 'Отлично', color: '#4ade80' });
    } else if (outcome.satisfaction >= 60) {
      parts.push({ text: 'Хорошо', color: '#fbbf24' });
    } else {
      parts.push({ text: 'Нормально', color: '#9ca3af' });
    }
    
    if (outcome.stress <= 3) {
      parts.push({ text: `- ${outcome.stress} стресс`, color: '#4ade80' });
    } else if (outcome.stress <= 6) {
      parts.push({ text: `- ${outcome.stress} стресс`, color: '#f97316' });
    } else {
      parts.push({ text: `- ${outcome.stress} стресс`, color: '#ef4444' });
    }
    
    return parts;
  };

  return (
    <div className="climax-choice-overlay">
      <div className="climax-choice-container">
        <div className="climax-header">
          <h2 className="climax-title">⚡ ЗАВЕРШЕНИЕ ⚡</h2>
          <p className="climax-trust">
            Доверие: <span className="trust-value">{trustLevel}</span>
          </p>
        </div>

        <div className="outcomes-grid">
          {outcomes.map((outcome, index) => {
            const consequences = getConsequences(outcome);
            const borderColor = getOutcomeColor(outcome.outcomeId);

            return (
              <button
                key={index}
                className="outcome-card"
                onClick={() => onSelect && onSelect(outcome.outcomeId)}
                style={{ borderColor }}
              >
                <div className="outcome-header">
                  {getOutcomeIcon(outcome.outcomeId)}
                  <h3 className="outcome-name">{outcome.outcomeName}</h3>
                </div>

                <div className="outcome-consequences">
                  {consequences.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="consequence-item"
                      style={{ color: item.color }}
                    >
                      {item.text}
                    </div>
                  ))}
                </div>

                {outcome.preferenceMatch !== 'neutral' && (
                  <div className="preference-match">
                    {outcome.preferenceMatch === 'perfect' && (
                      <span style={{ color: '#4ade80' }}>✅ Идеально!</span>
                    )}
                    {outcome.preferenceMatch === 'good' && (
                      <span style={{ color: '#fbbf24' }}>👌 Хорошо</span>
                    )}
                    {outcome.preferenceMatch === 'bad' && (
                      <span style={{ color: '#ef4444' }}>⚠️ Риск</span>
                    )}
                  </div>
                )}

                <div className="outcome-button">
                  ВЫБРАТЬ
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .climax-choice-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 10, 30, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .climax-choice-container {
          max-width: 800px;
          width: 100%;
        }

        .climax-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .climax-title {
          font-size: 28px;
          font-weight: bold;
          color: #fbbf24;
          text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
          margin: 0 0 10px 0;
          letter-spacing: 2px;
        }

        .climax-trust {
          font-size: 14px;
          color: #9ca3af;
          margin: 0;
        }

        .trust-value {
          color: #a78bfa;
          font-weight: bold;
        }

        .outcomes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .outcome-card {
          background: linear-gradient(135deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.98) 100%);
          border: 2px solid;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          position: relative;
          min-height: 280px;
        }

        .outcome-card:active {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(167, 139, 250, 0.4);
        }

        .outcome-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .outcome-name {
          font-size: 16px;
          font-weight: bold;
          color: #f0f0f0;
          margin: 0;
        }

        .outcome-consequences {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 15px;
        }

        .consequence-item {
          font-size: 13px;
          font-weight: 500;
        }

        .preference-match {
          font-size: 12px;
          font-weight: bold;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          margin-bottom: 15px;
          text-align: center;
        }

        .outcome-button {
          background: linear-gradient(135deg, rgba(167, 139, 250, 0.3) 0%, rgba(139, 92, 246, 0.2) 100%);
          border: 1px solid rgba(167, 139, 250, 0.5);
          border-radius: 8px;
          padding: 12px;
          font-size: 13px;
          font-weight: bold;
          color: #a78bfa;
          text-align: center;
          letter-spacing: 1px;
        }

        /* Адаптивность для мобильных */
        @media (max-width: 480px) {
          .climax-title {
            font-size: 22px;
          }

          .outcomes-grid {
            grid-template-columns: 1fr;
          }

          .outcome-card {
            min-height: 240px;
          }
        }
      `}</style>
    </div>
  );
}

export default ClimaxChoice;
