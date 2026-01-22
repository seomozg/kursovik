import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";

interface TextSelectionTooltipProps {
  containerRef: React.RefObject<HTMLElement>;
  onHintRequest?: (selectedText: string) => void;
}

const TextSelectionTooltip = ({ 
  containerRef, 
  onHintRequest
}: TextSelectionTooltipProps) => {
  const [selectedText, setSelectedText] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setTooltipPosition(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 3) {
      setTooltipPosition(null);
      setSelectedText("");
      return;
    }

    // Check if selection is within the container
    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setTooltipPosition(null);
      setSelectedText("");
      return;
    }

    const rect = range.getBoundingClientRect();
    setSelectedText(text);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [handleSelection]);

  // Hide tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        const selection = window.getSelection();
        if (selection?.isCollapsed) {
          setTooltipPosition(null);
          setSelectedText("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAskQuestion = () => {
    if (!selectedText) return;
    
    // Call the hint request callback to open HintModal in parent
    if (onHintRequest) {
      onHintRequest(selectedText);
    }
    
    setTooltipPosition(null);
  };

  return (
    <>
      {/* Floating tooltip button */}
      {tooltipPosition && (
        <div
          ref={tooltipRef}
          className="fixed z-50"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <Button
            size="sm"
            variant="default"
            onClick={handleAskQuestion}
            className="shadow-lg rounded-full px-2 py-1 h-8 bg-primary hover:bg-primary/90"
          >
            <span className="text-sm font-semibold">?</span>
          </Button>
          {/* Arrow pointing down */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
            style={{
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid hsl(var(--primary))",
            }}
          />
        </div>
      )}
    </>
  );
};

export default TextSelectionTooltip;
