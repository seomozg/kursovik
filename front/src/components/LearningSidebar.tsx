import { useState } from "react";
import { ChevronRight, ChevronDown, CheckCircle2, Circle, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Topic {
  id: string;
  title: string;
  completed?: boolean;
}

export interface Level {
  id: string;
  title: string;
  description: string;
  topics: Topic[];
  icon: React.ReactNode;
}

interface LearningSidebarProps {
  levels: Level[];
  selectedTopicId: string | null;
  onSelectTopic: (levelId: string, topicId: string) => void;
  courseName: string;
  articleHierarchy?: Record<string, string[]>;
  collapsedSections?: Set<string>;
  onToggleCollapse?: (sectionTitle: string) => void;
  generatedArticles?: Set<string>;
}

const LearningSidebar = ({ 
  levels, 
  selectedTopicId, 
  onSelectTopic, 
  courseName,
  articleHierarchy = {},
  collapsedSections = new Set(),
  onToggleCollapse,
  generatedArticles = new Set()
}: LearningSidebarProps) => {
  // Local state for collapsed sections since useArticles doesn't handle updates
  const [localCollapsedSections, setLocalCollapsedSections] = useState<Set<string>>(new Set());

  const handleToggleSection = (sectionTitle: string) => {
    setLocalCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle);
      } else {
        newSet.add(sectionTitle);
      }
      return newSet;
    });
    // Also call parent handler if provided
    if (onToggleCollapse) {
      onToggleCollapse(sectionTitle);
    }
  };

  // Render outline items with hierarchy
  const renderTopicWithHierarchy = (topicTitle: string, levelId: string, topicId: string, level = 0) => {
    const hasChildren = articleHierarchy[topicTitle] && articleHierarchy[topicTitle].length > 0;
    const isCollapsed = localCollapsedSections.has(topicTitle);
    const isSelected = selectedTopicId === topicId;
    const marginLeft = level * 12;

    return (
      <div key={`${topicId}-${level}`}>
        <div
          className="flex items-center gap-1"
          style={{ marginLeft: `${marginLeft}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSection(topicTitle);
              }}
              className="p-0 h-6 w-6 flex items-center justify-center hover:bg-sidebar-accent/50 rounded transition-colors flex-shrink-0"
              title={isCollapsed ? "Развернуть" : "Свернуть"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6 flex-shrink-0" />}
          
          <button
            onClick={() => onSelectTopic(levelId, topicId)}
            className={cn(
              "flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all duration-200 text-sm",
              isSelected
                ? "bg-primary/10 text-primary"
                : generatedArticles.has(topicTitle)
                ? "text-foreground hover:bg-sidebar-accent/30"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30"
            )}
          >
            {generatedArticles.has(topicTitle) ? (
              <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
            ) : (
              <Circle className="w-3 h-3 flex-shrink-0" />
            )}
            <span className="truncate text-xs">{topicTitle}</span>
          </button>
        </div>

        {hasChildren && !isCollapsed && (
          <div>
            {articleHierarchy[topicTitle].map((child) => 
              renderTopicWithHierarchy(child, levelId, `${topicId}-${child}`, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-80 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Topics List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {levels.flatMap((level) =>
          level.topics.map((topic) => 
            renderTopicWithHierarchy(topic.title, level.id, topic.id, 0)
          )
        )}
      </div>
    </aside>
  );
};

export default LearningSidebar;
