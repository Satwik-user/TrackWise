"""
Base service class for TrackWise Railway Optimization System
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type, TypeVar, Generic
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func
from sqlalchemy.orm import selectinload
import logging

from app.models.base import BaseModel
from app.utils.exceptions import ValidationError, NotFoundError

logger = logging.getLogger(__name__)

ModelType = TypeVar("ModelType", bound=BaseModel)
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseService(Generic[ModelType], ABC):
    """Base service class with common CRUD operations"""
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    async def get_by_id(self, session: AsyncSession, model_id: Any) -> Optional[ModelType]:
        """Get a single record by ID"""
        try:
            result = await session.execute(
                select(self.model).where(self.model.id == model_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            self.logger.error(f"Error getting {self.model.__name__} by ID {model_id}: {e}")
            raise
    
    async def get_all(
        self, 
        session: AsyncSession, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """Get all records with optional filtering"""
        try:
            query = select(self.model)
            
            # Apply filters if provided
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field) and value is not None:
                        query = query.where(getattr(self.model, field) == value)
            
            query = query.offset(skip).limit(limit)
            
            result = await session.execute(query)
            return result.scalars().all()
        except Exception as e:
            self.logger.error(f"Error getting all {self.model.__name__}: {e}")
            raise
    
    async def create(self, session: AsyncSession, data: Dict[str, Any]) -> ModelType:
        """Create a new record"""
        try:
            # Remove None values
            clean_data = {k: v for k, v in data.items() if v is not None}
            
            instance = self.model(**clean_data)
            session.add(instance)
            await session.commit()
            await session.refresh(instance)
            return instance
        except Exception as e:
            await session.rollback()
            self.logger.error(f"Error creating {self.model.__name__}: {e}")
            raise ValidationError(f"Failed to create {self.model.__name__}: {str(e)}")
    
    async def update(
        self, 
        session: AsyncSession, 
        model_id: Any, 
        data: Dict[str, Any]
    ) -> Optional[ModelType]:
        """Update an existing record"""
        try:
            # Get existing record
            instance = await self.get_by_id(session, model_id)
            if not instance:
                raise NotFoundError(f"{self.model.__name__} with ID {model_id} not found")
            
            # Update fields
            for field, value in data.items():
                if hasattr(instance, field) and value is not None:
                    setattr(instance, field, value)
            
            # Set updated timestamp if exists
            if hasattr(instance, 'updated_at'):
                instance.updated_at = datetime.utcnow()
            
            await session.commit()
            await session.refresh(instance)
            return instance
        except Exception as e:
            await session.rollback()
            self.logger.error(f"Error updating {self.model.__name__} {model_id}: {e}")
            raise
    
    async def delete(self, session: AsyncSession, model_id: Any) -> bool:
        """Delete a record by ID"""
        try:
            instance = await self.get_by_id(session, model_id)
            if not instance:
                raise NotFoundError(f"{self.model.__name__} with ID {model_id} not found")
            
            await session.delete(instance)
            await session.commit()
            return True
        except Exception as e:
            await session.rollback()
            self.logger.error(f"Error deleting {self.model.__name__} {model_id}: {e}")
            raise
    
    async def count(
        self, 
        session: AsyncSession, 
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Count records with optional filtering"""
        try:
            query = select(func.count(self.model.id))
            
            # Apply filters if provided
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field) and value is not None:
                        query = query.where(getattr(self.model, field) == value)
            
            result = await session.execute(query)
            return result.scalar()
        except Exception as e:
            self.logger.error(f"Error counting {self.model.__name__}: {e}")
            raise
    
    async def exists(self, session: AsyncSession, model_id: Any) -> bool:
        """Check if a record exists by ID"""
        try:
            result = await session.execute(
                select(func.count(self.model.id)).where(self.model.id == model_id)
            )
            return result.scalar() > 0
        except Exception as e:
            self.logger.error(f"Error checking existence of {self.model.__name__} {model_id}: {e}")
            raise