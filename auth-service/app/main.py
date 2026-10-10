from contextlib import asynccontextmanager

from fastapi import FastAPI
from handlers import router
from database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Этот код срабатывает ДО того, как приложуха начнет принимать запросы
    print("Инициализация базы данных...")
    init_db()
    print("Таблицы успешно созданы!")
    yield



app = FastAPI(lifespan=lifespan)

app.include_router(router)