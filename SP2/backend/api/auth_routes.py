"""
Auth API Routes — login + register for all roles.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from backend.db import get_session, User, Campaign

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    role: str
    id: Optional[int] = None
    password: str


class LoginResponse(BaseModel):
    role: str
    id: Optional[int]
    display_name: str


class RegisterRequest(BaseModel):
    role: str
    display_name: str
    password: str
    campaign_id: Optional[int] = None


class RegisterResponse(BaseModel):
    role: str
    id: int
    display_name: str
    campaign_id: Optional[int]


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    if body.role not in ("admin", "supervisor", "pilgrim"):
        raise HTTPException(status_code=400, detail="Invalid role")

    if body.role == "admin":
        if body.id is None:
            result = await session.execute(
                select(User).where(User.role == "admin")
            )
            user = result.scalars().first()
        else:
            result = await session.execute(
                select(User).where(User.id == body.id, User.role == "admin")
            )
            user = result.scalar_one_or_none()
    else:
        if body.id is None:
            raise HTTPException(status_code=400, detail="id is required for this role")
        result = await session.execute(
            select(User).where(User.id == body.id, User.role == body.role)
        )
        user = result.scalar_one_or_none()

    if user is None or user.password_hash is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not pwd_ctx.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return LoginResponse(role=user.role, id=user.id, display_name=user.display_name)


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    if body.role not in ("admin", "supervisor", "pilgrim"):
        raise HTTPException(status_code=400, detail="Invalid role")
    if not body.display_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    campaign_id: Optional[int] = None
    if body.role in ("supervisor", "pilgrim"):
        if body.campaign_id is None:
            raise HTTPException(status_code=400, detail="Campaign code is required")
        result = await session.execute(select(Campaign).where(Campaign.id == body.campaign_id))
        campaign = result.scalar_one_or_none()
        if campaign is None:
            raise HTTPException(status_code=404, detail="Campaign code not found — ask your admin")
        campaign_id = campaign.id

    user = User(
        display_name=body.display_name.strip(),
        role=body.role,
        campaign_id=campaign_id,
        password_hash=pwd_ctx.hash(body.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return RegisterResponse(
        role=user.role,
        id=user.id,
        display_name=user.display_name,
        campaign_id=user.campaign_id,
    )
