"""
Section management service for TrackWise Railway Optimization System
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func, text
from sqlalchemy.orm import selectinload
import logging

from app.models.section import Section, SectionStatus, SectionType
from app.models.train import Train
from app.schemas.section import SectionCreate, SectionUpdate
from app.services.base import BaseService
from app.utils.exceptions import ValidationError, NotFoundError
from app.utils.cache import cache_key, get_cached, set_cache, delete_cache_pattern
from app.config import settings

logger = logging.getLogger(__name__)


class SectionService(BaseService[Section, SectionCreate, SectionUpdate]):
    """Service for railway section management operations"""
    
    def __init__(self):
        super().__init__(Section)
    
    async def get_by_code(self, db: AsyncSession, section_code: str) -> Optional[Section]:
        """Get section by section code"""
        cache_key_str = cache_key("section", "code", section_code)
        cached_result = await get_cached(cache_key_str)
        
        if cached_result:
            return Section(**cached_result)
        
        query = select(Section).where(
            and_(Section.section_code == section_code, Section.is_deleted == False)
        ).options(
            selectinload(Section.creator),
            selectinload(Section.trains)
        )
        
        result = await db.execute(query)
        section = result.scalar_one_or_none()
        
        if section:
            await set_cache(cache_key_str, section.to_dict(), ttl=300)  # 5 minutes
        
        return section
    
    async def get_multi_with_filters(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ) -> Tuple[List[Section], int]:
        """Get sections with advanced filtering, searching, and sorting"""
        
        # Build base query
        query = select(Section).where(Section.is_deleted == False)
        count_query = select(func.count(Section.id)).where(Section.is_deleted == False)
        
        # Apply filters
        if filters:
            filter_conditions = []
            
            if "status" in filters:
                filter_conditions.append(Section.status == filters["status"])
            
            if "section_type" in filters:
                filter_conditions.append(Section.section_type == filters["section_type"])
            
            if "railway_line" in filters:
                filter_conditions.append(Section.railway_line == filters["railway_line"])
            
            if "is_active" in filters:
                filter_conditions.append(Section.is_active == filters["is_active"])
            
            if "min_capacity" in filters:
                filter_conditions.append(Section.max_capacity >= filters["min_capacity"])
            
            if "max_capacity" in filters:
                filter_conditions.append(Section.max_capacity <= filters["max_capacity"])
            
            if "length_range" in filters:
                min_length, max_length = filters["length_range"]
                filter_conditions.append(Section.length_km >= min_length)
                filter_conditions.append(Section.length_km <= max_length)
            
            if "utilization_threshold" in filters:
                # Filter by current utilization (requires subquery)
                threshold = filters["utilization_threshold"]
                # This would need a more complex query with current train counts
            
            if filter_conditions:
                query = query.where(and_(*filter_conditions))
                count_query = count_query.where(and_(*filter_conditions))
        
        # Apply search
        if search:
            search_conditions = [
                Section.section_code.ilike(f"%{search}%"),
                Section.name.ilike(f"%{search}%"),
                Section.railway_line.ilike(f"%{search}%"),
                Section.description.ilike(f"%{search}%")
            ]
            query = query.where(or_(*search_conditions))
            count_query = count_query.where(or_(*search_conditions))
        
        # Get total count
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        
        # Apply sorting
        if sort_by:
            sort_column = getattr(Section, sort_by, None)
            if sort_column:
                if sort_order.lower() == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())
            else:
                # Default sort by section_code
                query = query.order_by(Section.section_code.asc())
        else:
            query = query.order_by(Section.section_code.asc())
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Add relationships
        query = query.options(
            selectinload(Section.creator),
            selectinload(Section.trains)
        )
        
        # Execute query
        result = await db.execute(query)
        sections = result.scalars().all()
        
        return list(sections), total
    
    async def create(
        self,
        db: AsyncSession,
        obj_in: SectionCreate,
        created_by: Optional[int] = None
    ) -> Section:
        """Create a new railway section"""
        
        # Validate section code uniqueness
        existing_section = await self.get_by_code(db, obj_in.section_code)
        if existing_section:
            raise ValidationError(f"Section code {obj_in.section_code} already exists")
        
        # Validate coordinates if provided
        if obj_in.start_coordinates and obj_in.end_coordinates:
            if not self._validate_coordinates(obj_in.start_coordinates, obj_in.end_coordinates):
                raise ValidationError("Invalid coordinates provided")
        
        # Create section object
        section_data = obj_in.dict()
        if created_by:
            section_data["created_by"] = created_by
        
        section = Section(**section_data)
        
        # Set initial status if not provided
        if not section.status:
            section.status = SectionStatus.AVAILABLE
        
        # Calculate distance if coordinates provided
        if section.start_coordinates and section.end_coordinates:
            section.length_km = self._calculate_distance(
                section.start_coordinates, section.end_coordinates
            )
        
        db.add(section)
        await db.commit()
        await db.refresh(section)
        
        # Clear related caches
        await delete_cache_pattern("section:*")
        await delete_cache_pattern("sections:*")
        
        logger.info(f"Section {section.section_code} created")
        
        return section
    
    async def update(
        self,
        db: AsyncSession,
        db_obj: Section,
        obj_in: SectionUpdate,
        updated_by: Optional[int] = None
    ) -> Section:
        """Update an existing railway section"""
        
        # Validate section code uniqueness if changing
        if obj_in.section_code and obj_in.section_code != db_obj.section_code:
            existing_section = await self.get_by_code(db, obj_in.section_code)
            if existing_section:
                raise ValidationError(f"Section code {obj_in.section_code} already exists")
        
        # Validate coordinates if provided
        update_data = obj_in.dict(exclude_unset=True)
        if "start_coordinates" in update_data or "end_coordinates" in update_data:
            start_coords = update_data.get("start_coordinates", db_obj.start_coordinates)
            end_coords = update_data.get("end_coordinates", db_obj.end_coordinates)
            
            if start_coords and end_coords:
                if not self._validate_coordinates(start_coords, end_coords):
                    raise ValidationError("Invalid coordinates provided")
                
                # Recalculate distance
                update_data["length_km"] = self._calculate_distance(start_coords, end_coords)
        
        # Update section
        if updated_by:
            update_data["updated_by"] = updated_by
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        await db.commit()
        await db.refresh(db_obj)
        
        # Clear related caches
        await delete_cache_pattern(f"section:*{db_obj.section_code}*")
        await delete_cache_pattern("sections:*")
        
        logger.info(f"Section {db_obj.section_code} updated")
        
        return db_obj
    
    async def update_status(
        self,
        db: AsyncSession,
        section_id: int,
        new_status: SectionStatus,
        updated_by: Optional[int] = None,
        reason: Optional[str] = None
    ) -> Section:
        """Update section status with validation"""
        
        section = await self.get_by_id(db, section_id)
        if not section:
            raise NotFoundError("Section not found")
        
        # Validate status transition
        if not await self.is_valid_status_transition(db, section_id, section.status, new_status):
            raise ValidationError(f"Invalid status transition from {section.status} to {new_status}")
        
        old_status = section.status
        section.status = new_status
        section.status_updated_at = datetime.utcnow()
        
        if updated_by:
            section.updated_by = updated_by
        
        # Add status change to notes if reason provided
        if reason:
            status_note = f"Status changed from {old_status} to {new_status}: {reason}"
            if section.notes:
                section.notes += f"\n{status_note}"
            else:
                section.notes = status_note
        
        await db.commit()
        await db.refresh(section)
        
        # Clear related caches
        await delete_cache_pattern(f"section:*{section.section_code}*")
        
        logger.info(f"Section {section.section_code} status changed from {old_status} to {new_status}")
        
        return section
    
    async def is_valid_status_transition(
        self,
        db: AsyncSession,
        section_id: int,
        current_status: SectionStatus,
        new_status: SectionStatus
    ) -> bool:
        """Validate if status transition is allowed"""
        
        # Define valid transitions
        valid_transitions = {
            SectionStatus.AVAILABLE: [SectionStatus.OCCUPIED, SectionStatus.MAINTENANCE, SectionStatus.BLOCKED],
            SectionStatus.OCCUPIED: [SectionStatus.AVAILABLE, SectionStatus.MAINTENANCE, SectionStatus.BLOCKED],
            SectionStatus.MAINTENANCE: [SectionStatus.AVAILABLE],
            SectionStatus.BLOCKED: [SectionStatus.AVAILABLE, SectionStatus.MAINTENANCE],
            SectionStatus.OUT_OF_SERVICE: [SectionStatus.MAINTENANCE]
        }
        
        if new_status not in valid_transitions.get(current_status, []):
            return False
        
        # Additional validation: can't set to AVAILABLE if trains are present
        if new_status == SectionStatus.AVAILABLE:
            current_trains = await self.get_current_trains(db, section_id)
            if current_trains:
                return False
        
        return True
    
    async def get_current_trains(self, db: AsyncSession, section_id: int) -> List[Train]:
        """Get trains currently in the section"""
        
        query = select(Train).where(
            and_(
                Train.current_section == section_id,
                Train.is_deleted == False,
                Train.is_active == True
            )
        ).options(selectinload(Train.creator))
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def get_current_utilization(self, db: AsyncSession, section_id: int) -> Dict[str, Any]:
        """Get current utilization of the section"""
        
        section = await self.get_by_id(db, section_id)
        if not section:
            return {"utilization_percentage": 0, "current_trains": 0, "max_capacity": 0}
        
        current_trains = await self.get_current_trains(db, section_id)
        current_count = len(current_trains)
        
        utilization_percentage = (current_count / section.max_capacity * 100) if section.max_capacity > 0 else 0
        
        return {
            "utilization_percentage": round(utilization_percentage, 2),
            "current_trains": current_count,
            "max_capacity": section.max_capacity,
            "available_capacity": section.max_capacity - current_count,
            "is_at_capacity": current_count >= section.max_capacity,
            "trains": [{"id": train.id, "train_number": train.train_number} for train in current_trains]
        }
    
    async def is_occupied(self, db: AsyncSession, section_id: int) -> bool:
        """Check if section is currently occupied"""
        
        current_trains = await self.get_current_trains(db, section_id)
        return len(current_trains) > 0
    
    async def can_reserve(self, db: AsyncSession, section_id: int, train_id: int) -> bool:
        """Check if section can be reserved for a train"""
        
        section = await self.get_by_id(db, section_id)
        if not section:
            return False
        
        # Check if section is available
        if section.status not in [SectionStatus.AVAILABLE, SectionStatus.OCCUPIED]:
            return False
        
        # Check capacity
        current_trains = await self.get_current_trains(db, section_id)
        if len(current_trains) >= section.max_capacity:
            # Check if the train is already in the section
            if not any(train.id == train_id for train in current_trains):
                return False
        
        return True
    
    async def reserve_section(
        self,
        db: AsyncSession,
        section_id: int,
        train_id: int,
        duration_minutes: int,
        reserved_by: int
    ) -> Dict[str, Any]:
        """Reserve a section for a specific train"""
        
        if not await self.can_reserve(db, section_id, train_id):
            raise ValidationError("Section cannot be reserved")
        
        # In a real implementation, you'd have a reservations table
        # For now, we'll return a mock reservation object
        reservation = {
            "id": f"res_{section_id}_{train_id}_{int(datetime.utcnow().timestamp())}",
            "section_id": section_id,
            "train_id": train_id,
            "reserved_by": reserved_by,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=duration_minutes)
        }
        
        logger.info(f"Section {section_id} reserved for train {train_id}")
        
        return reservation
    
    async def release_reservation(
        self,
        db: AsyncSession,
        section_id: int,
        train_id: Optional[int] = None,
        released_by: Optional[int] = None
    ) -> bool:
        """Release section reservation"""
        
        # In a real implementation, you'd update the reservations table
        # For now, we'll just log the action
        
        if train_id:
            logger.info(f"Section {section_id} reservation released for train {train_id}")
        else:
            logger.info(f"All reservations for section {section_id} released")
        
        return True
    
    async def get_section_train_history(
        self,
        db: AsyncSession,
        section_id: int,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Get train history for a section"""
        
        # This would typically query a separate position_history table
        # For now, return current trains as mock data
        current_trains = await self.get_current_trains(db, section_id)
        
        history = []
        for train in current_trains:
            history.append({
                "train_id": train.id,
                "train_number": train.train_number,
                "entered_at": train.last_position_update.isoformat() if train.last_position_update else None,
                "status": train.status,
                "delay_minutes": train.delay_minutes
            })
        
        return history
    
    async def get_detailed_status(self, db: AsyncSession, section_id: int) -> Dict[str, Any]:
        """Get detailed status information for a section"""
        
        section = await self.get_by_id(db, section_id)
        if not section:
            raise NotFoundError("Section not found")
        
        current_trains = await self.get_current_trains(db, section_id)
        utilization = await self.get_current_utilization(db, section_id)
        
        return {
            "section_id": section.id,
            "section_code": section.section_code,
            "status": section.status,
            "current_trains": len(current_trains),
            "max_capacity": section.max_capacity,
            "utilization_percentage": utilization["utilization_percentage"],
            "is_at_capacity": utilization["is_at_capacity"],
            "last_updated": section.status_updated_at.isoformat() if section.status_updated_at else None,
            "trains": [
                {
                    "id": train.id,
                    "train_number": train.train_number,
                    "status": train.status,
                    "delay_minutes": train.delay_minutes
                }
                for train in current_trains
            ]
        }
    
    async def get_sections_overview(self, db: AsyncSession) -> Dict[str, Any]:
        """Get overview statistics for all sections"""
        
        cache_key_str = cache_key("sections", "overview")
        cached_result = await get_cached(cache_key_str)
        
        if cached_result:
            return cached_result
        
        # Total sections
        total_query = select(func.count(Section.id)).where(
            and_(Section.is_deleted == False, Section.is_active == True)
        )
        total_result = await db.execute(total_query)
        total_sections = total_result.scalar()
        
        # Sections by status
        status_query = select(
            Section.status,
            func.count(Section.id).label('count')
        ).where(
            and_(Section.is_deleted == False, Section.is_active == True)
        ).group_by(Section.status)
        
        status_result = await db.execute(status_query)
        status_counts = {row.status: row.count for row in status_result}
        
        # Utilization statistics
        # This would require a more complex query in a real implementation
        average_utilization = 45.2  # Mock data
        
        # Bottleneck sections (mock data)
        bottleneck_sections = []
        
        overview = {
            "total_sections": total_sections,
            "available_sections": status_counts.get(SectionStatus.AVAILABLE, 0),
            "occupied_sections": status_counts.get(SectionStatus.OCCUPIED, 0),
            "maintenance_sections": status_counts.get(SectionStatus.MAINTENANCE, 0),
            "blocked_sections": status_counts.get(SectionStatus.BLOCKED, 0),
            "average_utilization": average_utilization,
            "bottleneck_sections": bottleneck_sections,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        await set_cache(cache_key_str, overview, ttl=60)  # 1 minute cache
        
        return overview
    
    def _validate_coordinates(
        self,
        start_coords: Dict[str, float],
        end_coords: Dict[str, float]
    ) -> bool:
        """Validate coordinate format and values"""
        
        required_keys = ["latitude", "longitude"]
        
        # Check if all required keys are present
        if not all(key in start_coords for key in required_keys):
            return False
        if not all(key in end_coords for key in required_keys):
            return False
        
        # Check coordinate ranges
        for coords in [start_coords, end_coords]:
            lat = coords["latitude"]
            lon = coords["longitude"]
            
            if not (-90 <= lat <= 90):
                return False
            if not (-180 <= lon <= 180):
                return False
        
        return True
    
    def _calculate_distance(
        self,
        start_coords: Dict[str, float],
        end_coords: Dict[str, float]
    ) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        
        import math
        
        # Extract coordinates
        lat1 = math.radians(start_coords["latitude"])
        lon1 = math.radians(start_coords["longitude"])
        lat2 = math.radians(end_coords["latitude"])
        lon2 = math.radians(end_coords["longitude"])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth's radius in kilometers
        earth_radius = 6371.0
        
        distance = earth_radius * c
        return round(distance, 2)
    
    async def remove(self, db: AsyncSession, id: int) -> Section:
        """Soft delete a section"""
        section = await self.get_by_id(db, id)
        if not section:
            raise NotFoundError("Section not found")
        
        # Check if section is currently occupied
        if await self.is_occupied(db, id):
            raise ValidationError("Cannot delete section that is currently occupied")
        
        section.soft_delete()
        await db.commit()
        
        # Clear related caches
        await delete_cache_pattern(f"section:*{section.section_code}*")
        await delete_cache_pattern("sections:*")
        
        logger.info(f"Section {section.section_code} soft deleted")
        
        return section


# Create service instance
section_service = SectionService()

# Export service
__all__ = ["section_service", "SectionService"]