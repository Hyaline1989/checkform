#!/usr/bin/env python3
import secrets
import string
import os

def generate_secret_key(length=32):
    """Генерация случайного секретного ключа"""
    return secrets.token_hex(length)

def generate_jwt_key(length=32):
    """Генерация JWT секретного ключа"""
    return secrets.token_urlsafe(length)

def generate_password(length=12):
    """Генерация надежного пароля"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def create_env_file():
    """Создание .env файла с сгенерированными ключами"""
    env_content = f"""# Секретные ключи (сгенерированы автоматически)
SECRET_KEY={generate_secret_key()}
JWT_SECRET_KEY={generate_jwt_key()}

# Пароль администратора (обязательно смените после первого входа!)
ADMIN_PASSWORD={generate_password()}

# Порт (обычно 5002 для Timeweb)
PORT=5002
"""
    
    with open('.env', 'w') as f:
        f.write(env_content)
    
    print("✅ Файл .env успешно создан!")
    print("=" * 50)
    print("Сгенерированные ключи:")
    print("=" * 50)
    print(env_content)
    print("=" * 50)
    print(f"🔑 Пароль администратора: {generate_password()}")
    print("⚠️  Сохраните этот пароль в надежном месте!")
    print("⚠️  Рекомендуется сменить пароль после первого входа!")

if __name__ == "__main__":
    if not os.path.exists('.env'):
        create_env_file()
    else:
        print("⚠️  Файл .env уже существует!")
        overwrite = input("Перезаписать? (y/N): ")
        if overwrite.lower() == 'y':
            create_env_file()