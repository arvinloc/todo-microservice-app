
from uuid import UUID
from schemas import TodoCreate
from models import Todos
from sqlalchemy.orm import Session
from sqlalchemy import select

class TodoRepository:
    def __init__(self,session:Session):
        self.session: Session = session


    def get_all_by_user(self, user_id: UUID) -> list[Todos]:
        # НОВАЯ ЛОГИКА: Фильтруем задачи по конкретному пользователю
        query = select(Todos).where(Todos.user_id == user_id)
        return list(self.session.execute(query).scalars().all())

    def create_todo(self, dto: TodoCreate, user_id: UUID) -> Todos:
        # НОВАЯ ЛОГИКА: Передаем полученный user_id в модель
        new_todo = Todos(
            title=dto.title,
            description=dto.description,
            completed=dto.completed,
            user_id=user_id
        )
        self.session.add(new_todo)
        return new_todo

    def get_all_todos(self):
        query = select(Todos)
        return list(self.session.execute(query).scalars().all())

    def get_todo_by_id(self,todo_id: UUID) -> Todos | None:
        return self.session.get(Todos,todo_id)
