from datetime import datetime,timezone, timedelta
from uuid import UUID

import bcrypt
import jwt
from fastapi import HTTPException
from sqlalchemy.orm import Session
from schemas import UserSchema
from models import Users

class UsersService:
    def __init__(self, session: Session):
        self.session = session
        # Сервис сам создает репозиторий, передавая ему текущую сессию

    def _hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


    def _verify_password(self, password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

    def _create_access_token(self,user_id:UUID) -> str:
        payload = {
            "sub": str(user_id),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        }

        encoded_jwt = jwt.encode(payload, "my-sercret-mega-key", algorithm="HS256")

        return encoded_jwt

    def register(self, dto: UserSchema) -> Users:
        exists_user = self.session.query(Users).filter_by(email=dto.email).first()

        if exists_user:
            raise HTTPException(status_code=400, detail="this user already exists")

        hashed_password = self._hash_password(dto.password)
        new_user = Users(
            email=dto.email,
            hashed_password=hashed_password
        )

        self.session.add(new_user)
        self.session.commit()

        return new_user

    def login(self, dto: UserSchema) -> str:
        user = self.session.query(Users).filter_by(email=dto.email).first()

        if not user:
            raise HTTPException(status_code=404, detail="user not found")

        return self._create_access_token(user.id)
