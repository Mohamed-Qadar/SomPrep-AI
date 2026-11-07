from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import BACKEND_DIR, settings

# Set up the SQLAlchemy engine
# pool_pre_ping=True checks the connection before executing queries to prevent connection drops.
connect_args = {}
database_url = settings.DATABASE_URL
if database_url.startswith("sqlite:///./"):
    sqlite_path = BACKEND_DIR / database_url.removeprefix("sqlite:///./")
    database_url = f"sqlite:///{sqlite_path.as_posix()}"

_is_sqlite = database_url.startswith("sqlite")
if _is_sqlite:
    connect_args = {"check_same_thread": False, "timeout": 15}

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _):
        """
        Production-reliability pragmas for SQLite:
          WAL      — readers no longer block writers (concurrent students);
          NORMAL   — safe with WAL, much faster than FULL;
          busy_timeout — wait instead of instantly failing on a locked DB;
          foreign_keys — enforce FK constraints (off by default in SQLite).
        """
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=15000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Set up SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Set up Base class using the modern SQLAlchemy 2.0 DeclarativeBase
class Base(DeclarativeBase):
    pass


# Dependency to get db session in FastAPI endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
