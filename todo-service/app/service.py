from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from starlette import status

from repository import TodoRepository
from schemas import TodoCreate, TodoUpdate  # Ваши Pydantic-схемы
from models import Todos


class TodoService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = TodoRepository(session)

    async def create_todo(self, dto: TodoCreate,user_id:UUID) -> Todos:

        try:
            todo = await self.repo.create_todo(dto,user_id)
            await self.session.commit()
            await self.session.refresh(todo)
            return todo

        except Exception:
            await self.session.rollback()
            raise

    async def get_todo(self, todo_id: UUID, user_id: UUID) -> Todos:
        todo = await self.repo.get_todo_by_id(todo_id)
        if not todo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

        if todo.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="You don't have permission to access this todo")

        return todo

    async def update_todo(self, todo_id: UUID, dto: TodoUpdate, user_id: UUID) -> Todos:
        todo = await self.get_todo(todo_id, user_id)

        update_data = dto.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(todo, key, value)
        await self.session.commit()
        await self.session.refresh(todo)
        return todo

    async def delete_todo(self, todo_id: UUID, user_id: UUID) -> None:
        todo = await self.get_todo(todo_id, user_id)
        await self.session.delete(todo)
        await self.session.commit()

