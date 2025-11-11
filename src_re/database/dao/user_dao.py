from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from database.models import UserDB

try:
    # werkzeug safer hashing
    from werkzeug.security import generate_password_hash, check_password_hash
except Exception:  # Environment may not have it installed; fallback to simplified version
    import hashlib

    def generate_password_hash(password: str) -> str:
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

    def check_password_hash(pw_hash: str, password: str) -> bool:
        return pw_hash == generate_password_hash(password)


logger = logging.getLogger(__name__)


class UserDAO:
    """User data access object"""

    @staticmethod
    def get_by_email(session: Session, email: str) -> Optional[UserDB]:
        return session.query(UserDB).filter(UserDB.email == email).first()

    @staticmethod
    def create_user(session: Session, email: str, password: str) -> Optional[UserDB]:
        if not email or not password:
            return None
        if UserDAO.get_by_email(session, email):
            return None
        user = UserDB(
            email=email,
            password_hash=generate_password_hash(password),
            is_active=True,
            is_admin=False,
        )
        session.add(user)
        session.flush()
        logger.info(f"Created user: {email}")
        return user

    @staticmethod
    def verify_password(session: Session, email: str, password: str) -> Optional[UserDB]:
        user = UserDAO.get_by_email(session, email)
        if user and check_password_hash(user.password_hash, password) and user.is_active:
            user.last_login = datetime.utcnow()
            return user
        return None

    @staticmethod
    def update_last_login(session: Session, user_id: int) -> None:
        user = session.query(UserDB).get(user_id)
        if user:
            user.last_login = datetime.utcnow()


