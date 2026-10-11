
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from models import Base
from settings import settings

engine = create_async_engine(settings.POSTGRES_URL,echo=True)

SessionLocal = async_sessionmaker(autocommit=False, class_=AsyncSession,autoflush=False,bind=engine)



async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
