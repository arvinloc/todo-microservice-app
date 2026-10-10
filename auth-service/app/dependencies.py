from typing import Generator
from database import SessionLocal
from service import UsersService

def get_auth_service() -> Generator[UsersService, None, None]:
    # Создаем сессию для этого запроса
    with SessionLocal() as session:
        # Передаем сервис, который внутри себя уже создаст репозиторий
        yield UsersService(session)
    # Здесь блок with автоматически закроет сессию, когда эндпоинт отработает
