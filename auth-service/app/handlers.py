from fastapi import APIRouter, Depends
from starlette import status

from schemas import UserSchema,TokenResponse
from service import  UsersService
from dependencies import get_auth_service
router = APIRouter()



@router.post("/signup",status_code=status.HTTP_201_CREATED)
async def register_user(
        user:UserSchema,
        service: UsersService = Depends(get_auth_service)):

        await service.register(user)

        return {"message":"user successfully registered"}


@router.post("/signin",status_code=status.HTTP_200_OK,response_model=TokenResponse)
async def login_user(
        user:UserSchema,
        service: UsersService = Depends(get_auth_service)):

        token = await service.login(user)

        return TokenResponse(access_token=token)

