"""add phase 2 schema

Revision ID: 003
Revises: 002
Create Date: 2026-08-16 07:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add source column to issues table
    op.add_column('issues', sa.Column('source', sa.String(length=50), nullable=True))

    # Create emergency_contacts table
    op.create_table(
        'emergency_contacts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('service_type', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('phone_number', sa.String(length=50), nullable=False),
        sa.Column('area', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_emergency_contacts_id'), 'emergency_contacts', ['id'], unique=False)
    op.create_index(op.f('ix_emergency_contacts_service_type'), 'emergency_contacts', ['service_type'], unique=False)
    op.create_index(op.f('ix_emergency_contacts_city'), 'emergency_contacts', ['city'], unique=False)

    # Create user_consents table
    op.create_table(
        'user_consents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('accepted_terms', sa.Boolean(), nullable=False),
        sa.Column('accepted_privacy', sa.Boolean(), nullable=False),
        sa.Column('accepted_audio_processing', sa.Boolean(), nullable=False),
        sa.Column('accepted_ai_processing', sa.Boolean(), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('consented_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_consents_id'), 'user_consents', ['id'], unique=False)
    op.create_index(op.f('ix_user_consents_user_id'), 'user_consents', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop user_consents table
    op.drop_index(op.f('ix_user_consents_user_id'), table_name='user_consents')
    op.drop_index(op.f('ix_user_consents_id'), table_name='user_consents')
    op.drop_table('user_consents')

    # Drop emergency_contacts table
    op.drop_index(op.f('ix_emergency_contacts_city'), table_name='emergency_contacts')
    op.drop_index(op.f('ix_emergency_contacts_service_type'), table_name='emergency_contacts')
    op.drop_index(op.f('ix_emergency_contacts_id'), table_name='emergency_contacts')
    op.drop_table('emergency_contacts')

    # Drop source column from issues table
    op.drop_column('issues', 'source')
