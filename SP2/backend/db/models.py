from datetime import datetime
from sqlalchemy import Integer, Float, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from .session import Base


# ─── Existing tables (backward-compatible additions only) ─────────────────────

class LocationEvent(Base):
    __tablename__ = "location_events"

    id:            Mapped[int]   = mapped_column(Integer, primary_key=True, autoincrement=True)
    pilgrim_id:    Mapped[str]   = mapped_column(String, index=True, nullable=False)
    supervisor_id: Mapped[str]   = mapped_column(String, nullable=False)
    pilgrim_lat:   Mapped[float] = mapped_column(Float, nullable=False)
    pilgrim_lon:   Mapped[float] = mapped_column(Float, nullable=False)
    supervisor_lat:Mapped[float] = mapped_column(Float, nullable=False)
    supervisor_lon:Mapped[float] = mapped_column(Float, nullable=False)
    pilgrim_speed: Mapped[float] = mapped_column(Float, default=0.0)
    supervisor_speed: Mapped[float] = mapped_column(Float, default=0.0)
    pilgrim_heading:  Mapped[float] = mapped_column(Float, default=0.0)
    supervisor_heading: Mapped[float] = mapped_column(Float, default=0.0)
    label:         Mapped[int]   = mapped_column(Integer, nullable=True)
    confidence:    Mapped[float] = mapped_column(Float, nullable=True)
    ts:            Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    campaign_id:   Mapped[int | None] = mapped_column(Integer, nullable=True)   # soft ref to campaigns.id


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id:           Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    pilgrim_id:   Mapped[str]  = mapped_column(String, index=True, nullable=False)
    risk_level:   Mapped[int]  = mapped_column(Integer, nullable=False)   # 1=Warning, 2=Critical
    message:      Mapped[str]  = mapped_column(String, nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    ts:           Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    campaign_id:  Mapped[int | None] = mapped_column(Integer, nullable=True)   # soft ref to campaigns.id


# ─── New tables ────────────────────────────────────────────────────────────────

class Campaign(Base):
    __tablename__ = "campaigns"

    id:          Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    name:        Mapped[str]  = mapped_column(String, nullable=False)
    description: Mapped[str]  = mapped_column(String, default="")
    created_by:  Mapped[int | None] = mapped_column(Integer, nullable=True)   # soft ref to users.id
    is_active:   Mapped[bool] = mapped_column(Boolean, default=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id:            Mapped[int]       = mapped_column(Integer, primary_key=True, autoincrement=True)
    display_name:  Mapped[str]       = mapped_column(String, nullable=False)
    role:          Mapped[str]       = mapped_column(String, nullable=False)   # "admin"|"supervisor"|"pilgrim"
    campaign_id:   Mapped[int | None] = mapped_column(Integer, nullable=True)  # soft ref to campaigns.id
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)


class Assignment(Base):
    __tablename__ = "assignments"

    id:            Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id:   Mapped[int] = mapped_column(Integer, ForeignKey("campaigns.id"), nullable=False)
    pilgrim_id:    Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    supervisor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)


class HelpRequest(Base):
    __tablename__ = "help_requests"

    id:            Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id:   Mapped[int | None] = mapped_column(Integer, nullable=True)   # soft ref to campaigns.id
    pilgrim_id:    Mapped[int]  = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    supervisor_id: Mapped[int]  = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    message:       Mapped[str]  = mapped_column(String, default="")
    acknowledged:  Mapped[bool] = mapped_column(Boolean, default=False)
    ts:            Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
