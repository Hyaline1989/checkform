#!/bin/bash

# Скрипт для развертывания на Timeweb Cloud

echo "🚀 Развертывание на Timeweb Cloud..."

# Устанавливаем переменные
PROJECT_NAME="call-evaluation-system"
PORT=5002

# Проверяем наличие Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не установлен. Установите Python3 и повторите попытку."
    exit 1
fi

# Создаем виртуальное окружение если его нет
if [ ! -d "venv" ]; then
    echo "📦 Создаем виртуальное окружение..."
    python3 -m venv venv
fi

# Активируем виртуальное окружение
source venv/bin/activate

# Устанавливаем зависимости
echo "📚 Устанавливаем зависимости..."
pip install --upgrade pip
pip install -r requirements.txt

# Создаем директории
mkdir -p instance logs

# Проверяем .env файл
if [ ! -f .env ]; then
    echo "⚠️ Создаем .env файл с настройками по умолчанию..."
    cat > .env << EOF
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
ADMIN_PASSWORD=admin123
PORT=5002
EOF
    echo "✅ Создан .env файл. Пароль администратора: admin123"
    echo "⚠️ Рекомендуется сменить пароль в файле .env!"
fi

# Инициализируем базу данных
echo "🗄️ Инициализируем базу данных..."
python -c "from app import app, init_db; init_db()"

# Останавливаем старый процесс если запущен
if [ -f "app.pid" ]; then
    echo "🛑 Останавливаем старый процесс..."
    kill $(cat app.pid) 2>/dev/null
    rm app.pid
fi

# Запускаем приложение с gunicorn
echo "🚀 Запускаем приложение на порту $PORT..."
nohup gunicorn -c gunicorn_config.py wsgi:app > logs/app.log 2>&1 & echo $! > app.pid

echo "✅ Приложение запущено!"
echo "🌐 Откройте в браузере: http://ваш-домен:$PORT"
echo ""
echo "Полезные команды:"
echo "  Просмотр логов: tail -f logs/app.log"
echo "  Остановка: kill \$(cat app.pid)"
echo "  Перезапуск: ./deploy.sh"