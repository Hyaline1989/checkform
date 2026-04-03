from app import app, init_db

# Инициализируем базу данных при запуске
init_db()

if __name__ == "__main__":
    app.run()