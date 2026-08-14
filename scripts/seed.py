import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.db.session import AsyncSessionLocal
from core.models.departments import Department
from core.models.users import User, UserRole, UserStatus
from core.models.sla_config import SLAConfig
from core.models.knowledge_base import KnowledgeBase
from core.models.announcements import Announcement
from core.models.issues import Issue, IssuePriority, IssueStatus
from core.models.issue_status_history import IssueStatusHistory
from core.models.issue_embeddings import IssueEmbedding
from core.models.credibility_log import CredibilityLog
from core.security import hash_password
from core.services.rag_service import RAGService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


async def seed_database():
    logger.info("🌱 Starting database seeding...")

    async with AsyncSessionLocal() as session:
        # 1. Seed Departments
        dept_data = [
            {"name": "Water & Sanitation", "jurisdiction_area": "City-Wide Water Supply & Drainage"},
            {"name": "Electricity & Power", "jurisdiction_area": "Municipal Power Grid & Street Lighting"},
            {"name": "Roads & Infrastructure", "jurisdiction_area": "City Arterial Roads, Bridges & Pavements"},
            {"name": "Waste Management", "jurisdiction_area": "Solid Waste Collection & Cleanliness"},
            {"name": "Public Health", "jurisdiction_area": "Vector Control, Clinics & Sanitation"},
            {"name": "Municipal Administration", "jurisdiction_area": "City Governance & Civil Registry"},
        ]

        dept_map = {}
        for d in dept_data:
            try:
                existing = await session.execute(select(Department).where(Department.name == d["name"]))
                dept = existing.scalar_one_or_none()
                if not dept:
                    dept = Department(name=d["name"], jurisdiction_area=d["jurisdiction_area"])
                    session.add(dept)
                    await session.commit()
                    logger.info(f"Created department: {dept.name}")
                dept_map[d["name"]] = dept
            except IntegrityError:
                await session.rollback()
                existing = await session.execute(select(Department).where(Department.name == d["name"]))
                dept_map[d["name"]] = existing.scalar_one_or_none()

        # 2. Seed SLA Configs
        sla_defaults = [
            ("Water & Sanitation", "high", 12),
            ("Water & Sanitation", "medium", 24),
            ("Water & Sanitation", "low", 48),
            ("Electricity & Power", "high", 6),
            ("Electricity & Power", "medium", 24),
            ("Electricity & Power", "low", 48),
            ("Roads & Infrastructure", "high", 24),
            ("Roads & Infrastructure", "medium", 48),
            ("Roads & Infrastructure", "low", 96),
            ("Waste Management", "high", 12),
            ("Waste Management", "medium", 24),
            ("Waste Management", "low", 48),
            ("Public Health", "high", 12),
            ("Public Health", "medium", 24),
            ("Public Health", "low", 48),
            ("Municipal Administration", "high", 24),
            ("Municipal Administration", "medium", 48),
            ("Municipal Administration", "low", 72),
        ]

        for cat, pri, hrs in sla_defaults:
            try:
                existing_sla = await session.execute(
                    select(SLAConfig).where(SLAConfig.category == cat, SLAConfig.priority == pri)
                )
                if not existing_sla.scalar_one_or_none():
                    session.add(SLAConfig(category=cat, priority=pri, sla_hours=hrs))
                    await session.commit()
            except IntegrityError:
                await session.rollback()

        # 3. Seed Users
        users_to_seed = [
            {
                "name": "Super Administrator",
                "email": "admin@city.gov",
                "phone": "+1000000000",
                "password": "Admin@123",
                "role": UserRole.ADMIN,
                "department_id": None,
                "credibility_score": 1.0,
                "status": UserStatus.ACTIVE
            },
            {
                "name": "Alex Agent",
                "email": "callcentre1@city.gov",
                "phone": "+1000000001",
                "password": "Agent@123",
                "role": UserRole.CALLCENTRE,
                "department_id": None,
                "credibility_score": 1.0,
                "status": UserStatus.ACTIVE
            },
            {
                "name": "Officer Priya Sharma",
                "email": "officer.water@city.gov",
                "phone": "+1000000002",
                "password": "Officer@123",
                "role": UserRole.OFFICER,
                "department_id": dept_map.get("Water & Sanitation", None).id if dept_map.get("Water & Sanitation") else None,
                "credibility_score": 1.0,
                "status": UserStatus.ACTIVE
            },
            {
                "name": "Officer David Miller",
                "email": "officer.power@city.gov",
                "phone": "+1000000003",
                "password": "Officer@123",
                "role": UserRole.OFFICER,
                "department_id": dept_map.get("Electricity & Power", None).id if dept_map.get("Electricity & Power") else None,
                "credibility_score": 1.0,
                "status": UserStatus.ACTIVE
            },
            {
                "name": "Jane Citizen",
                "email": "citizen.jane@example.com",
                "phone": "+1987654321",
                "password": "Citizen@123",
                "role": UserRole.CITIZEN,
                "department_id": None,
                "credibility_score": 1.0,
                "status": UserStatus.ACTIVE
            },
            {
                "name": "Spammy User",
                "email": "citizen.spammer@example.com",
                "phone": "+1999999999",
                "password": "Citizen@123",
                "role": UserRole.CITIZEN,
                "department_id": None,
                "credibility_score": 0.35,
                "status": UserStatus.ACTIVE
            },
        ]

        user_map = {}
        for u in users_to_seed:
            try:
                existing_u = await session.execute(select(User).where(User.email == u["email"]))
                user = existing_u.scalar_one_or_none()
                if not user:
                    user = User(
                        name=u["name"],
                        email=u["email"],
                        phone=u["phone"],
                        password_hash=hash_password(u["password"]),
                        role=u["role"],
                        department_id=u["department_id"],
                        credibility_score=u["credibility_score"],
                        status=u["status"]
                    )
                    session.add(user)
                    await session.commit()
                    logger.info(f"Created user: {user.email} ({user.role.value})")
                user_map[u["email"]] = user
            except IntegrityError:
                await session.rollback()
                existing_u = await session.execute(select(User).where(User.email == u["email"]))
                user_map[u["email"]] = existing_u.scalar_one_or_none()

        # 4. Seed Credibility Log for Low Credibility Citizen
        spammer = user_map.get("citizen.spammer@example.com")
        if spammer:
            try:
                log_check = await session.execute(select(CredibilityLog).where(CredibilityLog.user_id == spammer.id))
                if not log_check.scalars().all():
                    session.add(CredibilityLog(user_id=spammer.id, delta=-0.15, reason="False emergency report"))
                    session.add(CredibilityLog(user_id=spammer.id, delta=-0.15, reason="Repeated spam ticket"))
                    session.add(CredibilityLog(user_id=spammer.id, delta=-0.15, reason="Abusive grievance"))
                    session.add(CredibilityLog(user_id=spammer.id, delta=-0.20, reason="Malicious flag by field team"))
                    await session.commit()
            except IntegrityError:
                await session.rollback()

        # 5. Seed Knowledge Base Articles
        kb_articles = [
            {
                "dept": "Water & Sanitation",
                "title": "Emergency Water Pipeline Burst & Low Pressure",
                "content": "For major water pipeline bursts, emergency crews respond within 6-12 hours. Please report the exact street address, nearest landmark, and whether potable water is being wasted."
            },
            {
                "dept": "Electricity & Power",
                "title": "Sparks & Hanging Live Power Lines Safety Protocol",
                "content": "Stay at least 10 meters away from sparking transformers or fallen overhead power wires. Emergency response teams isolate power immediately upon receiving high priority alerts."
            },
            {
                "dept": "Roads & Infrastructure",
                "title": "Pothole Reporting and Asphalt Patching Timelines",
                "content": "Report potholes with location coordinates and street pictures. City road maintenance covers major potholes within 24 to 48 hours depending on traffic density."
            },
            {
                "dept": "Waste Management",
                "title": "Daily Door-to-Door Garbage Collection Schedule",
                "content": "Residential waste pickup operates from 7:00 AM to 11:30 AM daily. Segregate organic and recyclable dry waste in designated green and blue bins."
            },
            {
                "dept": "Public Health",
                "title": "Stagnant Water Mosquito Fogging & Dengue Prevention",
                "content": "Citizens can request targeted mosquito fogging in their ward if standing rainwater or dengue clusters are noticed. Municipal health units spray within 24 hours."
            },
        ]

        for kb in kb_articles:
            try:
                existing_kb = await session.execute(select(KnowledgeBase).where(KnowledgeBase.title == kb["title"]))
                if not existing_kb.scalar_one_or_none():
                    dept = dept_map.get(kb["dept"])
                    emb = await RAGService.get_embedding(f"{kb['title']}\n{kb['content']}")
                    session.add(KnowledgeBase(
                        department_id=dept.id if dept else None,
                        title=kb["title"],
                        content=kb["content"],
                        embedding=emb
                    ))
                    await session.commit()
            except IntegrityError:
                await session.rollback()

        # 6. Seed Announcements
        admin_user = user_map.get("admin@city.gov")
        try:
            ann_check = await session.execute(select(Announcement))
            if not ann_check.scalars().all():
                session.add(Announcement(
                    title="Monsoon Preparedness & Drainage Clearance Drive",
                    body="The Municipal Corporation has initiated rapid desilting of major stormwater drains. Please report any waterlogging via this platform.",
                    published_by_admin_id=admin_user.id if admin_user else None
                ))
                session.add(Announcement(
                    title="Smart Streetlight Upgrade Across Wards 1 to 6",
                    body="Energy-efficient LED streetlights with automated sensors are being deployed across central wards this month.",
                    published_by_admin_id=admin_user.id if admin_user else None
                ))
                await session.commit()
        except IntegrityError:
            await session.rollback()

        # 7. Seed Demo Issues
        citizen_jane = user_map.get("citizen.jane@example.com")
        try:
            issue_check = await session.execute(select(Issue))
            if not issue_check.scalars().all() and citizen_jane:
                now = datetime.now(timezone.utc)
                demo_issue1 = Issue(
                    issue_id="ISS-2026-000101",
                    citizen_id=citizen_jane.id,
                    category="Electricity & Power",
                    department_id=dept_map["Electricity & Power"].id if dept_map.get("Electricity & Power") else None,
                    priority=IssuePriority.HIGH,
                    status=IssueStatus.NEW,
                    location_lat=12.9716,
                    location_lng=77.5946,
                    ward="Ward 4",
                    transcript="Streetlight pole sparking near central park gate, sparks falling on sidewalk.",
                    ai_summary="Streetlight pole sparking near central park sidewalk, high danger.",
                    sentiment="urgent",
                    assigned_officer_ids=[],
                    version=1,
                    created_at=now - timedelta(hours=2),
                    sla_due_at=now + timedelta(hours=4)
                )
                session.add(demo_issue1)
                await session.flush()

                emb1 = await RAGService.get_embedding(demo_issue1.transcript)
                session.add(IssueEmbedding(issue_id=demo_issue1.id, embedding=emb1))
                session.add(IssueStatusHistory(
                    issue_id=demo_issue1.id,
                    old_status=None,
                    new_status="new",
                    changed_by_user_id=citizen_jane.id,
                    notes="Initial complaint filed"
                ))

                demo_issue2 = Issue(
                    issue_id="ISS-2026-000102",
                    citizen_id=citizen_jane.id,
                    category="Water & Sanitation",
                    department_id=dept_map["Water & Sanitation"].id if dept_map.get("Water & Sanitation") else None,
                    priority=IssuePriority.MEDIUM,
                    status=IssueStatus.IN_PROGRESS,
                    location_lat=12.9750,
                    location_lng=77.5990,
                    ward="Ward 4",
                    transcript="Low water pressure in 4th cross lane since three days.",
                    ai_summary="Low water supply pressure in 4th cross lane.",
                    sentiment="neutral",
                    assigned_officer_ids=[user_map["officer.water@city.gov"].id] if user_map.get("officer.water@city.gov") else [],
                    version=2,
                    created_at=now - timedelta(hours=18),
                    sla_due_at=now + timedelta(hours=6)
                )
                session.add(demo_issue2)
                await session.flush()

                emb2 = await RAGService.get_embedding(demo_issue2.transcript)
                session.add(IssueEmbedding(issue_id=demo_issue2.id, embedding=emb2))
                session.add(IssueStatusHistory(
                    issue_id=demo_issue2.id,
                    old_status="new",
                    new_status="in_progress",
                    changed_by_user_id=user_map["officer.water@city.gov"].id if user_map.get("officer.water@city.gov") else citizen_jane.id,
                    notes="Claimed by Officer Priya Sharma"
                ))
                await session.commit()
        except IntegrityError:
            await session.rollback()

        logger.info(" Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_database())
