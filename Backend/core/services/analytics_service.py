from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, and_, or_, case, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.models.users import User, UserRole, UserStatus
from core.models.issues import Issue, IssueStatus, IssuePriority
from core.models.departments import Department
from core.schemas.analytics import (
    AnalyticsSummaryResponse,
    AnalyticsTrendsResponse,
    AnalyticsHeatmapResponse,
    StatusCount,
    CategoryCount,
    PriorityCount,
    DepartmentStat,
    TrendPoint,
    HeatmapPoint
)


class AnalyticsService:
    """
    Computes business intelligence metrics, resolution SLA trends, and geographic heatmaps.
    """

    @staticmethod
    async def get_summary_metrics(db: AsyncSession) -> AnalyticsSummaryResponse:
        """
        Computes overall high-level statistics across all municipal operations.
        """
        # Count issues by status
        status_stmt = select(Issue.status, func.count(Issue.id)).group_by(Issue.status)
        status_res = await db.execute(status_stmt)
        status_map = {row[0].value if hasattr(row[0], "value") else str(row[0]): row[1] for row in status_res.all()}

        total_issues = sum(status_map.values())
        resolved_issues = status_map.get(IssueStatus.RESOLVED.value, 0)
        malicious_issues = status_map.get(IssueStatus.MALICIOUS.value, 0)
        in_progress_issues = status_map.get(IssueStatus.IN_PROGRESS.value, 0)
        open_issues = (
            status_map.get(IssueStatus.NEW.value, 0) +
            status_map.get(IssueStatus.REVIEWED.value, 0) +
            status_map.get(IssueStatus.FORWARDED.value, 0)
        )

        # Count citizens vs staff
        citizen_count_res = await db.execute(
            select(func.count(User.id)).where(User.role == UserRole.CITIZEN)
        )
        total_citizens = citizen_count_res.scalar_one() or 0

        staff_count_res = await db.execute(
            select(func.count(User.id)).where(User.role.in_([UserRole.CALLCENTRE, UserRole.OFFICER, UserRole.ADMIN]))
        )
        total_staff = staff_count_res.scalar_one() or 0

        low_cred_res = await db.execute(
            select(func.count(User.id)).where(
                User.role == UserRole.CITIZEN,
                User.credibility_score < settings.LOW_CREDIBILITY_THRESHOLD
            )
        )
        low_cred_count = low_cred_res.scalar_one() or 0

        # SLA compliance calculation
        resolved_stmt = select(Issue).where(
            Issue.status == IssueStatus.RESOLVED,
            Issue.resolved_at.isnot(None),
            Issue.sla_due_at.isnot(None)
        )
        resolved_res = await db.execute(resolved_stmt)
        resolved_list = resolved_res.scalars().all()

        if resolved_list:
            met_sla = sum(1 for iss in resolved_list if iss.resolved_at <= iss.sla_due_at)
            sla_compliance = round((met_sla / len(resolved_list)) * 100.0, 1)

            durations = [
                (iss.resolved_at - iss.created_at).total_seconds() / 3600.0
                for iss in resolved_list
            ]
            avg_res_hours = round(sum(durations) / len(durations), 1)
        else:
            sla_compliance = 100.0
            avg_res_hours = 0.0

        # Breakdowns
        status_breakdown = [
            StatusCount(status=st, count=cnt) for st, cnt in status_map.items()
        ]

        # Priority breakdown
        pri_stmt = select(Issue.priority, func.count(Issue.id)).group_by(Issue.priority)
        pri_res = await db.execute(pri_stmt)
        priority_breakdown = [
            PriorityCount(priority=row[0].value if hasattr(row[0], "value") else str(row[0]), count=row[1])
            for row in pri_res.all()
        ]

        # Category breakdown
        cat_stmt = select(Issue.category, func.count(Issue.id)).group_by(Issue.category)
        cat_res = await db.execute(cat_stmt)
        category_breakdown = [
            CategoryCount(category=row[0], count=row[1]) for row in cat_res.all()
        ]

        # Department breakdown
        dept_stmt = select(Department).order_by(Department.name)
        depts_res = await db.execute(dept_stmt)
        departments = depts_res.scalars().all()

        dept_breakdown = []
        now = datetime.now(timezone.utc)
        for d in departments:
            d_issues_stmt = select(Issue).where(Issue.department_id == d.id)
            d_issues_res = await db.execute(d_issues_stmt)
            d_issues = d_issues_res.scalars().all()

            d_total = len(d_issues)
            d_open = sum(1 for x in d_issues if x.status in [IssueStatus.NEW, IssueStatus.REVIEWED, IssueStatus.FORWARDED, IssueStatus.IN_PROGRESS])
            d_resolved = sum(1 for x in d_issues if x.status == IssueStatus.RESOLVED)
            d_breached = sum(1 for x in d_issues if x.sla_due_at and x.status != IssueStatus.RESOLVED and now > (x.sla_due_at.replace(tzinfo=timezone.utc) if x.sla_due_at.tzinfo is None else x.sla_due_at))

            dept_breakdown.append(DepartmentStat(
                department_id=d.id,
                department_name=d.name,
                total_issues=d_total,
                open_issues=d_open,
                resolved_issues=d_resolved,
                sla_breached=d_breached
            ))

        return AnalyticsSummaryResponse(
            total_issues=total_issues,
            open_issues=open_issues,
            in_progress_issues=in_progress_issues,
            resolved_issues=resolved_issues,
            malicious_issues=malicious_issues,
            total_citizens=total_citizens,
            total_staff=total_staff,
            low_credibility_citizens_count=low_cred_count,
            sla_compliance_rate=sla_compliance,
            avg_resolution_hours=avg_res_hours,
            status_breakdown=status_breakdown,
            priority_breakdown=priority_breakdown,
            category_breakdown=category_breakdown,
            department_breakdown=dept_breakdown
        )

    @staticmethod
    async def get_trends(db: AsyncSession, days: int = 14) -> AnalyticsTrendsResponse:
        """
        Computes daily volume trends over the specified day range.
        """
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        issues_res = await db.execute(
            select(Issue).where(Issue.created_at >= start_date).order_by(Issue.created_at.asc())
        )
        issues = issues_res.scalars().all()

        daily_map: Dict[str, Dict[str, int]] = {}
        for i in range(days + 1):
            d_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            daily_map[d_str] = {"total": 0, "resolved": 0, "malicious": 0}

        for iss in issues:
            d_str = iss.created_at.strftime("%Y-%m-%d")
            if d_str in daily_map:
                daily_map[d_str]["total"] += 1
                if iss.status == IssueStatus.RESOLVED:
                    daily_map[d_str]["resolved"] += 1
                elif iss.status == IssueStatus.MALICIOUS:
                    daily_map[d_str]["malicious"] += 1

        points = [
            TrendPoint(
                date=k,
                total_created=v["total"],
                resolved_count=v["resolved"],
                malicious_count=v["malicious"]
            )
            for k, v in sorted(daily_map.items())
        ]
        return AnalyticsTrendsResponse(trends=points)

    @staticmethod
    async def get_heatmap_points(db: AsyncSession) -> AnalyticsHeatmapResponse:
        """
        Fetches geospatial points of grievances for frontend map visualization.
        """
        query = select(Issue).where(
            Issue.location_lat.isnot(None),
            Issue.location_lng.isnot(None)
        )
        result = await db.execute(query)
        issues = result.scalars().all()

        points = []
        for iss in issues:
            # High priority has higher weight
            weight = 2.0 if iss.priority == IssuePriority.HIGH else (1.4 if iss.priority == IssuePriority.MEDIUM else 1.0)
            points.append(HeatmapPoint(
                lat=iss.location_lat,
                lng=iss.location_lng,
                weight=weight,
                category=iss.category,
                ward=iss.ward,
                issue_id=iss.issue_id,
                priority=iss.priority.value,
                status=iss.status.value
            ))

        return AnalyticsHeatmapResponse(points=points)
