import uuid

from pydantic import BaseModel, Field, EmailStr


class UserSchema(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

