"""
Section management routes for TrackWise Railway Optimization System
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_active_user
from app.models.section import Section
from app.database import AsyncSessionLocal

router = APIRouter()


class SectionBase(BaseModel):
    section_code: str = Field(..., description="Unique section code")
    name: str = Field(..., description="Section name")
    section_type: str = Field(default="MAIN_LINE", description="Section type")
    length_km: float = Field(..., ge=0, description="Section length in kilometers")
    max_speed_kmh: float = Field(default=80.0, ge=0, le=300, description="Maximum speed limit")
    max_capacity: int = Field(default=1, ge=1, description="Maximum train capacity")


class SectionCreate(SectionBase):
    pass


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    section_type: Optional[str] = None
    status: Optional[str] = None
    length_km: Optional[float] = Field(None, ge=0)
    max_speed_kmh: Optional[float] = Field(None, ge=0, le=300)
    max_capacity: Optional[int] = Field(None, ge=1)


class SectionResponse(SectionBase):
    id: int
    status: str
    railway_line: str
    current_occupancy: int
    maintenance_status: str
    signal_state: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Mock sections database
MOCK_SECTIONS = [
    {
        "id": 1,
        "section_code": "SEC-001",
        "name": "Central Terminal",
        "section_type": "STATION",
        "status": "AVAILABLE",
        "railway_line": "Main Line",
        "length_km": 5.0,
        "max_speed_kmh": 60.0,
        "max_capacity": 3,
        "current_occupancy": 1,
        "maintenance_status": "GOOD",
        "signal_state": "GREEN",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": 2,
        "section_code": "SEC-002",
        "name": "Main Line North",
        "section_type": "MAIN_LINE",
        "status": "AVAILABLE",
        "railway_line": "Main Line",
        "length_km": 15.0,
        "max_speed_kmh": 120.0,
        "max_capacity": 2,
        "current_occupancy": 1,
        "maintenance_status": "GOOD",
        "signal_state": "GREEN",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": 3,
        "section_code": "SEC-003",
        "name": "Junction Alpha",
        "section_type": "JUNCTION",
        "status": "AVAILABLE",
        "railway_line": "Main Line",
        "length_km": 8.0,
        "max_speed_kmh": 80.0,
        "max_capacity": 2,
        "current_occupancy": 1,
        "maintenance_status": "GOOD",
        "signal_state": "YELLOW",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": 4,
        "section_code": "SEC-004",
        "name": "Freight Yard",
        "section_type": "YARD",
        "status": "AVAILABLE",
        "railway_line": "Branch Line",
        "length_km": 12.0,
        "max_speed_kmh": 50.0,
        "max_capacity": 4,
        "current_occupancy": 2,
        "maintenance_status": "FAIR",
        "signal_state": "GREEN",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    },
    {
        "id": 5,
        "section_code": "SEC-005",
        "name": "Branch Line East",
        "section_type": "BRANCH_LINE",
        "status": "MAINTENANCE",
        "railway_line": "Branch Line",
        "length_km": 20.0,
        "max_speed_kmh": 100.0,
        "max_capacity": 1,
        "current_occupancy": 0,
        "maintenance_status": "UNDER_REPAIR",
        "signal_state": "RED",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
]


@router.get("/", response_model=List[SectionResponse])
async def get_sections(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    section_type: Optional[str] = Query(None, description="Filter by section type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    railway_line: Optional[str] = Query(None, description="Filter by railway line"),
    current_user: dict = Depends(get_current_active_user)
) -> List[SectionResponse]:
    """Get all sections with optional filtering"""
    
    # Use database-backed approach
    async with AsyncSessionLocal() as session:
        # Build query
        stmt = select(Section)
        
        # Apply filters
        if section_type:
            stmt = stmt.where(Section.section_type.ilike(f"%{section_type}%"))
        
        if status:
            stmt = stmt.where(Section.status.ilike(f"%{status}%"))
        
        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        
        # Execute query
        result = await session.execute(stmt)
        sections = result.scalars().all()
        
        # Convert to mock-style format for compatibility
        section_responses = []
        for section in sections:
            section_data = {
                "id": section.id,
                "section_code": section.section_code,
                "name": section.name or "",
                "section_type": section.section_type,
                "status": section.status,
                "length_km": section.length_km,
                "max_speed_kmh": section.max_speed_kmh,
                "max_capacity": section.max_capacity,
                "current_occupancy": 0,
                "railway_line": "Main Line",
                "maintenance_status": "GOOD",
                "signal_state": "GREEN",
                "created_at": section.created_at,
                "updated_at": section.updated_at or section.created_at
            }
            section_responses.append(SectionResponse(**section_data))
        
        return section_responses


@router.get("/{section_id}", response_model=SectionResponse)
async def get_section(
    section_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> SectionResponse:
    """Get section by ID"""
    
    section = next((s for s in MOCK_SECTIONS if s["id"] == section_id), None)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section with ID {section_id} not found"
        )
    
    return SectionResponse(**section)


@router.post("/", response_model=SectionResponse)
async def create_section(
    section_in: SectionCreate,
    current_user: dict = Depends(get_current_active_user)
) -> SectionResponse:
    """Create new section"""
    
    # Check if section code already exists
    if any(s["section_code"] == section_in.section_code for s in MOCK_SECTIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Section code {section_in.section_code} already exists"
        )
    
    # Create new section
    new_section = {
        "id": max((s["id"] for s in MOCK_SECTIONS), default=0) + 1,
        **section_in.dict(),
        "status": "AVAILABLE",
        "railway_line": "Main Line",
        "current_occupancy": 0,
        "maintenance_status": "GOOD",
        "signal_state": "GREEN",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    MOCK_SECTIONS.append(new_section)
    
    return SectionResponse(**new_section)


@router.put("/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: int,
    section_in: SectionUpdate,
    current_user: dict = Depends(get_current_active_user)
) -> SectionResponse:
    """Update section"""
    
    section = next((s for s in MOCK_SECTIONS if s["id"] == section_id), None)
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section with ID {section_id} not found"
        )
    
    # Update section fields
    update_data = section_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in section:
            section[field] = value
    
    section["updated_at"] = datetime.utcnow()
    
    return SectionResponse(**section)


@router.delete("/{section_id}")
async def delete_section(
    section_id: int,
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Delete section"""
    
    section_index = next((i for i, s in enumerate(MOCK_SECTIONS) if s["id"] == section_id), None)
    if section_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section with ID {section_id} not found"
        )
    
    # Check if section is occupied
    section = MOCK_SECTIONS[section_index]
    if section["current_occupancy"] > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete section with trains present"
        )
    
    deleted_section = MOCK_SECTIONS.pop(section_index)
    
    return {"message": f"Section {deleted_section['section_code']} deleted successfully"}


@router.get("/statistics/summary")
async def get_sections_summary(
    current_user: dict = Depends(get_current_active_user)
) -> dict:
    """Get sections summary statistics"""
    
    total_sections = len(MOCK_SECTIONS)
    available_sections = len([s for s in MOCK_SECTIONS if s["status"] == "AVAILABLE"])
    maintenance_sections = len([s for s in MOCK_SECTIONS if s["status"] == "MAINTENANCE"])
    occupied_sections = len([s for s in MOCK_SECTIONS if s["current_occupancy"] > 0])
    
    total_capacity = sum(s["max_capacity"] for s in MOCK_SECTIONS)
    total_occupancy = sum(s["current_occupancy"] for s in MOCK_SECTIONS)
    utilization_rate = (total_occupancy / total_capacity * 100) if total_capacity > 0 else 0
    
    return {
        "total_sections": total_sections,
        "available_sections": available_sections,
        "maintenance_sections": maintenance_sections,
        "occupied_sections": occupied_sections,
        "total_capacity": total_capacity,
        "total_occupancy": total_occupancy,
        "utilization_rate": round(utilization_rate, 2)
    }