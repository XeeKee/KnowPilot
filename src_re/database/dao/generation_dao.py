from __future__ import annotations

import logging
import uuid as uuid_lib
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from sqlalchemy import and_, func, desc
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.models import GenerationJobDB, GenerationChunkDB


logger = logging.getLogger(__name__)


class GenerationDAO:
    """Streaming generation data access object
    
    Provides database operations for concurrent generation jobs and streaming chunks.
    """

    @staticmethod
    def create_generation_job(
        session: Session,
        session_uuid: str,
        record_id: Optional[int] = None,
        topic: Optional[str] = None,
        outline_snapshot_hash: Optional[str] = None,
        job_id: Optional[str] = None,
    ) -> GenerationJobDB:
        """Create a new generation job"""
        if job_id is None:
            job_id = str(uuid_lib.uuid4())
        
        job = GenerationJobDB(
            id=job_id,
            session_uuid=session_uuid,
            record_id=record_id,
            status="queued",
            topic=topic,
            outline_snapshot_hash=outline_snapshot_hash,
        )
        
        session.add(job)
        session.flush()
        
        logger.info(f"Created generation job: {job_id}, session={session_uuid}")
        return job

    @staticmethod
    def get_generation_job(session: Session, job_id: str) -> Optional[GenerationJobDB]:
        """Get generation job by ID"""
        return session.query(GenerationJobDB).filter(
            GenerationJobDB.id == job_id
        ).first()

    @staticmethod
    def get_session_jobs(
        session: Session,
        session_uuid: str,
        status: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[GenerationJobDB]:
        """Get generation jobs of a session"""
        query = session.query(GenerationJobDB).filter(
            GenerationJobDB.session_uuid == session_uuid
        )
        
        if status:
            query = query.filter(GenerationJobDB.status == status)
        
        query = query.order_by(GenerationJobDB.created_at.desc())
        
        if limit:
            query = query.limit(limit)
            
        return query.all()

    @staticmethod
    def update_job_status(
        session: Session,
        job_id: str,
        status: str,
        record_id: Optional[int] = None,
    ) -> bool:
        """Update generation job status"""
        job = GenerationDAO.get_generation_job(session, job_id)
        if not job:
            return False
        
        job.status = status
        job.updated_at = datetime.utcnow()
        
        if status in ("succeeded", "failed", "canceled"):
            job.completed_at = datetime.utcnow()
        
        if record_id is not None:
            job.record_id = record_id
        
        logger.info(f"Updated generation job {job_id} status: {status}")
        return True

    @staticmethod
    def add_generation_chunk(
        session: Session,
        job_id: str,
        content: str,
        chapter_index: Optional[int] = None,
        is_final_chunk: bool = False,
    ) -> Optional[GenerationChunkDB]:
        """Add generation chunk (concurrency-safe)"""
        # Get next sequence number
        max_seq = session.query(func.max(GenerationChunkDB.seq)).filter(
            GenerationChunkDB.job_id == job_id
        ).scalar() or 0
        
        next_seq = max_seq + 1
        
        chunk = GenerationChunkDB(
            job_id=job_id,
            seq=next_seq,
            chapter_index=chapter_index,
            content=content,
            is_final_chunk=is_final_chunk,
        )
        
        try:
            session.add(chunk)
            session.flush()
            
            logger.debug(f"Added generation chunk: job={job_id}, seq={next_seq}, final={is_final_chunk}")
            return chunk
            
        except IntegrityError as e:
            logger.error(f"Failed to add generation chunk: {e}")
            return None

    @staticmethod
    def get_job_chunks(
        session: Session,
        job_id: str,
        chapter_index: Optional[int] = None,
    ) -> List[GenerationChunkDB]:
        """Get all chunks of a generation job"""
        query = session.query(GenerationChunkDB).filter(
            GenerationChunkDB.job_id == job_id
        )
        
        if chapter_index is not None:
            query = query.filter(GenerationChunkDB.chapter_index == chapter_index)
        
        return query.order_by(GenerationChunkDB.seq).all()

    @staticmethod
    def get_job_content(session: Session, job_id: str) -> str:
        """Get full content of a generation job (concatenate all chunks)"""
        chunks = GenerationDAO.get_job_chunks(session, job_id)
        return "".join(chunk.content for chunk in chunks)

    @staticmethod
    def get_job_content_by_chapter(session: Session, job_id: str) -> Dict[int, str]:
        """Get generated content grouped by chapter"""
        chunks = GenerationDAO.get_job_chunks(session, job_id)
        
        content_by_chapter = {}
        for chunk in chunks:
            chapter_idx = chunk.chapter_index or 0
            if chapter_idx not in content_by_chapter:
                content_by_chapter[chapter_idx] = ""
            content_by_chapter[chapter_idx] += chunk.content
        
        return content_by_chapter

    @staticmethod
    def is_job_completed(session: Session, job_id: str) -> bool:
        """Check whether a generation job has completed"""
        job = GenerationDAO.get_generation_job(session, job_id)
        return job.status in ("succeeded", "failed", "canceled") if job else False

    @staticmethod
    def has_final_chunk(session: Session, job_id: str) -> bool:
        """Check whether a final chunk already exists"""
        final_chunk = session.query(GenerationChunkDB).filter(
            and_(
                GenerationChunkDB.job_id == job_id,
                GenerationChunkDB.is_final_chunk == True,
            )
        ).first()
        
        return final_chunk is not None

    @staticmethod
    def cancel_job(session: Session, job_id: str) -> bool:
        """Cancel generation job"""
        return GenerationDAO.update_job_status(session, job_id, "canceled")

    @staticmethod
    def cleanup_old_jobs(session: Session, days: int = 7) -> int:
        """Clean up expired generation jobs"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Delete completed and expired jobs
        deleted_count = session.query(GenerationJobDB).filter(
            and_(
                GenerationJobDB.status.in_(("succeeded", "failed", "canceled")),
                GenerationJobDB.completed_at < cutoff_date,
            )
        ).delete(synchronize_session=False)
        
        logger.info(f"Cleaned {deleted_count} expired generation jobs")
        return deleted_count

    @staticmethod
    def get_job_statistics(session: Session, session_uuid: str) -> Dict[str, Any]:
        """Get generation job statistics for a session"""
        total_jobs = session.query(func.count(GenerationJobDB.id)).filter(
            GenerationJobDB.session_uuid == session_uuid
        ).scalar()
        
        status_counts = session.query(
            GenerationJobDB.status,
            func.count(GenerationJobDB.id)
        ).filter(
            GenerationJobDB.session_uuid == session_uuid
        ).group_by(GenerationJobDB.status).all()
        
        status_dict = {status: count for status, count in status_counts}
        
        return {
            "total_jobs": total_jobs,
            "queued": status_dict.get("queued", 0),
            "running": status_dict.get("running", 0),
            "succeeded": status_dict.get("succeeded", 0),
            "failed": status_dict.get("failed", 0),
            "canceled": status_dict.get("canceled", 0),
        }
