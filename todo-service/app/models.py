import uuid

from sqlalchemy import Uuid, String,Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped
from sqlalchemy.orm import mapped_column


class Base(DeclarativeBase):
    pass


class Todos(Base):
    __tablename__ = 'todos'

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column (String(255),nullable=False)
    description: Mapped[str] = mapped_column(String(255),nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean,nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)