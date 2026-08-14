from typing import List, Dict, Optional
from pydantic import BaseModel


class StatusCount(BaseModel):
    status: str
    count: int


class CategoryCount(BaseModel):
    category: str
    count: int


class PriorityCount(BaseModel):
    priority: str
    count: int


class DepartmentStat(BaseModel):
    department_id: Optional[int] = None
    department_name: str
    total_issues: int
    open_issues: int
    resolved_issues: int
    sla_breached: int


class AnalyticsSummaryResponse(BaseModel):
    total_issues: int
    open_issues: int
    in_progress_issues: int
    resolved_issues: int
    malicious_issues: int
    total_citizens: int
    total_staff: int
    low_credibility_citizens_count: int
    sla_compliance_rate: float  # percentage, e.g. 94.5
    avg_resolution_hours: float
    status_breakdown: List[StatusCount]
    priority_breakdown: List[PriorityCount]
    category_breakdown: List[CategoryCount]
    department_breakdown: List[DepartmentStat]


class TrendPoint(BaseModel):
    date: str  # YYYY-MM-DD
    total_created: int
    resolved_count: int
    malicious_count: int


class AnalyticsTrendsResponse(BaseModel):
    trends: List[TrendPoint]


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: float = 1.0
    category: str
    ward: Optional[str] = None
    issue_id: str
    priority: str
    status: str


class AnalyticsHeatmapResponse(BaseModel):
    points: List[HeatmapPoint]
