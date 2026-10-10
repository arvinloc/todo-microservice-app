import uuid

from pydantic import BaseModel, Field


class TodoCreate(BaseModel):
    title: str = Field(min_length=1,max_length=255)
    description: str = Field(min_length=1,max_length=255)
    completed: bool

class TodoUpdate(BaseModel):
    title: str = Field(min_length=1,max_length=255)
    description: str = Field(min_length=1,max_length=255)
    completed: bool

class TodoOut(BaseModel):
    id: uuid.UUID
    title: str = Field(min_length=1,max_length=255)
    description: str = Field(min_length=1,max_length=255)
    completed: bool

    class Config:
        from_attributes = True