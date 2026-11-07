import sys
import os

# Add parent directory to system path to import app correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app import models

def seed_tech():
    print("Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_tracks = db.query(models.TechTrack).count()
        if existing_tracks > 0:
            print("Tech tracks already seeded. Deleting and re-seeding...")
            db.query(models.TechEnrollment).delete()
            db.query(models.TechQuizAttempt).delete()
            db.query(models.TechLesson).delete()
            db.query(models.TechTrack).delete()
            db.commit()

        print("Seeding technology tracks...")
        
        # 1. Office Skills Track
        office_track = models.TechTrack(
            name="Office Skills",
            slug="office-skills",
            description="Word, Excel, PowerPoint, typing, and school assignment skills.",
            icon="FileText",
            color="indigo"
        )
        db.add(office_track)
        db.commit()
        db.refresh(office_track)

        office_lessons = [
            ("Introduction to Computer Basics & File Management", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 15),
            ("Microsoft Word: Basic Formatting & Styling", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 20),
            ("Microsoft Word: Tables & Headers for School Reports", "text", None, 10),
            ("Microsoft Excel: Cells, Sheets & Basic Math Formulas", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 25),
            ("Microsoft PowerPoint: Slide Layouts & Presentation Prep", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 18),
            ("Office Skills Practice Quiz", "quiz", None, 15)
        ]
        
        for idx, (title, content_type, url, duration) in enumerate(office_lessons):
            lesson = models.TechLesson(
                track_id=office_track.id,
                title=title,
                order_index=idx,
                content_type=content_type,
                content_url=url,
                duration_minutes=duration
            )
            db.add(lesson)

        # 2. Programming Skills Track
        programming_track = models.TechTrack(
            name="Programming Skills",
            slug="programming-skills",
            description="Python, C, and C++ foundations with practice tasks.",
            icon="Code2",
            color="emerald"
        )
        db.add(programming_track)
        db.commit()
        db.refresh(programming_track)

        programming_lessons = [
            ("Programming Logic & Coding Basics", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 12),
            ("C Syntax: Variables & Basic Input/Output", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 22),
            ("C Control Flow: Loops & Conditional Logic", "text", None, 15),
            ("Introduction to C++ Objects & OOP Principles", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 25),
            ("Python Core: Dynamic Variables & Data Structures", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 18),
            ("Python Control Structures: If-Statements & For-Loops", "text", None, 12),
            ("Python Functions & Modularity", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 20),
            ("Python & C++ Foundation Practice Quiz", "quiz", None, 15)
        ]

        for idx, (title, content_type, url, duration) in enumerate(programming_lessons):
            lesson = models.TechLesson(
                track_id=programming_track.id,
                title=title,
                order_index=idx,
                content_type=content_type,
                content_url=url,
                duration_minutes=duration
            )
            db.add(lesson)

        # 3. Data Analysis Track
        data_track = models.TechTrack(
            name="Data Analysis",
            slug="data-analysis",
            description="Excel, Python, charts, reports, and beginner data projects.",
            icon="BarChart3",
            color="amber"
        )
        db.add(data_track)
        db.commit()
        db.refresh(data_track)

        data_lessons = [
            ("Foundations of Data: Structured vs. Unstructured Data", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 15),
            ("Excel Data Preparation & Cleaning Basics", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 20),
            ("Creating Descriptive Charts & Reports in Excel", "text", None, 15),
            ("Python for Data: Intro to Pandas & NumPy Libraries", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 28),
            ("Plotting & Visualizing Sales Data with Matplotlib", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 22),
            ("Data Analysis Practice Quiz", "quiz", None, 15)
        ]

        for idx, (title, content_type, url, duration) in enumerate(data_lessons):
            lesson = models.TechLesson(
                track_id=data_track.id,
                title=title,
                order_index=idx,
                content_type=content_type,
                content_url=url,
                duration_minutes=duration
            )
            db.add(lesson)

        # 4. Machine Learning Track
        ml_track = models.TechTrack(
            name="Machine Learning",
            slug="machine-learning",
            description="Beginner-friendly ML concepts and simple Python projects.",
            icon="Cpu",
            color="violet"
        )
        db.add(ml_track)
        db.commit()
        db.refresh(ml_track)

        ml_lessons = [
            ("What is Machine Learning? Supervised vs Unsupervised", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 15),
            ("Feature Engineering & Data Scaling for ML Model Inputs", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 20),
            ("The Training and Testing Split Paradigm", "text", None, 10),
            ("Classification Models: Decision Trees & KNN", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 30),
            ("Regression Models: Linear & Logistic Regression Explained", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 25),
            ("Evaluating Model Accuracy: Metrics & Overfitting", "text", None, 15),
            ("Deploying a Simple scikit-learn Predictor Project", "video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 24),
            ("Machine Learning Ethics & Quiz", "quiz", None, 15)
        ]

        for idx, (title, content_type, url, duration) in enumerate(ml_lessons):
            lesson = models.TechLesson(
                track_id=ml_track.id,
                title=title,
                order_index=idx,
                content_type=content_type,
                content_url=url,
                duration_minutes=duration
            )
            db.add(lesson)

        db.commit()
        print("Tech tracks successfully seeded!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding tech tracks: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_tech()
