
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.util import await_

from schemas import TodoCreate
from models import Todos
from sqlalchemy.orm import Session
from sqlalchemy import select

class TodoRepository:
    def __init__(self,session:AsyncSession):
        self.session: Session = session


    async def get_all_by_user(self, user_id: UUID) -> list[Todos]:
        # НОВАЯ ЛОГИКА: Фильтруем задачи по конкретному пользователю
        query = select(Todos).where(Todos.user_id == user_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create_todo(self, dto: TodoCreate, user_id: UUID) -> Todos:
        # НОВАЯ ЛОГИКА: Передаем полученный user_id в модель
        new_todo = Todos(
            title=dto.title,
            description=dto.description,
            completed=dto.completed,
            user_id=user_id
        )
        self.session.add(new_todo)
        return new_todo

    async def get_all_todos(self):
        query = select(Todos)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_todo_by_id(self,todo_id: UUID) -> Todos | None:
        return await self.session.get(Todos,todo_id)
