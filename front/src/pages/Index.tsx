import React, { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import TopicInput from "@/components/TopicInput";
import LearningSidebar, { Level } from "@/components/LearningSidebar";
import ContentPanel from "@/components/ContentPanel";
import EmptyState from "@/components/EmptyState";
import HintModal from "@/components/HintModal";
import { useTopics } from "@/hooks/useTopics";
import { useArticles, Article } from "@/hooks/useArticles";
import { useHints } from "@/hooks/useHints";
import { BookOpen } from "lucide-react";

const Index = () => {
  const [topic, setTopic] = useState('');
  const [selectedTopicName, setSelectedTopicName] = useState('');
  const [selectedArticleTitle, setSelectedArticleTitle] = useState(''); // Track currently selected article

  // Use custom hooks
  const { availableTopics, addTopic, isLoading, error } = useTopics();
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

  // Convert old structure to new structure for compatibility
  const levels: Level[] = outline.length > 0 ? [{
    id: 'level-1',
    title: '',
    description: 'Основные темы курса',
    icon: <BookOpen className="w-4 h-4" />,
    topics: outline.map((item, index) => ({
      id: `topic-${index}`,
      title: item,
      completed: generatedArticles.has(item)
    }))
  }] : [];

  const courseTopic = outlineTitle || null;
  const isGenerating = loading || (streaming && !outline.length);
  const isLoadingContent = loading && !!currentArticle && outline.length > 0;
  const content = currentArticle?.content || "";
  
  // Select topic ID based on currently selected article
  const selectedTopicId = selectedArticleTitle ? 
    `topic-${outline.indexOf(selectedArticleTitle)}` : 
    (selectedTopicName ? `topic-${outline.indexOf(selectedTopicName)}` : null);
  const selectedLevelId = selectedTopicId ? 'level-1' : null;

  const handleGenerate = async (topicInput: string) => {
    setSelectedTopicName(topicInput);
    setSelectedArticleTitle(''); // Reset selected article when generating new outline
    await handleGenerateOutline(topicInput);
  };

  const handleSelectTopic = async (levelId: string, topicId: string) => {
    // Extract topic name from topicId
    // topicId format: "topic-0" for main items or "topic-0-Sub Title" for nested items
    let topicTitle = '';
    
    const parts = topicId.split('-');
    if (parts.length >= 2 && !isNaN(parseInt(parts[1]))) {
      // Standard format: topic-INDEX or topic-INDEX-SubTitle
      const topicIndex = parseInt(parts[1]);
      
      if (parts.length > 2) {
        // Nested item: rejoin the remaining parts as the title
        topicTitle = parts.slice(2).join('-');
      } else {
        // Main item: get from outline array
        topicTitle = outline[topicIndex] || '';
      }
    }

    console.log('handleSelectTopic called with:', { levelId, topicId, topicTitle, outline, selectedTopicName });
    
    if (topicTitle && selectedTopicName) {
      setSelectedArticleTitle(topicTitle); // Update selected article
      await handleStepClick(topicTitle, selectedTopicName);
    } else {
      console.warn('Missing topicTitle or selectedTopicName:', { topicTitle, selectedTopicName });
    }
  };

  const handleToggleCollapse = (sectionTitle: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionTitle)) {
      newCollapsed.delete(sectionTitle);
    } else {
      newCollapsed.add(sectionTitle);
    }
    // We need to update collapsedSections - store in component state
    // For now, this will be handled by the useArticles hook
  };

  const handleRegenerate = async () => {
    if (selectedTopicName && currentArticle) {
      await handleStepClick(currentArticle.title, selectedTopicName, true);
    }
  };

  const handleTopicTagClickWrapper = async (topicName: string) => {
    setSelectedTopicName(topicName);
    setSelectedArticleTitle(''); // Reset selected article when changing main topic
    await handleTopicTagClick(topicName);
  };

  // Handle text selection for hints
  const handleTextSelection = (selectedText: string) => {
    setSelectedText(selectedText);
    // Don't open modal immediately - let user click the ? button
    // setShowHintModal(true);
  };

  // Generate hint when user clicks the hint button
  const handleGenerateHint = () => {
    if (selectedText && selectedTopicName) {
      setShowHintModal(true);
      generateHint(selectedText, selectedTopicName);
    }
  };

  const getAllTopics = useCallback(() => {
    return levels.flatMap(level => 
      level.topics.map(topic => ({ levelId: level.id, topicId: topic.id }))
    );
  }, [levels]);

  const currentIndex = getAllTopics().findIndex(t => t.topicId === selectedTopicId);
  const hasNext = currentIndex < getAllTopics().length - 1;
  const hasPrevious = currentIndex > 0;

  const handleNext = () => {
    const allTopics = getAllTopics();
    if (currentIndex < allTopics.length - 1) {
      const next = allTopics[currentIndex + 1];
      handleSelectTopic(next.levelId, next.topicId);
    }
  };

  const handlePrevious = () => {
    const allTopics = getAllTopics();
    if (currentIndex > 0) {
      const prev = allTopics[currentIndex - 1];
      handleSelectTopic(prev.levelId, prev.topicId);
    }
  };

  const selectedLevel = levels.find(l => l.id === selectedLevelId);
  const selectedTopic = selectedLevel?.topics.find(t => t.id === selectedTopicId);

  // Landing view - no course selected yet
  if (!selectedTopicName) {
    return (
      <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-glow opacity-50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        
        <Header />
        
        <main className="pt-32 pb-20 px-6">
          <TopicInput onGenerate={handleGenerate} isGenerating={isGenerating} onTopicSelect={handleTopicTagClickWrapper} />
        </main>

        {/* Feature highlights */}
{/*         <section className="max-w-4xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Структурированные уровни", desc: "От новичка до эксперта, шаг за шагом" },
              { title: "ИИ-объяснения", desc: "Понятный контент, адаптированный под вас" },
              { title: "Примеры кода", desc: "Реальные фрагменты кода для использования" },
            ].map((item, i) => (
              <div
                key={item.title}
                className="p-6 rounded-2xl glass-subtle text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section> */}
      </div>
    );
  }

  // Learning view - course is active
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      
      <div className="flex-1 flex pt-16 overflow-hidden">
        <LearningSidebar
          levels={levels}
          selectedTopicId={selectedTopicId}
          onSelectTopic={handleSelectTopic}
          courseName={courseTopic}
          articleHierarchy={articleHierarchy}
          collapsedSections={collapsedSections}
          onToggleCollapse={handleToggleCollapse}
          generatedArticles={generatedArticles}
        />
        
        {selectedTopicName ? (
          <ContentPanel
            title={selectedTopic?.title || selectedTopicName}
            levelTitle={selectedLevel?.title || ''}
            content={content}
            isLoading={isLoadingContent}
            onRegenerate={handleRegenerate}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            onTextSelection={handleTextSelection}
            isStreaming={streaming}
            isGeneratingOutline={isGenerating && !selectedArticleTitle}
            onHintButtonClick={handleGenerateHint}
          />
        ) : (
          <EmptyState />
        )}
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
};

// Simple markdown-like formatting
const formatContent = (content: string): string => {
  return content
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)\n(?=<li>)/g, '$1')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\n<ul>/g, '')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[huplo])/gm, '<p>')
    .replace(/(?<![>\n])$/gm, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[huplo])/g, '$1')
    .replace(/(<\/[huplo][^>]*>)<\/p>/g, '$1');
};

export default Index;
