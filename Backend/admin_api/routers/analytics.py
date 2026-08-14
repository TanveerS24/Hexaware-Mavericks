from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import get_db
from core.models.users import User, UserRole
from core.schemas.analytics import (
    AnalyticsSummaryResponse,
    AnalyticsTrendsResponse,
    AnalyticsHeatmapResponse
)
from core.security import require_roles
from core.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Admin Analytics & Reporting"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    High-level platform executive metrics, SLA compliance, and department performance breakdowns.
    """
    return await AnalyticsService.get_summary_metrics(db)


@router.get("/trends", response_model=AnalyticsTrendsResponse)
async def get_analytics_trends(
    days: int = Query(14, ge=1, le=90, description="Trend timeline window in days"),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Historical grievance filing volume, resolution trends, and malicious flags.
    """
    return await AnalyticsService.get_trends(db, days=days)


@router.get("/heatmap", response_model=AnalyticsHeatmapResponse)
async def get_analytics_heatmap(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db)
):
    """
    Geographic grievance distribution points for density and heat mapping.
    """
    return await AnalyticsService.get_heatmap_points(db)
