from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from schemas import TodoCreate, TodoUpdate, TodoOut
from service import  TodoService
from dependencies import get_todo_service,get_current_user
router = APIRouter()


@router.get("/",status_code=status.HTTP_200_OK,response_model=list[TodoOut])
async def get_todos(
    service: TodoService = Depends(get_todo_service),
    user_id: UUID = Depends(get_current_user)):

    return await service.repo.get_all_by_user(user_id)

@router.post("/",status_code=status.HTTP_201_CREATED,response_model=TodoOut)
async def create_todo(
        todo:TodoCreate,
        service: TodoService = Depends(get_todo_service),
        user_id: UUID = Depends(get_current_user)):
    try:
        created_todo = await service.create_todo(todo,user_id)
        return created_todo
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Something went wrong")

@router.patch("/{todo_id}",status_code=status.HTTP_200_OK,response_model=TodoOut)
async def update_todo(todo_id: UUID,
                      todo:TodoUpdate,
                      service: TodoService = Depends(get_todo_service),
                      user_id: UUID = Depends(get_current_user)):
    try:
        return await service.update_todo(todo_id,todo,user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Something went wrong")

@router.delete("/{todo_id}",status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(todo_id:UUID,
                      service: TodoService = Depends(get_todo_service),
                      user_id:UUID = Depends(get_current_user)):
    try:
        await service.delete_todo(todo_id,user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Something went wrong")

