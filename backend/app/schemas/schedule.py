from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.schedule import ScheduleType


class ScheduleBase(BaseModel):
    name: str
    description: Optional[str] = None
    schedule_type: ScheduleType = ScheduleType.CRON
    cron_expression: Optional[str] = None
    interval_value: Optional[str] = None
    retention_days: int = Field(default=30, ge=1, le=365)
    max_backups: Optional[int] = Field(default=None, ge=1)

    @field_validator('cron_expression')
    @classmethod
    def validate_cron(cls, v: Optional[str], info) -> Optional[str]:
        if info.data.get('schedule_type') == ScheduleType.CRON and not v:
            raise ValueError('cron_expression is required when schedule_type is CRON')
        return v

    @field_validator('interval_value')
    @classmethod
    def validate_interval(cls, v: Optional[str], info) -> Optional[str]:
        if info.data.get('schedule_type') == ScheduleType.INTERVAL and not v:
            raise ValueError('interval_value is required when schedule_type is INTERVAL')
        if v and v not in ['hourly', 'daily', 'weekly', 'monthly']:
            raise ValueError('interval_value must be one of: hourly, daily, weekly, monthly')
        return v


class ScheduleCreate(ScheduleBase):
    database_id: int


class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cron_expression: Optional[str] = None
    interval_value: Optional[str] = None
    retention_days: Optional[int] = Field(default=None, ge=1, le=365)
    max_backups: Optional[int] = Field(default=None, ge=1)
    is_active: Optional[bool] = None


class ScheduleResponse(ScheduleBase):
    id: int
    database_id: int
    is_active: bool
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
