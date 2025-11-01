from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from email_validator import validate_email, EmailNotValidError


class UserBase(BaseModel):
    email: str
    username: str
    full_name: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v: str) -> str:
        try:
            # Allow local domains for development
            validate_email(v, check_deliverability=False)
            return v
        except EmailNotValidError as e:
            raise ValueError(str(e))


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v: str) -> str:
        try:
            # Allow local domains for development
            validate_email(v, check_deliverability=False)
            return v
        except EmailNotValidError as e:
            raise ValueError(str(e))


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
