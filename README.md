# Kursovik 🚀  
AI-сервис генерации учебных материалов на любую тему

## 📌 Описание

**Kursovik** — это веб-приложение, которое генерирует структурированные учебные материалы по любой теме с помощью ИИ (DeepSeek).  
Сервис ориентирован на пошаговое обучение с возможностью углубления в каждую тему.

Проект разрабатывается с использованием **TDD**, строгой работы с **Git** и использованием **Docker только на этапе production**.

---

## 🧠 Общая концепция

1. Пользователь вводит тему (например, `python`)
2. Генерируется учебный план — он же **Оглавление**
3. Оглавление отображается слева в виде большого вертикального блока
4. Каждый пункт оглавления — отдельная статья
5. Статьи подгружаются по требованию и сохраняются в базе данных
6. Генерация контента происходит в **стриминговом режиме**
7. Повторные генерации защищены кешем и блокировками

---

## 📑 Оглавление (Table of Contents)

- Формируется **на основе первого ответа DeepSeek**
- Представляет собой список заголовков без подзаголовков
- Отображается:
  - слева
  - вертикально
  - фиксированным блоком (sidebar)

### Поведение оглавления
- Если статья **ещё не загружена** — пункт кликабельный, запускает генерацию
- Если статья **уже сохранена в БД** — пункт является ссылкой, открывающей статью
- Если статья **генерируется** — повторная генерация не запускается
- Активный пункт подсвечивается

---

## 🧠 Workflow генерации контента

### 1. Начальный запрос
Пользователь вводит:
```
python
```

### 2. Расширенный промпт (учебный план)
```
Я хочу изучить python.
Составь учебный план от начального уровня до профессионального.
Соблюдай строгую структуру: заголовок + контент.
Не делай подзаголовки.
```

➡️ Ответ DeepSeek используется **только для формирования оглавления**

---

### 3. Генерация статьи по пункту оглавления

При клике на пункт оглавления отправляется промпт:
```
Я хочу изучить python.
Расскажи подробно про <ЗАГОЛОВОК>.
Соблюдай строгую структуру: заголовок + контент.
Не делай подзаголовки.
```

---

### 4. Стриминг ответа

- DeepSeek используется в **streaming-режиме**
- Контент:
  - отображается в UI по мере генерации
  - парсится и форматируется на лету
- Пользователь видит процесс «написания» статьи

---

### 5. Сохранение

После завершения генерации:
- статья сохраняется в базу данных
- повторные запросы к DeepSeek **не выполняются**
- статья доступна по клику из оглавления

---

## 🔐 Кеш и защита от повторных генераций

❗ Простое наличие статьи в БД **не является достаточной защитой** от повторных генераций  
(из-за race condition, стриминга и конкурентных запросов).

### Состояния статьи
Каждая статья имеет состояние:
- `NOT_STARTED`
- `GENERATING`
- `READY`
- `FAILED`

### Блокировки (Lock)
Перед запуском генерации:
- используется атомарная блокировка
- гарантируется, что **только один процесс** вызывает DeepSeek

### Рекомендуемая реализация
- **Redis**:
  - lock с TTL (5–10 минут)
  - быстрые проверки состояния
- **PostgreSQL**:
  - хранение итогового состояния
  - fallback через `UPDATE ... WHERE status`

### Поведение API
| Статус | Поведение |
|------|----------|
| READY | вернуть статью из БД |
| GENERATING | подключиться к существующему стриму |
| NOT_STARTED | установить lock и начать генерацию |
| FAILED | разрешить повторную генерацию |

Такой подход:
- защищает от дублей
- снижает затраты на LLM
- корректно работает со стримингом

---

## 🏗 Архитектура (предлагаемая)

```
kursovik/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   │   ├── llm_service.py
│   │   │   ├── streaming_parser.py
│   │   │   ├── lock_service.py
│   │   ├── domain/
│   │   │   ├── topic.py
│   │   │   └── article.py
│   │   ├── repositories/
│   │   └── main.py
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── stores/
│   ├── tests/
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🗄 Хранение данных

**PostgreSQL** + **SQLAlchemy** для production.  
Для разработки допускается SQLite.

### Миграция на PostgreSQL

Если вы переходите с SQLite на PostgreSQL:

1. **Обновите переменные окружения:**
   ```bash
   # В .env файле
   DATABASE_URL=postgresql://postgres:changeme123@db:5432/kursovik
   POSTGRES_PASSWORD=changeme123
   ```

2. **Запустите production окружение:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d db
   ```

3. **Создайте таблицы в PostgreSQL:**
   ```bash
   # В контейнере backend
   docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
   ```

4. **Запустите миграцию данных:**
   ```bash
   python migrate_to_postgres.py
   ```

5. **Перезапустите все сервисы:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

## 🧪 TDD

Разработка ведётся по циклу **Red → Green → Refactor**.

---

## 🚀 Развертывание

### Требования
- Docker и Docker Compose
- DeepSeek API ключ

### Быстрый старт (разработка)

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/seomozg/kursovik.git
   cd kursovik
   ```

2. **Создайте файл окружения:**
   ```bash
   cp .env.example .env
   # Отредактируйте .env и укажите ваш DEEPSEEK_API_KEY
   ```

3. **Запустите приложение:**
   ```bash
   docker-compose up --build
   ```

4. **Откройте в браузере:**
   - Frontend: http://localhost
   - Backend API: http://localhost:8082

### Автоматическое развертывание

Используйте скрипт развертывания для автоматической подготовки и запуска:

```bash
# Для production (полная автоматизация)
./deploy-prod.sh

# Или вручную:
# 1. Настроить переменные окружения
cp .env.example .env
# Отредактируйте .env файл

# 2. Запустить production
docker-compose -f docker-compose.prod.yml up --build -d

# 3. Выполнить миграции
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 4. Проверить здоровье
curl http://localhost/health
```

### Структура развертывания

#### Режим разработки
- **Backend** (Python + FastAPI):
  - Порт: 8082 (внешний) → 8000 (внутренний)
  - База данных: SQLite
  - API для генерации контента

- **Frontend** (React + Vite):
  - Порт: 8083 (внешний) → 80 (внутренний)
  - Development server с hot reload
  - Проксирование API запросов

#### Production режим
- **Nginx** (реверс-прокси):
  - Порт: 80/443
  - Статические файлы frontend
  - Проксирование API к backend

- **Backend** (Python + FastAPI):
  - Внутренний сервис
  - Redis для кеширования и блокировок

- **Redis**:
  - Кеширование
  - Распределенные блокировки

- **Frontend** (React + Nginx):
  - Production build
  - Оптимизированные статические файлы

### Переменные окружения

```bash
# Обязательные
DEEPSEEK_API_KEY=ваш_ключ_здесь

# Опциональные (разработка)
DATABASE_URL=sqlite:///./backend/kursovik.db
BACKEND_URL=http://localhost:8082
FRONTEND_URL=http://localhost:8083

# Опциональные (production)
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://user:password@postgres:5432/kursovik
```

### Управление приложением

```bash
# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f backend

# Перезапуск сервиса
docker-compose restart backend

# Очистка (удаление volumes)
docker-compose down -v
```

### Мониторинг

- **Health checks**: Все сервисы имеют автоматические проверки здоровья
- **Логи**: Централизованное логирование через Docker
- **Метрики**: Доступны через `/metrics` endpoint (backend)

### Production deployment

Для развертывания на сервере:

1. **Подготовьте сервер:**
   ```bash
   # Установите Docker и Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Загрузите проект:**
   ```bash
   git clone https://github.com/seomozg/kursovik.git
   cd kursovik
   ```

3. **Настройте переменные:**
   ```bash
   cp .env.example .env
   # Отредактируйте .env файл с production настройками
   ```

4. **Запустите развертывание:**
   ```bash
   ./deploy-prod.sh
   ```

5. **Настройте SSL (опционально):**
   ```bash
   # Используйте Let's Encrypt
   sudo certbot certonly --webroot -w /var/www/html -d yourdomain.com

   # Или скопируйте сертификаты в ./ssl/
   cp nginx.ssl.conf nginx.conf
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

### Безопасность

- **Измените пароли** в `.env` файле перед production
- **Настройте firewall** - откройте только порты 80, 443
- **Регулярно обновляйте** Docker образы
- **Мониторьте логи** на предмет подозрительной активности

---

## 🐳 Docker

⚠️ Используется **только в production**.

---

## 📜 Лицензия

MIT License

---

> Kursovik — обучение, построенное как навигация по знаниям 🤖
