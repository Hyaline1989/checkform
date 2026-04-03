#!/bin/bash

echo "🚀 Начинаем развертывание системы оценки звонков..."

# Создаем виртуальное окружение
echo "📦 Создаем виртуальное окружение..."
python3 -m venv venv

# Активируем виртуальное окружение
source venv/bin/activate

# Обновляем pip
echo "🔄 Обновляем pip..."
pip install --upgrade pip

# Устанавливаем зависимости
echo "📚 Устанавливаем зависимости..."
pip install -r requirements.txt

# Создаем директории
echo "📁 Создаем необходимые директории..."
mkdir -p instance
mkdir -p logs
mkdir -p frontend

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "⚠️ Файл .env не найден. Создаем из .env.example..."
    cp .env.example .env
    echo "⚠️ Пожалуйста, отредактируйте файл .env и установите свои секретные ключи!"
fi

# Инициализируем базу данных
echo "🗄️ Инициализируем базу данных..."
python -c "from app import app, init_db; init_db()"

echo "✅ Развертывание завершено!"
echo ""
echo "Для запуска приложения выполните:"
echo "  source venv/bin/activate"
echo "  python app.py"
echo ""
echo "ИЛИ для production режима с gunicorn:"
echo "  source venv/bin/activate"
echo "  gunicorn -c gunicorn_config.py wsgi:app"