import { BookOpen, Lightbulb, Rocket, Target } from "lucide-react";

const features = [
  {
    icon: <Target className="w-5 h-5" />,
    title: "Структурированные планы",
    description: "От базовых основ до продвинутых концепций",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "ИИ-контент",
    description: "Понятные объяснения с практическими примерами",
  },
  {
    icon: <Lightbulb className="w-5 h-5" />,
    title: "Примеры кода",
    description: "Реальные фрагменты кода для немедленного использования",
  },
  {
    icon: <Rocket className="w-5 h-5" />,
    title: "Отслеживание прогресса",
    description: "Отмечайте пройденные темы и следите за прогрессом",
  },
];

const EmptyState = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg text-center space-y-8 animate-fade-in">
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Выберите тему для начала</h2>
          <p className="text-muted-foreground">
            Выберите тему из бокового меню, чтобы начать обучение. Каждая тема включает подробные объяснения, примеры и упражнения.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-xl glass-subtle text-left space-y-2"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {feature.icon}
              </div>
              <h3 className="font-medium text-foreground text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
