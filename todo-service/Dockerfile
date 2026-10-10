# 1. Используем официальный легковесный образ Python 3.14
FROM python:3.14-slim

# 2. Настраиваем переменные окружения
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# 3. Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# 4. Копируем файл зависимостей для кэширования слоев Docker
COPY requirements.txt .

# 5. Обновляем pip и устанавливаем зависимости без кэша
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 6. Копируем весь код проекта в контейнер
COPY . .

# 7. Безопасность: запускаем приложение от не-привилегированного пользователя
RUN useradd -u 5678 --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

# 8. Открываем порт 8000
EXPOSE 8000

# 9. Команда для запуска приложения через uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
