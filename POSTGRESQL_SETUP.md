# PostgreSQL Migration Guide 🚀

## Текущая ситуация
Приложение сейчас работает на SQLite, но готово к миграции на PostgreSQL для production.

## Варианты установки PostgreSQL

### Вариант 1: Docker (Рекомендуемый)
```bash
# Установите Docker Desktop и запустите его
# Затем выполните:

# 1. Запустите PostgreSQL
docker run --name postgres-kursovik -e POSTGRES_PASSWORD=changeme123 -e POSTGRES_DB=kursovik -p 5432:5432 -d postgres:15-alpine

# 2. Проверьте, что работает
docker ps

# 3. Обновите .env файл:
# Раскомментируйте строку:
DATABASE_URL=postgresql://postgres:changeme123@localhost:5432/kursovik

# 4. Запустите миграцию
python migrate_to_postgres.py
```

### Вариант 2: Локальная установка PostgreSQL

#### Windows:
1. Скачайте PostgreSQL с https://www.postgresql.org/download/windows/
2. Установите с паролем `changeme123` для пользователя `postgres`
3. Создайте базу данных `kursovik`
4. Обновите .env файл
5. Запустите миграцию

#### Linux/Ubuntu:
```bash
# Установка
sudo apt update
sudo apt install postgresql postgresql-contrib

# Настройка
sudo -u postgres psql
CREATE DATABASE kursovik;
ALTER USER postgres PASSWORD 'changeme123';
\q

# Запуск сервиса
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Вариант 3: Использование production Docker Compose
```bash
# Обновите .env файл для использования Docker сервиса
DATABASE_URL=postgresql://postgres:changeme123@db:5432/kursovik

# Запустите production окружение
docker-compose -f docker-compose.prod.yml up -d

# Выполните миграцию внутри контейнера
docker-compose -f docker-compose.prod.yml exec backend python /app/migrate_to_postgres.py
```

## Проверка миграции

После успешной миграции:
1. Приложение будет использовать PostgreSQL
2. Все существующие данные будут перенесены
3. Производительность улучшится при высокой нагрузке

## Откат на SQLite

Если нужно вернуться к SQLite:
```bash
# В .env файле:
DATABASE_URL=sqlite:///./backend/kursovik.db
```

## Диагностика проблем

### Проблема: "Connection refused"
**Решение:** Убедитесь, что PostgreSQL запущен и принимает соединения на порту 5432

### Проблема: "Database does not exist"
**Решение:** Создайте базу данных `kursovik` в PostgreSQL

### Проблема: "Authentication failed"
**Решение:** Проверьте пароль в DATABASE_URL (должен быть `changeme123`)

## Производственные настройки

Для production рекомендуется:
- Изменить пароль на более сложный
- Настроить SSL соединения
- Добавить бэкапы базы данных
- Настроить мониторинг производительности