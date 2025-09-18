"""Seed initial data - Create default roles, permissions, and admin user

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-15 10:30:00.000000

"""
from typing import Sequence, Union
from datetime import datetime

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer, DateTime, Boolean, Text

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema - Add initial data"""
    
    # Define table structures for data insertion
    roles_table = table('roles',
        column('id', Integer),
        column('name', String),
        column('description', Text),
        column('is_active', Boolean),
        column('created_at', DateTime),
        column('updated_at', DateTime)
    )
    
    permissions_table = table('permissions',
        column('id', Integer),
        column('name', String),
        column('description', Text),
        column('resource', String),
        column('action', String),
        column('created_at', DateTime)
    )
    
    users_table = table('users',
        column('id', Integer),
        column('username', String),
        column('email', String),
        column('full_name', String),
        column('hashed_password', String),
        column('is_active', Boolean),
        column('is_superuser', Boolean),
        column('is_verified', Boolean),
        column('created_at', DateTime),
        column('updated_at', DateTime),
        column('is_deleted', Boolean)
    )
    
    user_roles_table = table('user_roles',
        column('id', Integer),
        column('user_id', Integer),
        column('role_id', Integer),
        column('assigned_at', DateTime)
    )
    
    # Current timestamp
    now = datetime.utcnow()
    
    # Insert default roles
    op.bulk_insert(roles_table, [
        {
            'id': 1,
            'name': 'admin',
            'description': 'System administrator with full access',
            'is_active': True,
            'created_at': now,
            'updated_at': now
        },
        {
            'id': 2,
            'name': 'operator',
            'description': 'Railway operator with operational access',
            'is_active': True,
            'created_at': now,
            'updated_at': now
        },
        {
            'id': 3,
            'name': 'dispatcher',
            'description': 'Train dispatcher with scheduling access',
            'is_active': True,
            'created_at': now,
            'updated_at': now
        },
        {
            'id': 4,
            'name': 'maintenance',
            'description': 'Maintenance staff with equipment access',
            'is_active': True,
            'created_at': now,
            'updated_at': now
        },
        {
            'id': 5,
            'name': 'viewer',
            'description': 'Read-only access to system data',
            'is_active': True,
            'created_at': now,
            'updated_at': now
        }
    ])
    
    # Insert default permissions
    permissions_data = [
        # User management
        (1, 'users:create', 'Create new users', 'users', 'create'),
        (2, 'users:read', 'View user information', 'users', 'read'),
        (3, 'users:update', 'Update user information', 'users', 'update'),
        (4, 'users:delete', 'Delete users', 'users', 'delete'),
        (5, 'users:manage_roles', 'Manage user roles', 'users', 'manage_roles'),
        
        # Train management
        (6, 'trains:create', 'Create new trains', 'trains', 'create'),
        (7, 'trains:read', 'View train information', 'trains', 'read'),
        (8, 'trains:update', 'Update train information', 'trains', 'update'),
        (9, 'trains:delete', 'Delete trains', 'trains', 'delete'),
        (10, 'trains:control', 'Control train operations', 'trains', 'control'),
        
        # Section management
        (11, 'sections:create', 'Create new sections', 'sections', 'create'),
        (12, 'sections:read', 'View section information', 'sections', 'read'),
        (13, 'sections:update', 'Update section information', 'sections', 'update'),
        (14, 'sections:delete', 'Delete sections', 'sections', 'delete'),
        (15, 'sections:reserve', 'Reserve sections', 'sections', 'reserve'),
        
        # Schedule management
        (16, 'schedules:create', 'Create new schedules', 'schedules', 'create'),
        (17, 'schedules:read', 'View schedule information', 'schedules', 'read'),
        (18, 'schedules:update', 'Update schedule information', 'schedules', 'update'),
        (19, 'schedules:delete', 'Delete schedules', 'schedules', 'delete'),
        
        # Optimization
        (20, 'optimization:create', 'Create optimization runs', 'optimization', 'create'),
        (21, 'optimization:read', 'View optimization results', 'optimization', 'read'),
        (22, 'optimization:execute', 'Execute optimization runs', 'optimization', 'execute'),
        (23, 'optimization:cancel', 'Cancel optimization runs', 'optimization', 'cancel'),
        
        # Analytics
        (24, 'analytics:read', 'View analytics and reports', 'analytics', 'read'),
        (25, 'analytics:export', 'Export analytics data', 'analytics', 'export'),
        
        # System
        (26, 'system:admin', 'System administration', 'system', 'admin'),
        (27, 'system:maintenance', 'System maintenance', 'system', 'maintenance'),
        (28, 'system:logs', 'View system logs', 'system', 'logs'),
        
        # Notifications
        (29, 'notifications:read', 'View notifications', 'notifications', 'read'),
        (30, 'notifications:send', 'Send notifications', 'notifications', 'send'),
    ]
    
    op.bulk_insert(permissions_table, [
        {
            'id': perm_id,
            'name': name,
            'description': description,
            'resource': resource,
            'action': action,
            'created_at': now
        }
        for perm_id, name, description, resource, action in permissions_data
    ])
    
    # Create default admin user
    # Password: 'admin123' (hashed with bcrypt)
    # In production, this should be changed immediately
    admin_password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UaOpjN5.3nM.'
    
    op.bulk_insert(users_table, [
        {
            'id': 1,
            'username': 'admin',
            'email': 'admin@trackwise.com',
            'full_name': 'System Administrator',
            'hashed_password': admin_password_hash,
            'is_active': True,
            'is_superuser': True,
            'is_verified': True,
            'created_at': now,
            'updated_at': now,
            'is_deleted': False
        }
    ])
    
    # Assign admin role to admin user
    op.bulk_insert(user_roles_table, [
        {
            'id': 1,
            'user_id': 1,
            'role_id': 1,  # admin role
            'assigned_at': now
        }
    ])
    
    # Insert sample sections for testing
    sections_table = table('sections',
        column('id', Integer),
        column('section_code', String),
        column('name', String),
        column('description', Text),
        column('section_type', String),
        column('status', String),
        column('railway_line', String),
        column('length_km', sa.Float),
        column('max_speed_kmh', sa.Float),
        column('max_capacity', Integer),
        column('is_active', Boolean),
        column('created_at', DateTime),
        column('updated_at', DateTime),
        column('created_by', Integer),
        column('is_deleted', Boolean)
    )
    
    op.bulk_insert(sections_table, [
        {
            'id': 1,
            'section_code': 'MAIN-001',
            'name': 'Main Line Section 1',
            'description': 'Primary mainline section connecting downtown terminal',
            'section_type': 'MAIN_LINE',
            'status': 'AVAILABLE',
            'railway_line': 'Central Line',
            'length_km': 15.5,
            'max_speed_kmh': 120.0,
            'max_capacity': 2,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'created_by': 1,
            'is_deleted': False
        },
        {
            'id': 2,
            'section_code': 'MAIN-002',
            'name': 'Main Line Section 2',
            'description': 'Continuation of primary mainline through industrial district',
            'section_type': 'MAIN_LINE',
            'status': 'AVAILABLE',
            'railway_line': 'Central Line',
            'length_km': 12.3,
            'max_speed_kmh': 100.0,
            'max_capacity': 2,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'created_by': 1,
            'is_deleted': False
        },
        {
            'id': 3,
            'section_code': 'BRANCH-001',
            'name': 'North Branch Line',
            'description': 'Branch line serving northern residential areas',
            'section_type': 'BRANCH_LINE',
            'status': 'AVAILABLE',
            'railway_line': 'North Branch',
            'length_km': 8.7,
            'max_speed_kmh': 80.0,
            'max_capacity': 1,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'created_by': 1,
            'is_deleted': False
        },
        {
            'id': 4,
            'section_code': 'STATION-001',
            'name': 'Central Station Platform A',
            'description': 'Main platform at central station',
            'section_type': 'STATION',
            'status': 'AVAILABLE',
            'railway_line': 'Central Line',
            'length_km': 0.5,
            'max_speed_kmh': 30.0,
            'max_capacity': 3,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'created_by': 1,
            'is_deleted': False
        },
        {
            'id': 5,
            'section_code': 'YARD-001',
            'name': 'Maintenance Yard',
            'description': 'Main maintenance and storage yard',
            'section_type': 'YARD',
            'status': 'AVAILABLE',
            'railway_line': 'Maintenance',
            'length_km': 2.0,
            'max_speed_kmh': 20.0,
            'max_capacity': 5,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'created_by': 1,
            'is_deleted': False
        }
    ])
    
    # Insert sample trains for testing
    trains_table = table('trains',
        column('id', Integer),
        column('train_number', String),
        column('name', String),
        column('train_type', String),
        column('status', String),
        column('operator', String),
        column('max_speed_kmh', sa.Float),
        column('current_speed', sa.Float),
        column('capacity_passengers', Integer),
        column('current_section', Integer),
        column('delay_minutes', sa.Float),
        column('distance_traveled_km', sa.Float),
        column('is_active', Boolean),
        column('created_at', DateTime),
        column('updated_at', DateTime),
        column('created_by', Integer),
        column('is_deleted', Boolean)
    )
    
    op.bulk_insert(trains_table, [
        {
            'id': 1,
            'train_number': 'TW001',
            'name': 'Central Express',
            'train_type': 'PASSENGER',
            'status': 'STOPPED',
            'operator': 'TrackWise Railways',
            'max_speed_kmh': 120.0,
            'current_speed': 0.0,
            'capacity_passengers': 300,
            'current_section': 4,  # Central Station
            'delay_minutes': 0.0,
            'distance_traveled_km': 0.0,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'created_by': 1,
            'is_deleted': False
        },
        {
            'id': 2,
            'train_number': 'TW002',
            'name': 'North Commuter',
            'train_type': 'PASSENGER',
            'status': 'STOPPED',
            'operator': 'TrackWise Railways',
            'max_speed_kmh': 100.0,
            'current_speed': 0.0,
            'capacity_passengers': 200,
            'current_section': 5,  # Maintenance Yard
            'delay_minutes': 0.0,
            'distance_traveled_km': 0.0,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'created_by': 1,
            'is_deleted': False
        },
        {
            'id': 3,
            'train_number': 'TW003',
            'name': 'Freight Hauler',
            'train_type': 'FREIGHT',
            'status': 'STOPPED',
            'operator': 'TrackWise Freight',
            'max_speed_kmh': 80.0,
            'current_speed': 0.0,
            'capacity_passengers': 0,
            'current_section': 5,  # Maintenance Yard
            'delay_minutes': 0.0,
            'distance_traveled_km': 0.0,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
            'created_by': 1,
            'is_deleted': False
        }
    ])


def downgrade() -> None:
    """Downgrade database schema - Remove initial data"""
    
    # Remove sample data in reverse order due to foreign key constraints
    op.execute("DELETE FROM user_roles WHERE id IN (1)")
    op.execute("DELETE FROM trains WHERE id IN (1, 2, 3)")
    op.execute("DELETE FROM sections WHERE id IN (1, 2, 3, 4, 5)")
    op.execute("DELETE FROM users WHERE id IN (1)")
    op.execute("DELETE FROM permissions WHERE id BETWEEN 1 AND 30")
    op.execute("DELETE FROM roles WHERE id IN (1, 2, 3, 4, 5)")