"""
SomPrep AI — database + uploads backup.

Creates a timestamped, consistent snapshot of the SQLite database (using the
online backup API, safe while the app is running, WAL included) plus the
uploads directory (receipts, teacher materials, community media).

Usage:
    python backup_db.py [--dest DIR] [--keep N]

Defaults: dest = C:/Users/<user>/SomPrep-DB-Backups, keep = 30 most recent.
Schedule it (Windows Task Scheduler / cron) nightly:
    schtasks /Create /SC DAILY /ST 02:00 /TN SomPrepBackup ^
        /TR "python C:\\path\\to\\backend\\backup_db.py"
"""
import argparse
import datetime
import shutil
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from app.config import settings  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dest", default=str(Path.home() / "SomPrep-DB-Backups"))
    parser.add_argument("--keep", type=int, default=30)
    args = parser.parse_args()

    url = settings.DATABASE_URL
    if not url.startswith("sqlite"):
        print(f"DATABASE_URL is not SQLite ({url.split(':')[0]}) — use your DB server's native backup tool.")
        return 1
    db_path = Path(url.split("sqlite:///")[-1])
    if not db_path.exists():
        print(f"ERROR: database not found at {db_path}")
        return 1

    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = Path(args.dest) / stamp
    dest.mkdir(parents=True, exist_ok=True)

    # 1. Consistent DB snapshot via the SQLite online backup API.
    src = sqlite3.connect(str(db_path))
    dst = sqlite3.connect(str(dest / "somprep.db"))
    with dst:
        src.backup(dst)
    dst.close()
    check = sqlite3.connect(str(dest / "somprep.db"))
    ok = check.execute("PRAGMA integrity_check;").fetchone()[0]
    check.close()
    src.close()
    if ok != "ok":
        print(f"ERROR: backup failed integrity check: {ok}")
        return 1
    print(f"DB backed up -> {dest / 'somprep.db'} (integrity: {ok})")

    # 2. Uploads (receipts, teacher materials, community media).
    for label, directory in (
        ("receipts", settings.receipt_storage_dir),
        ("teacher_materials", settings.teacher_material_storage_dir),
        ("community", settings.community_media_storage_dir),
    ):
        if Path(directory).exists():
            shutil.copytree(directory, dest / label, dirs_exist_ok=True)
            count = sum(1 for _ in (dest / label).rglob("*") if _.is_file())
            print(f"{label}: {count} file(s)")

    # 3. Retention: keep the newest N backups.
    parent = Path(args.dest)
    snapshots = sorted(
        (d for d in parent.iterdir() if d.is_dir() and d.name[:8].isdigit()),
        key=lambda d: d.name,
        reverse=True,
    )
    for old in snapshots[args.keep:]:
        shutil.rmtree(old, ignore_errors=True)
        print(f"pruned old backup: {old.name}")

    print(f"Backup complete: {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
