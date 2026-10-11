from typing import Generator, AsyncGenerator
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import SessionLocal
from service import TodoService

security = HTTPBearer()

async def get_todo_service() -> AsyncGenerator[TodoService, None]:
    # Создаем сессию для этого запроса
    async with SessionLocal() as session:
        # Передаем сервис, который внутри себя уже создаст репозиторий
        yield TodoService(session)
    # Здесь блок with автоматически закроет сессию, когда эндпоинт отработает


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token,"my-sercret-mega-key", algorithms=["HS256"])
        user_id = payload["sub"]

        if user_id is None:
            raise HTTPException(status_code=401, detail="token is invalid")
        return UUID(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token is expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="invalid authorization credentials")

