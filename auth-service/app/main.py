from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from handlers import router
from database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Этот код срабатывает ДО того, как приложуха начнет принимать запросы
    print("Инициализация базы данных...")
    await init_db()
    print("Таблицы успешно созданы!")
    yield



app = FastAPI(lifespan=lifespan)



app.include_router(router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)