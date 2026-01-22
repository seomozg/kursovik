import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";

// Frontend configuration
// Always use relative URLs - nginx proxies /api/ and /ws/ to backend
// Only use direct URLs for localhost development
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

interface TopicInputProps {
  onGenerate: (topic: string) => void;
  isGenerating: boolean;
  onTopicSelect?: (topic: string) => void;
}

const TopicInput = ({ onGenerate, isGenerating, onTopicSelect }: TopicInputProps) => {
  const [topic, setTopic] = useState("");
  const [popularTopics, setPopularTopics] = useState<Array<{ label: string }>>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);

  useEffect(() => {
    const loadPopularTopics = async () => {
      try {
        setTopicsLoading(true);

        // Always use relative URLs for production (nginx proxies)
        // Only use direct URLs for localhost development
        const url = isLocalhost ? 'http://localhost:8082' : '';

        const response = await axios.get(`${url}/api/topics/`, {
          timeout: 5000,
        });

        // Convert to popular topics format
        const topics = response.data.map((t: { name: string }) => ({
          label: t.name,
        }));

        setPopularTopics(topics);
      } catch (error) {
        console.error('Error loading popular topics:', error);
        // Fallback to empty array
        setPopularTopics([]);
      } finally {
        setTopicsLoading(false);
      }
    };

    loadPopularTopics();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onGenerate(topic.trim());
    }
  };

  const handleTopicClick = (topicLabel: string) => {
    setTopic(topicLabel);
    // If onTopicSelect is provided, use it instead of onGenerate
    // This allows loading topics from DB instead of generating new outlines
    if (onTopicSelect) {
      onTopicSelect(topicLabel);
    } else {
      onGenerate(topicLabel);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Hero Text */}
      <div className="text-center space-y-4">
{/*         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm text-muted-foreground mb-4">
          <Zap className="w-4 h-4 text-primary" />
          ИИ-генератор учебных материалов
        </div> */}
        <h2 className="text-4xl md:text-5xl font-bold text-gradient leading-tight">
          Освойте любой навык
          <br />
          по структурированному плану
        </h2>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Введите любую тему и получите полную программу обучения от новичка до профессионала
          с объяснениями и примерами от ИИ.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-primary rounded-2xl opacity-20 group-hover:opacity-40 blur transition-all duration-300" />
          <div className="relative flex items-center gap-3 p-2 rounded-2xl bg-card border border-border">
            <div className="flex-1 flex items-center gap-3 pl-4">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Что вы хотите изучить? Например, 'Машинное обучение'"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-lg py-3"
              />
            </div>
            <Button
              type="submit"
              variant="hero"
              size="lg"
              disabled={!topic.trim() || isGenerating}
              className="rounded-xl"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Создать
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Available Topics */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">Доступные темы</p>
        {topicsLoading ? (
          <div className="text-center text-xs text-muted-foreground">Загрузка тем...</div>
        ) : popularTopics.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {popularTopics.map((t) => (
              <button
                key={t.label}
                onClick={() => handleTopicClick(t.label)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-subtle text-sm text-foreground/80 hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground">Темы недоступны</div>
        )}
      </div>
    </div>
  );
};

export default TopicInput;
