import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Defaults to local SQLite if PG_DATABASE_URL is not set
DATABASE_URL = os.getenv("PG_DATABASE_URL", "sqlite:///./career_copilot.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
    if "sqlite" in DATABASE_URL
    else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class JobApplicationRecord(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    apply_url = Column(Text, nullable=False)
    match_score = Column(Float, nullable=True)
    application_status = Column(String(50), default="SCOUTED")
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    tailored_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def save_application_log(state_data: dict):
    """Persists completed agent execution results to the database."""
    session = SessionLocal()
    try:
        raw_job = state_data.get("raw_job")
        analysis = state_data.get("match_analysis")

        record = JobApplicationRecord(
            title=raw_job.title if hasattr(raw_job, "title") else raw_job.get("title", "N/A"),
            company=raw_job.company if hasattr(raw_job, "company") else raw_job.get("company", "N/A"),
            apply_url=raw_job.apply_url if hasattr(raw_job, "apply_url") else raw_job.get("apply_url", "N/A"),
            match_score=float(analysis.match_score) if analysis else None,
            application_status=state_data.get("application_status", "UNKNOWN"),
            matched_skills=analysis.matching_keywords if analysis else [],
            missing_skills=analysis.missing_keywords if analysis else [],
            tailored_summary=analysis.tailored_summary if analysis else None,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record.id
    except Exception as e:
        session.rollback()
        print(f"[!] DB Log Error: {e}")
    finally:
        session.close()