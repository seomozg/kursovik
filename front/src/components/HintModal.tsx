import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface HintModalProps {
  showHintModal: boolean;
  selectedText: string;
  hintContent: string;
  hintStreaming: boolean;
  onClose: () => void;
}

const HintModal: React.FC<HintModalProps> = ({
  showHintModal,
  selectedText,
  hintContent,
  hintStreaming,
  onClose
}) => {
  return (
    <Dialog open={showHintModal} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Подсказка</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Выделенный текст: <em>"{selectedText}"</em>
          </div>

          <div className="min-h-[100px] p-4 border rounded-lg bg-muted/50">
            {hintStreaming && !hintContent && (
              <div className="text-muted-foreground italic">
                Генерирую подсказку...
              </div>
            )}
            {hintContent && (
              <div className="whitespace-pre-wrap leading-relaxed">
                {hintContent}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HintModal;
