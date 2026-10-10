from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from settings import settings

engine = create_engine(settings.SQLITE_URL,echo=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False,bind=engine)



def init_db():
    Base.metadata.create_all(engine)