import React from 'react';

const HintModal = ({ showHintModal, selectedText, hintContent, hintStreaming, onClose }) => {
  if (!showHintModal) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Подсказка</h3>
          <button
            onClick={onClose}
            className="modal-close-button"
          >
            ×
          </button>
        </div>

        <div className="modal-selected-text">
          Выделенный текст: "{selectedText}"
        </div>

        <div className="modal-content-area">
          {hintStreaming && !hintContent && (
            <div className="modal-loading">
              Генерирую подсказку...
            </div>
          )}
          {hintContent && (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {hintContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HintModal;
