import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import HintModal from './components/HintModal';
import { useTopics } from './hooks/useTopics';
import { useArticles } from './hooks/useArticles';
import { useHints } from './hooks/useHints';

function App() {
  const [topic, setTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  // Use custom hooks
  const { availableTopics, addTopic } = useTopics();
  const {
    outline,
    outlineTitle,
    currentArticle,
    loading,
    streaming,
    generatedArticles,
    forceUpdate,
    articleHierarchy,
    collapsedSections,
    handleGenerateOutline,
    handleTopicTagClick,
    handleStepClick,
    toggleCollapse
  } = useArticles(addTopic);
  const {
    selectedText,
    showHintModal,
    hintContent,
    hintStreaming,
    setSelectedText,
    setShowHintModal,
    generateHint,
    handleCloseHintModal
  } = useHints();

  // Handle text selection for hints
  useEffect(() => {
    const handleMouseUp = (event) => {
      if (event.target.classList.contains('hint-button')) {
        return;
      }

      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText && selectedText.length > 3) {
        setSelectedText(selectedText);

        const existingButton = document.querySelector('.hint-button');
        if (existingButton) {
          existingButton.remove();
        }

        const articleContent = document.querySelector('.article-content');
        if (!articleContent) {
          return;
        }

        const hintButton = document.createElement('button');
        hintButton.className = 'hint-button';
        hintButton.textContent = '?';

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const articleRect = articleContent.getBoundingClientRect();

        const relativeLeft = rect.right - articleRect.left + 5;
        const relativeTop = rect.top - articleRect.top - 30;

        hintButton.style.left = `${relativeLeft}px`;
        hintButton.style.top = `${relativeTop}px`;

        const handleButtonClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.getSelection().removeAllRanges();
          setShowHintModal(true);
          hintButton.remove();
        };

        hintButton.addEventListener('click', handleButtonClick);
        articleContent.style.position = 'relative';
        articleContent.appendChild(hintButton);

        setTimeout(() => {
          if (hintButton.parentNode) {
            hintButton.remove();
          }
        }, 5000);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      const hintButton = document.querySelector('.hint-button');
      if (hintButton) {
        hintButton.remove();
      }
    };
  }, []);

  // Generate hint when modal opens
  useEffect(() => {
    if (showHintModal && selectedText && !hintContent && !hintStreaming) {
      generateHint(selectedText, selectedTopic);
    }
  }, [showHintModal, selectedText, hintContent, hintStreaming, generateHint, selectedTopic]);

  return (
    <div className="App">
      <Header />
      <div className="app-content">
        <Sidebar
          outlineTitle={outlineTitle}
          outline={outline}
          onStepClick={(stepTitle) => handleStepClick(stepTitle, selectedTopic)}
          articleHierarchy={articleHierarchy}
          collapsedSections={collapsedSections}
          generatedArticles={generatedArticles}
          onToggleCollapse={toggleCollapse}
        />
        <MainContent
          topic={topic}
          setTopic={setTopic}
          loading={loading}
          availableTopics={availableTopics}
          currentArticle={currentArticle}
          forceUpdate={forceUpdate}
          streaming={streaming}
          onGenerateOutline={() => {
            setSelectedTopic(topic);
            handleGenerateOutline(topic);
          }}
          onTopicTagClick={(topicName) => { setSelectedTopic(topicName); handleTopicTagClick(topicName); }}
          onRegenerate={(stepTitle) => handleStepClick(stepTitle, selectedTopic, true)}
        />
      </div>
      <HintModal
        showHintModal={showHintModal}
        selectedText={selectedText}
        hintContent={hintContent}
        hintStreaming={hintStreaming}
        onClose={handleCloseHintModal}
      />
    </div>
  );
}

export default App;
