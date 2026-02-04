import { useRef, useEffect } from "react";
import { Copy, RefreshCw, BookmarkPlus, ChevronLeft, ChevronRight, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import TextSelectionTooltip from "./TextSelectionTooltip";

interface ContentPanelProps {
  title: string;
  levelTitle: string;
  content: string;
  isLoading: boolean;
  onRegenerate: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  onTextSelection?: (selectedText: string) => void;
  isStreaming?: boolean;
  isGeneratingOutline?: boolean;
  onHintButtonClick?: () => void;
}

const ContentPanel = ({
  title,
  levelTitle,
  content,
  isLoading,
  onRegenerate,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  onTextSelection,
  isStreaming = false,
  isGeneratingOutline = false,
  onHintButtonClick,
}: ContentPanelProps) => {
  const articleRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast({
      title: "Скопировано",
      description: "Содержимое успешно скопировано в буфер обмена.",
    });
  };

  // Handle text selection for hints
  useEffect(() => {
    if (!onTextSelection) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length > 3) {
        onTextSelection(selectedText);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [onTextSelection]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
    <header className="px-8 py-4 border-b border-border bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4" />
          {levelTitle}
          <span className="text-muted-foreground">/</span>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={isLoading}>
            <Copy className="w-4 h-4" />
            Копировать
          </Button>
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>
    </header>


      {/* Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {isLoading && !content ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-muted rounded-lg w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/6" />
              <div className="h-32 bg-muted rounded-lg w-full mt-6" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          ) : (
            <article ref={articleRef} className="prose-kursovik animate-fade-in">
              {isGeneratingOutline && !content ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
                  <p className="text-muted-foreground text-center max-w-md">Пожалуйста, подождите, система создает структурированный курс по теме</p>
                </div>
              ) : (
                <>
                  <div dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
                  {isStreaming && content && (
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      📝 Генерирую статью с помощью AI...
                    </div>
                  )}
                </>
              )}
            </article>
          )}
        </div>
        
        {/* Text Selection Tooltip */}
        {!isLoading && content && (
          <TextSelectionTooltip 
            containerRef={articleRef}
            onHintRequest={onHintButtonClick}
          />
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="flex items-center justify-between px-8 py-4 border-t border-border bg-card/50">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!hasPrevious || isLoading}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Назад
        </Button>

        <Button
          variant="hero"
          onClick={onNext}
          disabled={!hasNext || isLoading}
          className="gap-2"
        >
          Следующая тема
          <ChevronRight className="w-4 h-4" />
        </Button>
      </footer>
    </div>
  );
};

// Simple markdown-like formatting
const formatContent = (content: string): string => {
  let formatted = content;
  const codeBlocks: string[] = [];

  formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, (_, __, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
    return placeholder;
  });

  formatted = formatted
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)\n(?=<li>)/g, '$1')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\n<ul>/g, '')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[huplo_])/gm, '<p>')
    .replace(/(?<![>\n])$/gm, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[huplo_])/g, '$1')
    .replace(/(<\/[huplo][^>]*>)<\/p>/g, '$1');

  codeBlocks.forEach((block, index) => {
    formatted = formatted.replace(`__CODE_BLOCK_${index}__`, block);
  });

  return formatted;
};

export default ContentPanel;
