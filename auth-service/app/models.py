import uuid

from sqlalchemy import Uuid, String,Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped
from sqlalchemy.orm import mapped_column


class Base(DeclarativeBase):
    pass


class Users(Base):
    __tablename__ = 'users'

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255),
                                       nullable=False,
                                       unique=True,
                                       index=True)
    hashed_password: Mapped[str] = mapped_column (String(255),nullable=False)