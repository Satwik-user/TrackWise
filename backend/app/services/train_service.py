"""
Train management service for TrackWise Railway Optimization System
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func, text
from sqlalchemy.orm import selectinload
import logging

from app.models.train import Train, TrainStatus, TrainType
from app.models.section import Section
from app.models.schedule import Schedule
from app.schemas.train import TrainCreate, TrainUpdate
from app.services.base import BaseService
from app.utils.exceptions import ValidationError, NotFoundError
from app.utils.cache import cache_key, get_cached, set_cache, delete_cache_pattern
from app.config import settings

logger = logging.getLogger(__name__)


class TrainService(BaseService[Train, TrainCreate, TrainUpdate]):
    """Service for train management operations"""
    
    def __init__(self):
        super().__init__(Train)
    
    async def get_by_train_number(self, db: AsyncSession, train_number: str) -> Optional[Train]:
        """Get train by train number"""
        cache_key_str = cache_key("train", "number", train_number)
        cached_result = await get_cached(cache_key_str)
        
        if cached_result:
            return Train(**cached_result)
        
        query = select(Train).where(
            and_(Train.train_number == train_number, Train.is_deleted == False)
        ).options(
            selectinload(Train.current_section_obj),
            selectinload(Train.schedules),
            selectinload(Train.creator)
        )
        
        result = await db.execute(query)
        train = result.scalar_one_or_none()
        
        if train:
            await set_cache(cache_key_str, train.to_dict(), ttl=300)  # 5 minutes
        
        return train
    
    async def get_multi_with_filters(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "asc"
    ) -> Tuple[List[Train], int]:
        """Get trains with advanced filtering, searching, and sorting"""
        
        # Build base query
        query = select(Train).where(Train.is_deleted == False)
        count_query = select(func.count(Train.id)).where(Train.is_deleted == False)
        
        # Apply filters
        if filters:
            filter_conditions = []
            
            if "status" in filters:
                filter_conditions.append(Train.status == filters["status"])
            
            if "train_type" in filters:
                filter_conditions.append(Train.train_type == filters["train_type"])
            
            if "current_section" in filters:
                filter_conditions.append(Train.current_section == filters["current_section"])
            
            if "is_active" in filters:
                filter_conditions.append(Train.is_active == filters["is_active"])
            
            if "delayed" in filters and filters["delayed"]:
                filter_conditions.append(Train.delay_minutes > 0)
            
            if "on_time" in filters and filters["on_time"]:
                filter_conditions.append(Train.delay_minutes <= 5)  # Consider ≤5 min as on time
            
            if "min_delay" in filters:
                filter_conditions.append(Train.delay_minutes >= filters["min_delay"])
            
            if "max_delay" in filters:
                filter_conditions.append(Train.delay_minutes <= filters["max_delay"])
            
            if "operator" in filters:
                filter_conditions.append(Train.operator == filters["operator"])
            
            if filter_conditions:
                query = query.where(and_(*filter_conditions))
                count_query = count_query.where(and_(*filter_conditions))
        
        # Apply search
        if search:
            search_conditions = [
                Train.train_number.ilike(f"%{search}%"),
                Train.name.ilike(f"%{search}%"),
                Train.operator.ilike(f"%{search}%")
            ]
            query = query.where(or_(*search_conditions))
            count_query = count_query.where(or_(*search_conditions))
        
        # Get total count
        count_result = await db.execute(count_query)
        total = count_result.scalar()
        
        # Apply sorting
        if sort_by:
            sort_column = getattr(Train, sort_by, None)
            if sort_column:
                if sort_order.lower() == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())
            else:
                # Default sort by train_number
                query = query.order_by(Train.train_number.asc())
        else:
            query = query.order_by(Train.train_number.asc())
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Add relationships
        query = query.options(
            selectinload(Train.current_section_obj),
            selectinload(Train.creator)
        )
        
        # Execute query
        result = await db.execute(query)
        trains = result.scalars().all()
        
        return list(trains), total
    
    async def create(
        self,
        db: AsyncSession,
        obj_in: TrainCreate,
        created_by: Optional[int] = None
    ) -> Train:
        """Create a new train"""
        
        # Validate train number uniqueness
        existing_train = await self.get_by_train_number(db, obj_in.train_number)
        if existing_train:
            raise ValidationError(f"Train number {obj_in.train_number} already exists")
        
        # Validate section exists if provided
        if obj_in.current_section:
            section_query = select(Section).where(Section.id == obj_in.current_section)
            section_result = await db.execute(section_query)
            section = section_result.scalar_one_or_none()
            if not section:
                raise ValidationError(f"Section {obj_in.current_section} does not exist")
        
        # Create train object
        train_data = obj_in.dict()
        if created_by:
            train_data["created_by"] = created_by
        
        train = Train(**train_data)
        
        # Set initial status if not provided
        if not train.status:
            train.status = TrainStatus.STOPPED
        
        # Set initial position timestamp
        train.last_position_update = datetime.utcnow()
        
        db.add(train)
        await db.commit()
        await db.refresh(train)
        
        # Clear related caches
        await delete_cache_pattern("train:*")
        await delete_cache_pattern("trains:*")
        
        logger.info(f"Train {train.train_number} created")
        
        return train
    
    async def update(
        self,
        db: AsyncSession,
        db_obj: Train,
        obj_in: TrainUpdate,
        updated_by: Optional[int] = None
    ) -> Train:
        """Update an existing train"""
        
        # Validate train number uniqueness if changing
        if obj_in.train_number and obj_in.train_number != db_obj.train_number:
            existing_train = await self.get_by_train_number(db, obj_in.train_number)
            if existing_train:
                raise ValidationError(f"Train number {obj_in.train_number} already exists")
        
        # Validate section exists if changing
        if obj_in.current_section and obj_in.current_section != db_obj.current_section:
            section_query = select(Section).where(Section.id == obj_in.current_section)
            section_result = await db.execute(section_query)
            section = section_result.scalar_one_or_none()
            if not section:
                raise ValidationError(f"Section {obj_in.current_section} does not exist")
        
        # Store old values for audit
        old_values = {
            "status": db_obj.status,
            "current_section": db_obj.current_section,
            "delay_minutes": db_obj.delay_minutes
        }
        
        # Update train
        update_data = obj_in.dict(exclude_unset=True)
        if updated_by:
            update_data["updated_by"] = updated_by
        
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        # Update position timestamp if section changed
        if "current_section" in update_data:
            db_obj.last_position_update = datetime.utcnow()
        
        await db.commit()
        await db.refresh(db_obj)
        
        # Clear related caches
        await delete_cache_pattern(f"train:*{db_obj.train_number}*")
        await delete_cache_pattern("trains:*")
        
        logger.info(f"Train {db_obj.train_number} updated")
        
        return db_obj
    
    async def update_position(
        self,
        db: AsyncSession,
        train_id: int,
        section_id: int,
        speed: Optional[float] = None,
        coordinates: Optional[Dict[str, float]] = None
    ) -> Train:
        """Update train position and related data"""
        
        train = await self.get_by_id(db, train_id)
        if not train:
            raise NotFoundError("Train not found")
        
        # Validate section exists
        section_query = select(Section).where(Section.id == section_id)
        section_result = await db.execute(section_query)
        section = section_result.scalar_one_or_none()
        if not section:
            raise ValidationError(f"Section {section_id} does not exist")
        
        # Update train position
        old_section = train.current_section
        train.current_section = section_id
        train.last_position_update = datetime.utcnow()
        
        if speed is not None:
            train.current_speed = speed
        
        if coordinates:
            train.latitude = coordinates.get("latitude")
            train.longitude = coordinates.get("longitude")
        
        await db.commit()
        await db.refresh(train)
        
        # Clear related caches
        await delete_cache_pattern(f"train:*{train.train_number}*")
        
        logger.info(f"Train {train.train_number} moved from section {old_section} to {section_id}")
        
        return train
    
    async def update_status(
        self,
        db: AsyncSession,
        train_id: int,
        new_status: TrainStatus,
        reason: Optional[str] = None,
        updated_by: Optional[int] = None
    ) -> Train:
        """Update train status with validation"""
        
        train = await self.get_by_id(db, train_id)
        if not train:
            raise NotFoundError("Train not found")
        
        # Validate status transition
        if not self._is_valid_status_transition(train.status, new_status):
            raise ValidationError(f"Invalid status transition from {train.status} to {new_status}")
        
        old_status = train.status
        train.status = new_status
        train.status_updated_at = datetime.utcnow()
        
        if updated_by:
            train.updated_by = updated_by
        
        # Add status change to notes if reason provided
        if reason:
            status_note = f"Status changed from {old_status} to {new_status}: {reason}"
            if train.notes:
                train.notes += f"\n{status_note}"
            else:
                train.notes = status_note
        
        await db.commit()
        await db.refresh(train)
        
        # Clear related caches
        await delete_cache_pattern(f"train:*{train.train_number}*")
        
        logger.info(f"Train {train.train_number} status changed from {old_status} to {new_status}")
        
        return train
    
    async def update_delay(
        self,
        db: AsyncSession,
        train_id: int,
        delay_minutes: int,
        reason: Optional[str] = None
    ) -> Train:
        """Update train delay"""
        
        train = await self.get_by_id(db, train_id)
        if not train:
            raise NotFoundError("Train not found")
        
        old_delay = train.delay_minutes
        train.delay_minutes = max(0, delay_minutes)  # Ensure non-negative
        train.delay_updated_at = datetime.utcnow()
        
        # Add delay change to notes if significant change
        if abs(old_delay - delay_minutes) >= 5:  # 5+ minute change
            delay_note = f"Delay updated from {old_delay} to {delay_minutes} minutes"
            if reason:
                delay_note += f": {reason}"
            
            if train.notes:
                train.notes += f"\n{delay_note}"
            else:
                train.notes = delay_note
        
        await db.commit()
        await db.refresh(train)
        
        # Clear related caches
        await delete_cache_pattern(f"train:*{train.train_number}*")
        
        logger.info(f"Train {train.train_number} delay updated from {old_delay} to {delay_minutes} minutes")
        
        return train
    
    async def get_trains_by_section(
        self,
        db: AsyncSession,
        section_id: int,
        include_history: bool = False
    ) -> List[Train]:
        """Get trains in a specific section"""
        
        if include_history:
            # Get trains that have been in this section recently
            query = select(Train).where(
                and_(
                    Train.is_deleted == False,
                    or_(
                        Train.current_section == section_id,
                        Train.last_position_update >= datetime.utcnow() - timedelta(hours=24)
                    )
                )
            )
        else:
            # Get trains currently in this section
            query = select(Train).where(
                and_(
                    Train.current_section == section_id,
                    Train.is_deleted == False
                )
            )
        
        query = query.options(selectinload(Train.creator))
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def get_delayed_trains(
        self,
        db: AsyncSession,
        min_delay: int = 5,
        limit: int = 100
    ) -> List[Train]:
        """Get trains with delays above threshold"""
        
        query = select(Train).where(
            and_(
                Train.delay_minutes >= min_delay,
                Train.is_deleted == False,
                Train.is_active == True
            )
        ).order_by(Train.delay_minutes.desc()).limit(limit)
        
        query = query.options(
            selectinload(Train.current_section_obj),
            selectinload(Train.creator)
        )
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    async def get_trains_summary(self, db: AsyncSession) -> Dict[str, Any]:
        """Get summary statistics for all trains"""
        
        cache_key_str = cache_key("trains", "summary")
        cached_result = await get_cached(cache_key_str)
        
        if cached_result:
            return cached_result
        
        # Total trains
        total_query = select(func.count(Train.id)).where(
            and_(Train.is_deleted == False, Train.is_active == True)
        )
        total_result = await db.execute(total_query)
        total_trains = total_result.scalar()
        
        # Trains by status
        status_query = select(
            Train.status,
            func.count(Train.id).label('count')
        ).where(
            and_(Train.is_deleted == False, Train.is_active == True)
        ).group_by(Train.status)
        
        status_result = await db.execute(status_query)
        status_counts = {row.status: row.count for row in status_result}
        
        # Delay statistics
        delay_query = select(
            func.avg(Train.delay_minutes).label('avg_delay'),
            func.max(Train.delay_minutes).label('max_delay'),
            func.count(Train.id).filter(Train.delay_minutes > 0).label('delayed_count'),
            func.count(Train.id).filter(Train.delay_minutes <= 5).label('on_time_count')
        ).where(
            and_(Train.is_deleted == False, Train.is_active == True)
        )
        
        delay_result = await db.execute(delay_query)
        delay_stats = delay_result.first()
        
        summary = {
            "total_trains": total_trains,
            "running_trains": status_counts.get(TrainStatus.RUNNING, 0),
            "stopped_trains": status_counts.get(TrainStatus.STOPPED, 0),
            "delayed_trains": status_counts.get(TrainStatus.DELAYED, 0),
            "maintenance_trains": status_counts.get(TrainStatus.MAINTENANCE, 0),
            "average_delay_minutes": float(delay_stats.avg_delay or 0),
            "max_delay_minutes": delay_stats.max_delay or 0,
            "delayed_count": delay_stats.delayed_count or 0,
            "on_time_count": delay_stats.on_time_count or 0,
            "on_time_percentage": (delay_stats.on_time_count / total_trains * 100) if total_trains > 0 else 0,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        await set_cache(cache_key_str, summary, ttl=60)  # 1 minute cache
        
        return summary
    
    async def get_train_route_history(
        self,
        db: AsyncSession,
        train_id: int,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """Get train's route history for specified time period"""
        
        # This would typically query a separate position_history table
        # For now, return mock data structure
        since = datetime.utcnow() - timedelta(hours=hours)
        
        # In a real implementation, you'd query position history
        history = [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "section_id": 1,
                "section_name": "Section A",
                "speed": 75.0,
                "delay_minutes": 0
            }
        ]
        
        return history
    
    async def calculate_eta(
        self,
        db: AsyncSession,
        train_id: int,
        destination_section_id: int
    ) -> Optional[datetime]:
        """Calculate estimated time of arrival at destination"""
        
        train = await self.get_by_id(db, train_id)
        if not train or not train.current_section:
            return None
        
        # This would involve route calculation and speed analysis
        # For now, return a simple estimate
        
        # Get distance and calculate based on average speed
        estimated_minutes = 30  # Placeholder calculation
        eta = datetime.utcnow() + timedelta(minutes=estimated_minutes)
        
        return eta
    
    def _is_valid_status_transition(self, current_status: TrainStatus, new_status: TrainStatus) -> bool:
        """Validate if status transition is allowed"""
        
        # Define valid transitions
        valid_transitions = {
            TrainStatus.STOPPED: [TrainStatus.RUNNING, TrainStatus.MAINTENANCE],
            TrainStatus.RUNNING: [TrainStatus.STOPPED, TrainStatus.DELAYED, TrainStatus.MAINTENANCE],
            TrainStatus.DELAYED: [TrainStatus.RUNNING, TrainStatus.STOPPED, TrainStatus.MAINTENANCE],
            TrainStatus.MAINTENANCE: [TrainStatus.STOPPED],
            TrainStatus.OUT_OF_SERVICE: [TrainStatus.MAINTENANCE]
        }
        
        return new_status in valid_transitions.get(current_status, [])
    
    async def remove(self, db: AsyncSession, id: int) -> Train:
        """Soft delete a train"""
        train = await self.get_by_id(db, id)
        if not train:
            raise NotFoundError("Train not found")
        
        # Check if train is currently running
        if train.status == TrainStatus.RUNNING:
            raise ValidationError("Cannot delete a running train")
        
        train.soft_delete()
        await db.commit()
        
        # Clear related caches
        await delete_cache_pattern(f"train:*{train.train_number}*")
        await delete_cache_pattern("trains:*")
        
        logger.info(f"Train {train.train_number} soft deleted")
        
        return train


# Create service instance
train_service = TrainService()

# Export service
__all__ = ["train_service", "TrainService"]