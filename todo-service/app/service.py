from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from starlette import status

from repository import TodoRepository
from schemas import TodoCreate, TodoUpdate  # Ваши Pydantic-схемы
from models import Todos


class TodoService:
    def __init__(self, session: Session):
        self.session = session
        self.repo = TodoRepository(session)

    def create_todo(self, dto: TodoCreate,user_id:UUID) -> Todos:

        try:
            todo = self.repo.create_todo(dto,user_id)
            self.session.commit()
            self.session.refresh(todo)
            return todo

        except Exception:
            self.session.rollback()
            raise

    def get_todo(self, todo_id: UUID, user_id: UUID) -> Todos:
        todo = self.repo.get_todo_by_id(todo_id)
        if not todo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")

        if todo.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="You don't have permission to access this todo")

        return todo

    def update_todo(self, todo_id: UUID, dto: TodoUpdate, user_id: UUID) -> Todos:
        todo = self.get_todo(todo_id, user_id)

        update_data = dto.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(todo, key, value)
        self.session.commit()
        self.session.refresh(todo)
        return todo

    def delete_todo(self, todo_id: UUID, user_id: UUID) -> None:
        todo = self.get_todo(todo_id, user_id)
        self.session.delete(todo)
        self.session.commit()

