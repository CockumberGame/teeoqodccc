/**
 * CardView - Displays the current card with choices
 */

import React from 'react';

function CardView({ card, onChoice }) {
  if (!card) return null;

  return (
    <div className="card-view">
      <div className="card">
        <div className="card-text">{card.text}</div>
        
        <div className="card-tags">
          {card.tags?.map(tag => (
            <span key={tag} className="card-tag">{tag}</span>
          ))}
        </div>
      </div>

      <div className="choices-container">
        {card.choices.map((choice, index) => (
          <button
            key={index}
            className={`choice-button choice-${index === 0 ? 'left' : 'right'}`}
            onClick={() => onChoice(index)}
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CardView;
