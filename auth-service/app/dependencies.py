from typing import Generator, AsyncGenerator
from database import SessionLocal
from service import UsersService

async def get_auth_service() -> AsyncGenerator[UsersService, None]:
    # Создаем сессию для этого запроса
    async with SessionLocal() as session:
        # Передаем сервис, который внутри себя уже создаст репозиторий
        yield UsersService(session)
    # Здесь блок with автоматически закроет сессию, когда эндпоинт отработает
