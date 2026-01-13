import React from 'react';
import ArticleDisplay from './ArticleDisplay';

const MainContent = ({
  topic,
  setTopic,
  loading,
  availableTopics,
  currentArticle,
  forceUpdate,
  streaming,
  onGenerateOutline,
  onTopicTagClick,
  onRegenerate
}) => {
  return (
    <div className="main-content">
      <div className="input-group">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Введите тему (например, python)"
        />
        <button onClick={onGenerateOutline} disabled={loading}>
          {loading ? 'Генерация...' : 'Сгенерировать'}
        </button>
      </div>

      {/* Topic cloud */}
      {availableTopics.length > 0 && (
        <div className="topic-cloud">
          <h3>Доступные темы:</h3>
          <div className="topic-tags">
            {availableTopics.map((topicName, index) => (
              <span
                key={index}
                className="topic-tag"
                onClick={() => onTopicTagClick(topicName)}
              >
                {topicName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Current article display */}
      <ArticleDisplay
        article={currentArticle}
        forceUpdate={forceUpdate}
        onRegenerate={onRegenerate}
      />

      {streaming && (
        <div className="streaming-indicator">
          <p>
            {loading && !currentArticle
              ? "🎯 Генерирую учебный план с помощью AI..."
              : "📝 Генерирую статью с помощью AI..."
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default MainContent;
