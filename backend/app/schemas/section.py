from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class BlockType(str, Enum):
    STANDARD = "STANDARD"
    PLATFORM = "PLATFORM"
    SIDING = "SIDING"
    JUNCTION = "JUNCTION"

class SignalAspect(str, Enum):
    RED = "RED"
    YELLOW = "YELLOW"
    GREEN = "GREEN"
    DOUBLE_YELLOW = "DOUBLE_YELLOW"

class SectionBase(BaseModel):
    section_code: str = Field(..., description="Unique section code")
    section_name: str = Field(..., description="Section name")
    length: float = Field(..., gt=0, description="Section length in meters")
    max_speed: float = Field(default=100.0, gt=0, description="Maximum allowed speed")
    gradient: float = Field(default=0.0, description="Gradient percentage")
    curvature: float = Field(default=0.0, ge=0, description="Curvature radius")
    track_count: int = Field(default=2, ge=1, description="Number of tracks")
    platform_count: int = Field(default=0, ge=0, description="Number of platforms")
    has_loop_line: bool = Field(default=False, description="Has loop line")
    max_occupancy: int = Field(default=1, ge=1, description="Maximum trains allowed")

class SectionCreate(SectionBase):
    pass

class SectionUpdate(BaseModel):
    section_name: Optional[str] = None
    max_speed: Optional[float] = Field(None, gt=0)
    maintenance_mode: Optional[bool] = None
    is_active: Optional[bool] = None
    current_occupancy: Optional[int] = Field(None, ge=0)

class Section(SectionBase):
    id: int
    current_occupancy: int = 0
    is_active: bool = True
    maintenance_mode: bool = False
    entry_signal_id: Optional[str] = None
    exit_signal_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BlockBase(BaseModel):
    block_code: str = Field(..., description="Unique block code")
    section_id: int
    start_position: float = Field(..., ge=0, description="Start position in meters")
    end_position: float = Field(..., gt=0, description="End position in meters")
    block_type: BlockType = BlockType.STANDARD
    entry_signal: Optional[str] = None
    exit_signal: Optional[str] = None

class BlockCreate(BlockBase):
    pass

class BlockUpdate(BaseModel):
    is_occupied: Optional[bool] = None
    occupied_by_train: Optional[str] = None
    signal_aspect: Optional[SignalAspect] = None

class Block(BlockBase):
    id: int
    is_occupied: bool = False
    occupied_by_train: Optional[str] = None
    signal_aspect: SignalAspect = SignalAspect.GREEN
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SectionStatus(BaseModel):
    section_id: int
    section_code: str
    current_occupancy: int
    max_occupancy: int
    is_active: bool
    maintenance_mode: bool
    blocks: List[Block] = []
    trains_in_section: List[str] = []