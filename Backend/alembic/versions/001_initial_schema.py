"""Initial schema with all tables and pgvector support

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-14 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 0. Enable pgvector extension (disabled for local compat)
    # op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 1. Departments table
    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('jurisdiction_area', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_departments_id'), 'departments', ['id'], unique=False)
    op.create_index(op.f('ix_departments_name'), 'departments', ['name'], unique=True)

    # 2. Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('citizen', 'callcentre', 'officer', 'admin', name='user_role_enum'), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=True),
        sa.Column('credibility_score', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('status', sa.Enum('active', 'banned', name='user_status_enum'), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_phone'), 'users', ['phone'], unique=True)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)

    # 3. Refresh Tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(length=255), nullable=False),
        sa.Column('device_info', sa.String(length=255), nullable=True),
        sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_refresh_tokens_id'), 'refresh_tokens', ['id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token_hash'), 'refresh_tokens', ['token_hash'], unique=True)
    op.create_index(op.f('ix_refresh_tokens_expires_at'), 'refresh_tokens', ['expires_at'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_revoked'), 'refresh_tokens', ['revoked'], unique=False)

    # 4. Blocked Users
    op.create_table(
        'blocked_users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('block_start_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('block_end_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_tier', sa.Enum('3d', '10d', '30d', 'permanent', name='block_duration_tier_enum'), nullable=False),
        sa.Column('reason', sa.String(length=500), nullable=False),
        sa.Column('issued_by_admin_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('score_at_unblock', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['issued_by_admin_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_blocked_users_id'), 'blocked_users', ['id'], unique=False)
    op.create_index(op.f('ix_blocked_users_user_id'), 'blocked_users', ['user_id'], unique=False)
    op.create_index(op.f('ix_blocked_users_is_active'), 'blocked_users', ['is_active'], unique=False)

    # 5. Credibility Log
    op.create_table(
        'credibility_log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('delta', sa.Float(), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_credibility_log_id'), 'credibility_log', ['id'], unique=False)
    op.create_index(op.f('ix_credibility_log_user_id'), 'credibility_log', ['user_id'], unique=False)

    # 6. SLA Config
    op.create_table(
        'sla_config',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('priority', sa.String(length=50), nullable=False),
        sa.Column('sla_hours', sa.Integer(), nullable=False, server_default='48'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category', 'priority', name='uq_category_priority')
    )
    op.create_index(op.f('ix_sla_config_id'), 'sla_config', ['id'], unique=False)
    op.create_index(op.f('ix_sla_config_category'), 'sla_config', ['category'], unique=False)
    op.create_index(op.f('ix_sla_config_priority'), 'sla_config', ['priority'], unique=False)

    # 7. Issues table
    op.create_table(
        'issues',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('issue_id', sa.String(length=50), nullable=False),
        sa.Column('citizen_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=True),
        sa.Column('priority', sa.Enum('high', 'medium', 'low', name='issue_priority_enum'), nullable=False, server_default='medium'),
        sa.Column('status', sa.Enum('new', 'reviewed', 'forwarded', 'in_progress', 'resolved', 'malicious', name='issue_status_enum'), nullable=False, server_default='new'),
        sa.Column('location_lat', sa.Float(), nullable=True),
        sa.Column('location_lng', sa.Float(), nullable=True),
        sa.Column('ward', sa.String(length=100), nullable=True),
        sa.Column('transcript', sa.Text(), nullable=False),
        sa.Column('audio_url', sa.String(length=500), nullable=True),
        sa.Column('ai_summary', sa.Text(), nullable=True),
        sa.Column('sentiment', sa.String(length=50), nullable=True),
        sa.Column('assigned_officer_ids', postgresql.ARRAY(sa.Integer()), nullable=False, server_default='{}'),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sla_due_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['citizen_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_issues_id'), 'issues', ['id'], unique=False)
    op.create_index(op.f('ix_issues_issue_id'), 'issues', ['issue_id'], unique=True)
    op.create_index(op.f('ix_issues_citizen_id'), 'issues', ['citizen_id'], unique=False)
    op.create_index(op.f('ix_issues_department_id'), 'issues', ['department_id'], unique=False)
    op.create_index(op.f('ix_issues_ward'), 'issues', ['ward'], unique=False)
    op.create_index(op.f('ix_issues_status'), 'issues', ['status'], unique=False)
    op.create_index(op.f('ix_issues_priority'), 'issues', ['priority'], unique=False)

    # 8. Issue Status History
    op.create_table(
        'issue_status_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=False),
        sa.Column('old_status', sa.String(length=50), nullable=True),
        sa.Column('new_status', sa.String(length=50), nullable=False),
        sa.Column('changed_by_user_id', sa.Integer(), nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['changed_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_issue_status_history_id'), 'issue_status_history', ['id'], unique=False)
    op.create_index(op.f('ix_issue_status_history_issue_id'), 'issue_status_history', ['issue_id'], unique=False)

    # 9. Announcements
    op.create_table(
        'announcements',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('published_by_admin_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['published_by_admin_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_announcements_id'), 'announcements', ['id'], unique=False)

    # 10. Knowledge Base
    op.create_table(
        'knowledge_base',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('embedding', postgresql.ARRAY(sa.Float), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_base_id'), 'knowledge_base', ['id'], unique=False)

    # 11. Issue Embeddings
    op.create_table(
        'issue_embeddings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('issue_id', sa.Integer(), nullable=False),
        sa.Column('embedding', postgresql.ARRAY(sa.Float), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('issue_id')
    )
    op.create_index(op.f('ix_issue_embeddings_id'), 'issue_embeddings', ['id'], unique=False)

    # 12. Notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notification_type', sa.String(length=50), nullable=False, server_default='info'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('issue_embeddings')
    op.drop_table('knowledge_base')
    op.drop_table('announcements')
    op.drop_table('issue_status_history')
    op.drop_table('issues')
    op.drop_table('sla_config')
    op.drop_table('credibility_log')
    op.drop_table('blocked_users')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
    op.drop_table('departments')
    op.execute("DROP TYPE IF EXISTS user_role_enum;")
    op.execute("DROP TYPE IF EXISTS user_status_enum;")
    op.execute("DROP TYPE IF EXISTS block_duration_tier_enum;")
    op.execute("DROP TYPE IF EXISTS issue_priority_enum;")
    op.execute("DROP TYPE IF EXISTS issue_status_enum;")
