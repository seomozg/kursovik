# Kursovik 🚀  
AI-сервис генерации учебных материалов на любую тему

## 📌 Описание

**Kursovik** — это веб-приложение, которое генерирует структурированные учебные материалы по любой теме с помощью ИИ (DeepSeek).

### Основная идея
Пользователь вводит тему (например, `python`), а сервис:
1. Генерирует учебный план от начального уровня до продвинутого
2. Превращает каждый заголовок в интерактивную ссылку
3. Позволяет углубляться в любую тему рекурсивно
4. Поддерживает перегенерацию текущего материала

Проект разрабатывается с использованием **TDD**, контейнеризации через **Docker** и чистого Git-флоу.

---

## 🧠 Workflow генерации контента

1. Пользователь вводит запрос  
   ```
   python
   ```

2. Backend расширяет промпт:
   ```
   Я хочу изучить python.
   Составь учебный план от начального уровня до профессионального.
   ```

3. Ответ ИИ форматируется:
   - каждый заголовок → кликабельная ссылка

4. При клике по заголовку формируется новый промпт:
   ```
   Я хочу изучить python.
   Расскажи подробно про <ЗАГОЛОВОК>.
   Если тема большая — разбей на пункты.
   ```

5. Цикл повторяется рекурсивно

---

## 🖥 Интерфейс

- 🔍 Поле ввода запроса
- ☁️ Облако тегов предыдущих тем
- 📄 Отформатированный ответ ИИ (Markdown / HTML)
- 🔄 Кнопка перегенерации текущего материала

---

## 🏗 Архитектура (предлагаемая)

```
kursovik/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   │   └── llm_service.py
│   │   ├── domain/
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🧪 TDD (Test Driven Development)

Разработка ведётся по циклу **Red → Green → Refactor**

### Пример
```python
def test_generate_study_plan():
    result = generate_plan("python")
    assert "Начальный уровень" in result
```

### Инструменты
- Backend: `pytest`
- Frontend: `vitest / jest`
- Coverage обязателен

---

## 🔁 Git workflow

### Ветки
- `main` — стабильная версия
- `develop` — активная разработка
- `feature/*` — новые фичи
- `fix/*` — багфиксы

### Коммиты (Conventional Commits)
```
feat: add recursive topic generation
test: add llm service tests
fix: handle empty ai response
```

---

## 🚀 Запуск проекта

### Docker (рекомендуется)
```bash
docker-compose up --build
```
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

### Локальный запуск

#### Backend
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

### Тестирование
```bash
# Backend
cd backend && poetry run pytest

# Frontend
cd frontend && npm test
```

---

## � Переменные окружения

`.env`
```env
DEEPSEEK_API_KEY=your_api_key_here
```

---

## �📦 Технологии

**Backend**
- Python 3.11+
- FastAPI
- DeepSeek API
- Pydantic

**Frontend**
- React / Vue / Svelte
- TailwindCSS
- Markdown renderer

**DevOps**
- Docker
- Docker Compose
- GitHub Actions (CI)

---

## 🤝 Contribution

1. Fork репозитория
2. Создай feature-ветку
3. Покрой код тестами
4. Открой Pull Request

---

## 📜 Лицензия

MIT License

---

> Kursovik — учись глубже, шаг за шагом, с помощью ИИ 🤖
