import { BookOpen, Code, Cpu, Rocket, Trophy } from "lucide-react";
import React from "react";
import type { Level } from "@/components/LearningSidebar";

export const generateMockLevels = (topic: string): Level[] => [
  {
    id: "level-1",
    title: "Основы",
    description: "Базовые концепции и понятия",
    icon: React.createElement(BookOpen, { className: "w-4 h-4" }),
    topics: [
      { id: "1-1", title: `Что такое ${topic}?`, completed: true },
      { id: "1-2", title: "История и развитие", completed: true },
      { id: "1-3", title: "Ключевые термины", completed: false },
      { id: "1-4", title: "Начало работы", completed: false },
    ],
  },
  {
    id: "level-2",
    title: "Ключевые концепции",
    description: "Основные строительные блоки",
    icon: React.createElement(Code, { className: "w-4 h-4" }),
    topics: [
      { id: "2-1", title: "Фундаментальные принципы", completed: false },
      { id: "2-2", title: "Распространённые паттерны", completed: false },
      { id: "2-3", title: "Лучшие практики", completed: false },
      { id: "2-4", title: "Практическое упражнение", completed: false },
    ],
  },
  {
    id: "level-3",
    title: "Средний уровень",
    description: "Создание реальных приложений",
    icon: React.createElement(Cpu, { className: "w-4 h-4" }),
    topics: [
      { id: "3-1", title: "Продвинутые техники", completed: false },
      { id: "3-2", title: "Практическое применение", completed: false },
      { id: "3-3", title: "Решение задач", completed: false },
      { id: "3-4", title: "Мини-проект", completed: false },
    ],
  },
  {
    id: "level-4",
    title: "Продвинутый",
    description: "Экспертные знания",
    icon: React.createElement(Rocket, { className: "w-4 h-4" }),
    topics: [
      { id: "4-1", title: "Оптимизация производительности", completed: false },
      { id: "4-2", title: "Масштабирование и архитектура", completed: false },
      { id: "4-3", title: "Отраслевые стандарты", completed: false },
      { id: "4-4", title: "Финальный проект", completed: false },
    ],
  },
  {
    id: "level-5",
    title: "Мастерство",
    description: "Профессиональная экспертиза",
    icon: React.createElement(Trophy, { className: "w-4 h-4" }),
    topics: [
      { id: "5-1", title: "Экспертные паттерны", completed: false },
      { id: "5-2", title: "Лидерство и преподавание", completed: false },
      { id: "5-3", title: "Вклад в сообщество", completed: false },
    ],
  },
];

export const generateMockContent = (topic: string, topicTitle: string): string => {
  return `# ${topicTitle}

Добро пожаловать в это подробное руководство по теме **${topicTitle}** в рамках вашего обучения ${topic}.

## Обзор

${topicTitle} — это фундаментальная концепция, которую должен понимать каждый, кто изучает ${topic}. В этом уроке мы рассмотрим основные принципы и приведём практические примеры для закрепления материала.

## Ключевые концепции

Понимание темы ${topicTitle} требует знакомства с несколькими важными идеями:

- **Основной принцип 1**: Фундамент, на котором строится всё остальное
- **Основной принцип 2**: Как различные компоненты взаимодействуют друг с другом
- **Основной принцип 3**: Лучшие практики реализации

## Практический пример

Давайте рассмотрим пример из реального мира, чтобы лучше понять эти концепции:

\`\`\`javascript
// Пример кода, демонстрирующий ${topicTitle}
const example = {
  name: "${topic}",
  topic: "${topicTitle}",
  isLearning: true
};

function demonstrate(concept) {
  console.log(\`Изучаем: \${concept.topic}\`);
  return concept.isLearning;
}

demonstrate(example);
\`\`\`

## Почему это важно

Понимание ${topicTitle} поможет вам:

- Создавать более надёжные приложения
- Эффективнее отлаживать проблемы
- Лучше общаться с командой
- Продвигаться в карьере ${topic}

## Итоги

В этом уроке мы рассмотрели основные аспекты ${topicTitle}. Обязательно попрактикуйтесь перед переходом к следующей теме.

**Следующие шаги**: Выполните упражнения ниже и переходите к следующей теме в вашем плане обучения.
`;
};
