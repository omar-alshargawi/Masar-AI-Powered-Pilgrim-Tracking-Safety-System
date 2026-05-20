"""
Admin API Routes — campaign and user management.
All endpoints are under /api/admin.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from backend.db import get_session, User, Campaign, Assignment, AlertEvent, LocationEvent
from backend.api.ws_manager import manager

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    description: str = ""

class CampaignOut(BaseModel):
    id: int
    name: str
    description: str
    is_active: bool
    created_at: str

class UserCreate(BaseModel):
    display_name: str
    role: str       # "supervisor" | "pilgrim"
    password: str

class UserOut(BaseModel):
    id: int
    display_name: str
    role: str
    campaign_id: Optional[int]

class AssignmentCreate(BaseModel):
    pilgrim_id: int
    supervisor_id: int

class AssignmentOut(BaseModel):
    id: int
    campaign_id: int
    pilgrim_id: int
    supervisor_id: int

class CampaignStats(BaseModel):
    campaign_id: int
    total_pilgrims: int
    total_alerts: int
    safe: int
    warning: int
    critical: int


# ─── Campaigns ────────────────────────────────────────────────────────────────

@router.get("/campaigns", response_model=list[CampaignOut])
async def list_campaigns(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Campaign).order_by(desc(Campaign.created_at)))
    return [
        CampaignOut(
            id=c.id, name=c.name, description=c.description,
            is_active=c.is_active, created_at=c.created_at.isoformat()
        )
        for c in result.scalars().all()
    ]


@router.post("/campaigns", response_model=CampaignOut, status_code=201)
async def create_campaign(body: CampaignCreate, session: AsyncSession = Depends(get_session)):
    campaign = Campaign(name=body.name, description=body.description)
    session.add(campaign)
    await session.commit()
    await session.refresh(campaign)
    return CampaignOut(
        id=campaign.id, name=campaign.name, description=campaign.description,
        is_active=campaign.is_active, created_at=campaign.created_at.isoformat()
    )


@router.patch("/campaigns/{campaign_id}/deactivate", response_model=CampaignOut)
async def deactivate_campaign(campaign_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.is_active = False
    await session.commit()
    await session.refresh(campaign)
    return CampaignOut(
        id=campaign.id, name=campaign.name, description=campaign.description,
        is_active=campaign.is_active, created_at=campaign.created_at.isoformat()
    )


@router.delete("/campaigns/{campaign_id}", status_code=204)
async def delete_campaign(campaign_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await session.delete(campaign)
    await session.commit()


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
async def list_users(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).order_by(User.role, User.display_name))
    return [
        UserOut(id=u.id, display_name=u.display_name, role=u.role, campaign_id=u.campaign_id)
        for u in result.scalars().all()
    ]


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(body: UserCreate, session: AsyncSession = Depends(get_session)):
    if body.role not in ("supervisor", "pilgrim"):
        raise HTTPException(status_code=400, detail="role must be 'supervisor' or 'pilgrim'")
    user = User(
        display_name=body.display_name,
        role=body.role,
        password_hash=pwd_ctx.hash(body.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserOut(id=user.id, display_name=user.display_name, role=user.role, campaign_id=user.campaign_id)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await session.delete(user)
    await session.commit()


# ─── Assignments ──────────────────────────────────────────────────────────────

@router.get("/campaigns/{campaign_id}/assignments", response_model=list[AssignmentOut])
async def list_assignments(campaign_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(Assignment).where(Assignment.campaign_id == campaign_id)
    )
    return [
        AssignmentOut(id=a.id, campaign_id=a.campaign_id, pilgrim_id=a.pilgrim_id, supervisor_id=a.supervisor_id)
        for a in result.scalars().all()
    ]


@router.post("/campaigns/{campaign_id}/assignments", response_model=AssignmentOut, status_code=201)
async def create_assignment(
    campaign_id: int,
    body: AssignmentCreate,
    session: AsyncSession = Depends(get_session),
):
    # Verify both users exist
    for uid, expected_role in [(body.pilgrim_id, "pilgrim"), (body.supervisor_id, "supervisor")]:
        res = await session.execute(select(User).where(User.id == uid))
        user = res.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail=f"User {uid} not found")
        if user.role != expected_role:
            raise HTTPException(status_code=400, detail=f"User {uid} is not a {expected_role}")

    assignment = Assignment(
        campaign_id=campaign_id,
        pilgrim_id=body.pilgrim_id,
        supervisor_id=body.supervisor_id,
    )
    session.add(assignment)
    await session.commit()
    await session.refresh(assignment)

    # Update live supervisor map
    manager.update_supervisor_map(body.pilgrim_id, body.supervisor_id)

    return AssignmentOut(
        id=assignment.id, campaign_id=assignment.campaign_id,
        pilgrim_id=assignment.pilgrim_id, supervisor_id=assignment.supervisor_id,
    )


@router.delete("/assignments/{assignment_id}", status_code=204)
async def delete_assignment(assignment_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    manager.remove_from_supervisor_map(assignment.pilgrim_id)
    await session.delete(assignment)
    await session.commit()


# ─── Campaign Stats ────────────────────────────────────────────────────────────

@router.get("/campaigns/{campaign_id}/stats", response_model=CampaignStats)
async def campaign_stats(campaign_id: int, session: AsyncSession = Depends(get_session)):
    # Count distinct pilgrims assigned
    res = await session.execute(
        select(func.count(Assignment.pilgrim_id.distinct()))
        .where(Assignment.campaign_id == campaign_id)
    )
    total_pilgrims = res.scalar() or 0

    # Count alerts for this campaign
    res = await session.execute(
        select(func.count()).select_from(AlertEvent)
        .where(AlertEvent.campaign_id == campaign_id)
    )
    total_alerts = res.scalar() or 0

    # Latest label counts for pilgrims in this campaign
    subq = (
        select(func.max(LocationEvent.id).label("max_id"))
        .where(LocationEvent.campaign_id == campaign_id)
        .group_by(LocationEvent.pilgrim_id)
        .subquery()
    )
    res = await session.execute(
        select(LocationEvent.label, func.count().label("cnt"))
        .join(subq, LocationEvent.id == subq.c.max_id)
        .group_by(LocationEvent.label)
    )
    counts = {row.label: row.cnt for row in res}

    return CampaignStats(
        campaign_id=campaign_id,
        total_pilgrims=total_pilgrims,
        total_alerts=total_alerts,
        safe=counts.get(0, 0),
        warning=counts.get(1, 0),
        critical=counts.get(2, 0),
    )


@router.get("/stats")
async def global_stats(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(func.count()).select_from(Campaign))
    total_campaigns = res.scalar() or 0
    res = await session.execute(select(func.count()).select_from(User).where(User.role == "supervisor"))
    total_supervisors = res.scalar() or 0
    res = await session.execute(select(func.count()).select_from(User).where(User.role == "pilgrim"))
    total_pilgrims = res.scalar() or 0
    res = await session.execute(select(func.count()).select_from(AlertEvent))
    total_alerts = res.scalar() or 0
    return {
        "total_campaigns": total_campaigns,
        "total_supervisors": total_supervisors,
        "total_pilgrims": total_pilgrims,
        "total_alerts": total_alerts,
    }
