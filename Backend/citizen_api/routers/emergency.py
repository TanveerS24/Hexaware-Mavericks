from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from core.db.session import get_db
from core.models.emergency_contacts import EmergencyContact

router = APIRouter(prefix="/emergency", tags=["Emergency"])

class EmergencyContactResponse(BaseModel):
    id: int
    service_type: str
    name: str
    phone_number: str
    area: str | None = None
    city: str | None = None
    state: str | None = None

    class Config:
        from_attributes = True

@router.get("", response_model=List[EmergencyContactResponse])
async def list_emergency_contacts(db: AsyncSession = Depends(get_db)):
    """
    List all active emergency contacts.
    """
    stmt = select(EmergencyContact).where(EmergencyContact.is_active == True)
    result = await db.execute(stmt)
    contacts = result.scalars().all()
    return contacts
