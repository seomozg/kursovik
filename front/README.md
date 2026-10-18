# Kursovik — фронтенд

Клиентская часть приложения: **React 18 + TypeScript + Vite**.

Подробнее о проекте, архитектуре и запуске — в [корневом README](../README.md).

## Стек

- React 18, TypeScript, Vite
- Tailwind CSS, shadcn/ui
- axios, WebSocket API (стриминг генерации статей)

## Команды

```bash
npm install   # установка зависимостей
npm run dev   # dev-сервер с hot-reload
npm run build # production-сборка в dist/
npm run lint  # проверка ESLint
```

## Структура `src/`

- `pages/` — страницы приложения (главная с генерацией курса)
- `components/` — UI-компоненты, включая библиотечные на `components/ui` (shadcn/ui)
- `hooks/` — бизнес-логика: `useTopics`, `useArticles`, `useHints`
- `lib/` — вспомогательные утилиты и конфигурация