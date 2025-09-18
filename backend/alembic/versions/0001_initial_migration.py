"""Initial migration - Create all tables

Revision ID: 0001
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade database schema"""
    
    # Create ENUM types
    train_status_enum = postgresql.ENUM(
        'STOPPED', 'RUNNING', 'DELAYED', 'MAINTENANCE', 'OUT_OF_SERVICE',
        name='trainstatus'
    )
    train_status_enum.create(op.get_bind())
    
    train_type_enum = postgresql.ENUM(
        'PASSENGER', 'FREIGHT', 'HIGH_SPEED', 'REGIONAL', 'SUBURBAN',
        name='traintype'
    )
    train_type_enum.create(op.get_bind())
    
    section_status_enum = postgresql.ENUM(
        'AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED', 'OUT_OF_SERVICE',
        name='sectionstatus'
    )
    section_status_enum.create(op.get_bind())
    
    section_type_enum = postgresql.ENUM(
        'MAIN_LINE', 'BRANCH_LINE', 'SIDING', 'STATION', 'YARD', 'JUNCTION',
        name='sectiontype'
    )
    section_type_enum.create(op.get_bind())
    
    schedule_status_enum = postgresql.ENUM(
        'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DELAYED',
        name='schedulestatus'
    )
    schedule_status_enum.create(op.get_bind())
    
    optimization_status_enum = postgresql.ENUM(
        'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED',
        name='optimizationstatus'
    )
    optimization_status_enum.create(op.get_bind())
    
    optimization_type_enum = postgresql.ENUM(
        'SCHEDULE_OPTIMIZATION', 'ROUTE_OPTIMIZATION', 'CAPACITY_OPTIMIZATION',
        'DELAY_MINIMIZATION', 'ENERGY_OPTIMIZATION', 'COST_OPTIMIZATION',
        name='optimizationtype'
    )
    optimization_type_enum.create(op.get_bind())
    
    notification_type_enum = postgresql.ENUM(
        'TRAIN_DELAY', 'OPTIMIZATION_COMPLETE', 'SYSTEM_ALERT',
        'MAINTENANCE_ALERT', 'USER_ACTION',
        name='notificationtype'
    )
    notification_type_enum.create(op.get_bind())
    
    notification_channel_enum = postgresql.ENUM(
        'EMAIL', 'SMS', 'IN_APP', 'PUSH', 'WEBSOCKET',
        name='notificationchannel'
    )
    notification_channel_enum.create(op.get_bind())
    
    notification_status_enum = postgresql.ENUM(
        'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ',
        name='notificationstatus'
    )
    notification_status_enum.create(op.get_bind())

    # Create roles table
    op.create_table('roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create permissions table
    op.create_table('permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('resource', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('resource', 'action', name='unique_resource_action')
    )

    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('profile_picture', sa.String(length=255), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('position', sa.String(length=100), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), nullable=False, default=0),
        sa.Column('account_locked_until', sa.DateTime(), nullable=True),
        sa.Column('password_changed_at', sa.DateTime(), nullable=True),
        sa.Column('email_verification_token', sa.String(length=255), nullable=True),
        sa.Column('password_reset_token', sa.String(length=255), nullable=True),
        sa.Column('password_reset_expires_at', sa.DateTime(), nullable=True),
        sa.Column('two_factor_secret', sa.String(length=32), nullable=True),
        sa.Column('two_factor_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('session_token', sa.String(length=255), nullable=True),
        sa.Column('preferences', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('email'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], )
    )

    # Create user_roles table
    op.create_table('user_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ),
        sa.UniqueConstraint('user_id', 'role_id')
    )

    # Create user_permissions table
    op.create_table('user_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ),
        sa.UniqueConstraint('user_id', 'permission_id')
    )

    # Create user_login_history table
    op.create_table('user_login_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('failure_reason', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL')
    )

    # Create sections table
    op.create_table('sections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('section_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('section_type', section_type_enum, nullable=False),
        sa.Column('status', section_status_enum, nullable=False, default='AVAILABLE'),
        sa.Column('railway_line', sa.String(length=100), nullable=True),
        sa.Column('start_station', sa.String(length=100), nullable=True),
        sa.Column('end_station', sa.String(length=100), nullable=True),
        sa.Column('length_km', sa.Float(), nullable=True),
        sa.Column('max_speed_kmh', sa.Float(), nullable=True),
        sa.Column('max_capacity', sa.Integer(), nullable=False, default=1),
        sa.Column('start_coordinates', sa.JSON(), nullable=True),
        sa.Column('end_coordinates', sa.JSON(), nullable=True),
        sa.Column('elevation_profile', sa.JSON(), nullable=True),
        sa.Column('signal_systems', sa.JSON(), nullable=True),
        sa.Column('safety_systems', sa.JSON(), nullable=True),
        sa.Column('maintenance_schedule', sa.JSON(), nullable=True),
        sa.Column('last_maintenance', sa.DateTime(), nullable=True),
        sa.Column('next_maintenance', sa.DateTime(), nullable=True),
        sa.Column('status_updated_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('section_code'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], )
    )

    # Create trains table
    op.create_table('trains',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('train_number', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.Column('train_type', train_type_enum, nullable=False),
        sa.Column('status', train_status_enum, nullable=False, default='STOPPED'),
        sa.Column('operator', sa.String(length=100), nullable=True),
        sa.Column('max_speed_kmh', sa.Float(), nullable=True),
        sa.Column('current_speed', sa.Float(), nullable=True, default=0.0),
        sa.Column('capacity_passengers', sa.Integer(), nullable=True),
        sa.Column('capacity_cargo_tons', sa.Float(), nullable=True),
        sa.Column('current_section', sa.Integer(), nullable=True),
        sa.Column('destination_section', sa.Integer(), nullable=True),
        sa.Column('delay_minutes', sa.Float(), nullable=False, default=0.0),
        sa.Column('distance_traveled_km', sa.Float(), nullable=False, default=0.0),
        sa.Column('fuel_consumption_rate', sa.Float(), nullable=True),
        sa.Column('energy_consumption_kwh', sa.Float(), nullable=True),
        sa.Column('last_position_update', sa.DateTime(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('altitude', sa.Float(), nullable=True),
        sa.Column('heading', sa.Float(), nullable=True),
        sa.Column('next_scheduled_stop', sa.DateTime(), nullable=True),
        sa.Column('estimated_arrival', sa.DateTime(), nullable=True),
        sa.Column('maintenance_due', sa.DateTime(), nullable=True),
        sa.Column('last_maintenance', sa.DateTime(), nullable=True),
        sa.Column('status_updated_at', sa.DateTime(), nullable=True),
        sa.Column('delay_updated_at', sa.DateTime(), nullable=True),
        sa.Column('technical_specifications', sa.JSON(), nullable=True),
        sa.Column('safety_systems', sa.JSON(), nullable=True),
        sa.Column('route_history', sa.JSON(), nullable=True),
        sa.Column('performance_metrics', sa.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('train_number'),
        sa.ForeignKeyConstraint(['current_section'], ['sections.id'], ),
        sa.ForeignKeyConstraint(['destination_section'], ['sections.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], )
    )

    # Create schedules table
    op.create_table('schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('train_id', sa.Integer(), nullable=False),
        sa.Column('route_name', sa.String(length=100), nullable=True),
        sa.Column('start_section_id', sa.Integer(), nullable=False),
        sa.Column('end_section_id', sa.Integer(), nullable=False),
        sa.Column('intermediate_sections', sa.JSON(), nullable=True),
        sa.Column('scheduled_departure', sa.DateTime(), nullable=False),
        sa.Column('scheduled_arrival', sa.DateTime(), nullable=False),
        sa.Column('actual_departure', sa.DateTime(), nullable=True),
        sa.Column('actual_arrival', sa.DateTime(), nullable=True),
        sa.Column('status', schedule_status_enum, nullable=False, default='SCHEDULED'),
        sa.Column('priority_level', sa.Integer(), nullable=False, default=1),
        sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('actual_duration_minutes', sa.Integer(), nullable=True),
        sa.Column('delay_minutes', sa.Float(), nullable=False, default=0.0),
        sa.Column('stops', sa.JSON(), nullable=True),
        sa.Column('cargo_manifest', sa.JSON(), nullable=True),
        sa.Column('passenger_count', sa.Integer(), nullable=True),
        sa.Column('special_requirements', sa.JSON(), nullable=True),
        sa.Column('weather_conditions', sa.JSON(), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['train_id'], ['trains.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['start_section_id'], ['sections.id'], ),
        sa.ForeignKeyConstraint(['end_section_id'], ['sections.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], )
    )

    # Create optimization_runs table
    op.create_table('optimization_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('optimization_type', optimization_type_enum, nullable=False),
        sa.Column('status', optimization_status_enum, nullable=False, default='PENDING'),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('constraints', sa.JSON(), nullable=True),
        sa.Column('objectives', sa.JSON(), nullable=True),
        sa.Column('input_data', sa.JSON(), nullable=True),
        sa.Column('results', sa.JSON(), nullable=True),
        sa.Column('objective_value', sa.Float(), nullable=True),
        sa.Column('optimality_gap', sa.Float(), nullable=True),
        sa.Column('solver_used', sa.String(length=50), nullable=True),
        sa.Column('algorithm_version', sa.String(length=50), nullable=True),
        sa.Column('cpu_time_seconds', sa.Float(), nullable=True),
        sa.Column('memory_usage_mb', sa.Float(), nullable=True),
        sa.Column('iterations', sa.Integer(), nullable=True),
        sa.Column('convergence_criteria', sa.JSON(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('progress_percentage', sa.Float(), nullable=False, default=0.0),
        sa.Column('estimated_completion', sa.DateTime(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, default=5),
        sa.Column('timeout_seconds', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    # Create optimization_decisions table
    op.create_table('optimization_decisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('optimization_run_id', sa.Integer(), nullable=False),
        sa.Column('decision_type', sa.String(length=50), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('decision_data', sa.JSON(), nullable=False),
        sa.Column('old_value', sa.JSON(), nullable=True),
        sa.Column('new_value', sa.JSON(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('impact_assessment', sa.JSON(), nullable=True),
        sa.Column('implementation_order', sa.Integer(), nullable=True),
        sa.Column('dependencies', sa.JSON(), nullable=True),
        sa.Column('constraints_satisfied', sa.JSON(), nullable=True),
        sa.Column('expected_benefit', sa.Float(), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=True),
        sa.Column('is_implemented', sa.Boolean(), nullable=False, default=False),
        sa.Column('implemented_at', sa.DateTime(), nullable=True),
        sa.Column('implementation_result', sa.JSON(), nullable=True),
        sa.Column('rollback_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['optimization_run_id'], ['optimization_runs.id'], ondelete='CASCADE')
    )

    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('notification_type', notification_type_enum, nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('channels', postgresql.ARRAY(notification_channel_enum), nullable=False),
        sa.Column('status', notification_status_enum, nullable=False, default='PENDING'),
        sa.Column('priority', sa.String(length=20), nullable=False, default='medium'),
        sa.Column('scheduled_for', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('delivery_results', sa.JSON(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, default=0),
        sa.Column('max_retries', sa.Integer(), nullable=False, default=3),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('action_url', sa.String(length=500), nullable=True),
        sa.Column('action_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', sa.String(length=100), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_id', sa.String(length=100), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, default=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL')
    )

    # Create indexes for better performance
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_username', 'users', ['username'])
    op.create_index('idx_users_is_active', 'users', ['is_active'])
    op.create_index('idx_users_created_at', 'users', ['created_at'])
    
    op.create_index('idx_trains_train_number', 'trains', ['train_number'])
    op.create_index('idx_trains_status', 'trains', ['status'])
    op.create_index('idx_trains_current_section', 'trains', ['current_section'])
    op.create_index('idx_trains_is_active', 'trains', ['is_active'])
    op.create_index('idx_trains_created_at', 'trains', ['created_at'])
    
    op.create_index('idx_sections_section_code', 'sections', ['section_code'])
    op.create_index('idx_sections_status', 'sections', ['status'])
    op.create_index('idx_sections_railway_line', 'sections', ['railway_line'])
    op.create_index('idx_sections_is_active', 'sections', ['is_active'])
    op.create_index('idx_sections_created_at', 'sections', ['created_at'])
    
    op.create_index('idx_schedules_train_id', 'schedules', ['train_id'])
    op.create_index('idx_schedules_status', 'schedules', ['status'])
    op.create_index('idx_schedules_scheduled_departure', 'schedules', ['scheduled_departure'])
    op.create_index('idx_schedules_scheduled_arrival', 'schedules', ['scheduled_arrival'])
    op.create_index('idx_schedules_created_at', 'schedules', ['created_at'])
    
    op.create_index('idx_optimization_runs_user_id', 'optimization_runs', ['user_id'])
    op.create_index('idx_optimization_runs_status', 'optimization_runs', ['status'])
    op.create_index('idx_optimization_runs_optimization_type', 'optimization_runs', ['optimization_type'])
    op.create_index('idx_optimization_runs_created_at', 'optimization_runs', ['created_at'])
    
    op.create_index('idx_optimization_decisions_optimization_run_id', 'optimization_decisions', ['optimization_run_id'])
    op.create_index('idx_optimization_decisions_entity_type', 'optimization_decisions', ['entity_type'])
    op.create_index('idx_optimization_decisions_entity_id', 'optimization_decisions', ['entity_id'])
    op.create_index('idx_optimization_decisions_is_implemented', 'optimization_decisions', ['is_implemented'])
    
    op.create_index('idx_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('idx_notifications_status', 'notifications', ['status'])
    op.create_index('idx_notifications_notification_type', 'notifications', ['notification_type'])
    op.create_index('idx_notifications_scheduled_for', 'notifications', ['scheduled_for'])
    op.create_index('idx_notifications_created_at', 'notifications', ['created_at'])
    
    op.create_index('idx_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('idx_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_logs_resource_type', 'audit_logs', ['resource_type'])
    op.create_index('idx_audit_logs_created_at', 'audit_logs', ['created_at'])
    
    op.create_index('idx_user_roles_user_id', 'user_roles', ['user_id'])
    op.create_index('idx_user_roles_role_id', 'user_roles', ['role_id'])
    
    op.create_index('idx_user_permissions_user_id', 'user_permissions', ['user_id'])
    op.create_index('idx_user_permissions_permission_id', 'user_permissions', ['permission_id'])
    
    op.create_index('idx_user_login_history_user_id', 'user_login_history', ['user_id'])
    op.create_index('idx_user_login_history_created_at', 'user_login_history', ['created_at'])
    op.create_index('idx_user_login_history_success', 'user_login_history', ['success'])


def downgrade() -> None:
    """Downgrade database schema"""
    
    # Drop indexes
    op.drop_index('idx_user_login_history_success')
    op.drop_index('idx_user_login_history_created_at')
    op.drop_index('idx_user_login_history_user_id')
    op.drop_index('idx_user_permissions_permission_id')
    op.drop_index('idx_user_permissions_user_id')
    op.drop_index('idx_user_roles_role_id')
    op.drop_index('idx_user_roles_user_id')
    op.drop_index('idx_audit_logs_created_at')
    op.drop_index('idx_audit_logs_resource_type')
    op.drop_index('idx_audit_logs_action')
    op.drop_index('idx_audit_logs_user_id')
    op.drop_index('idx_notifications_created_at')
    op.drop_index('idx_notifications_scheduled_for')
    op.drop_index('idx_notifications_notification_type')
    op.drop_index('idx_notifications_status')
    op.drop_index('idx_notifications_user_id')
    op.drop_index('idx_optimization_decisions_is_implemented')
    op.drop_index('idx_optimization_decisions_entity_id')
    op.drop_index('idx_optimization_decisions_entity_type')
    op.drop_index('idx_optimization_decisions_optimization_run_id')
    op.drop_index('idx_optimization_runs_created_at')
    op.drop_index('idx_optimization_runs_optimization_type')
    op.drop_index('idx_optimization_runs_status')
    op.drop_index('idx_optimization_runs_user_id')
    op.drop_index('idx_schedules_created_at')
    op.drop_index('idx_schedules_scheduled_arrival')
    op.drop_index('idx_schedules_scheduled_departure')
    op.drop_index('idx_schedules_status')
    op.drop_index('idx_schedules_train_id')
    op.drop_index('idx_sections_created_at')
    op.drop_index('idx_sections_is_active')
    op.drop_index('idx_sections_railway_line')
    op.drop_index('idx_sections_status')
    op.drop_index('idx_sections_section_code')
    op.drop_index('idx_trains_created_at')
    op.drop_index('idx_trains_is_active')
    op.drop_index('idx_trains_current_section')
    op.drop_index('idx_trains_status')
    op.drop_index('idx_trains_train_number')
    op.drop_index('idx_users_created_at')
    op.drop_index('idx_users_is_active')
    op.drop_index('idx_users_username')
    op.drop_index('idx_users_email')
    
    # Drop tables
    op.drop_table('audit_logs')
    op.drop_table('notifications')
    op.drop_table('optimization_decisions')
    op.drop_table('optimization_runs')
    op.drop_table('schedules')
    op.drop_table('trains')
    op.drop_table('sections')
    op.drop_table('user_login_history')
    op.drop_table('user_permissions')
    op.drop_table('user_roles')
    op.drop_table('users')
    op.drop_table('permissions')
    op.drop_table('roles')
    
    # Drop ENUM types
    sa.Enum(name='notificationstatus').drop(op.get_bind())
    sa.Enum(name='notificationchannel').drop(op.get_bind())
    sa.Enum(name='notificationtype').drop(op.get_bind())
    sa.Enum(name='optimizationtype').drop(op.get_bind())
    sa.Enum(name='optimizationstatus').drop(op.get_bind())
    sa.Enum(name='schedulestatus').drop(op.get_bind())
    sa.Enum(name='sectiontype').drop(op.get_bind())
    sa.Enum(name='sectionstatus').drop(op.get_bind())
    sa.Enum(name='traintype').drop(op.get_bind())
    sa.Enum(name='trainstatus').drop(op.get_bind())