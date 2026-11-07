"""
Seed script for Technology Skills tracks. Idempotent — safe to re-run.
Usage: python seed_tech.py
"""
from app.database import Base, SessionLocal, engine
from app import models

COURSES = [
    {
        "slug": "office-skills-fundamentals",
        "title": "Office Skills Fundamentals (Word, Excel & PowerPoint)",
        "description": (
            "Practical Microsoft Office skills for Somali students and "
            "professionals: documents, spreadsheets, formulas, and presentations."
        ),
        "track": "office",
        "level": "beginner",
        "lessons": [
            {
                "title": "Getting Started with Microsoft Word",
                "content": (
                    "Learn the Word interface, creating and saving documents, "
                    "formatting text, paragraphs, and using styles for school "
                    "reports and office letters."
                ),
                "order_index": 1,
                "xp_reward": 20,
                "quiz": [
                    {
                        "q": "Which keyboard shortcut saves a document in Microsoft Word?",
                        "a": "Ctrl + S", "b": "Ctrl + P", "c": "Ctrl + V", "d": "Ctrl + B",
                        "correct": "A",
                        "explanation": "Ctrl + S saves the current document.",
                    },
                    {
                        "q": "Which feature keeps headings consistent across a long report?",
                        "a": "WordArt", "b": "Styles", "c": "Clip Art", "d": "Mail Merge",
                        "correct": "B",
                        "explanation": "Styles apply consistent formatting to headings and body text.",
                    },
                ],
            },
            {
                "title": "Excel Basics: Cells, Formulas & SUM",
                "content": (
                    "Understand workbooks, worksheets, and cell references. Use "
                    "basic formulas (=SUM, =AVERAGE) to total marks and budgets."
                ),
                "order_index": 2,
                "xp_reward": 25,
                "quiz": [
                    {
                        "q": "Which formula adds the values in cells A1 to A10?",
                        "a": "=ADD(A1:A10)", "b": "=TOTAL(A1-A10)", "c": "=SUM(A1:A10)", "d": "=PLUS(A1,A10)",
                        "correct": "C",
                        "explanation": "=SUM(A1:A10) adds every value in the range.",
                    },
                    {
                        "q": "What does the cell reference B3 mean?",
                        "a": "Row B, Column 3", "b": "Column B, Row 3", "c": "Sheet B, Page 3", "d": "Table B, Cell 3",
                        "correct": "B",
                        "explanation": "Letters are columns and numbers are rows.",
                    },
                ],
            },
            {
                "title": "PowerPoint: Building Your First Presentation",
                "content": (
                    "Create slides, apply themes, insert images, and present with "
                    "confidence for class projects and business meetings."
                ),
                "order_index": 3,
                "xp_reward": 25,
                "quiz": [
                    {
                        "q": "Which key starts a PowerPoint slideshow from the beginning?",
                        "a": "F5", "b": "F2", "c": "Esc", "d": "Tab",
                        "correct": "A",
                        "explanation": "F5 starts the presentation from the first slide.",
                    },
                ],
            },
        ],
    },
    {
        "slug": "intro-python-programming",
        "title": "Introduction to Programming with Python",
        "description": (
            "First steps in programming for Somali learners: variables, "
            "conditions, loops, and writing your first real Python programs."
        ),
        "track": "programming",
        "level": "beginner",
        "lessons": [
            {
                "title": "What is Programming? Your First Python Program",
                "content": (
                    "Install Python, run the interpreter, and write print('Salaan, "
                    "Adduunyo!') — your first program. Understand what code is and "
                    "how computers execute instructions."
                ),
                "order_index": 1,
                "xp_reward": 20,
                "quiz": [
                    {
                        "q": "Which Python statement prints text to the screen?",
                        "a": "echo('Hello')", "b": "print('Hello')", "c": "show('Hello')", "d": "display('Hello')",
                        "correct": "B",
                        "explanation": "print() is Python's output function.",
                    },
                ],
            },
            {
                "title": "Variables and Data Types",
                "content": (
                    "Store names, numbers, and prices in variables. Learn str, int, "
                    "float, and bool, plus how to convert between them."
                ),
                "order_index": 2,
                "xp_reward": 25,
                "quiz": [
                    {
                        "q": "What is the type of the value 3.14 in Python?",
                        "a": "int", "b": "str", "c": "float", "d": "bool",
                        "correct": "C",
                        "explanation": "Numbers with decimals are floats.",
                    },
                    {
                        "q": "Which is a valid variable name in Python?",
                        "a": "2price", "b": "student_name", "c": "my-name", "d": "class",
                        "correct": "B",
                        "explanation": "Variable names use letters, digits, and underscores, and cannot start with a digit or be a keyword.",
                    },
                ],
            },
            {
                "title": "Conditions and Loops",
                "content": (
                    "Make decisions with if/elif/else and repeat work with for and "
                    "while loops — the building blocks of every real program."
                ),
                "order_index": 3,
                "xp_reward": 30,
                "quiz": [
                    {
                        "q": "How many times does `for i in range(3):` run its body?",
                        "a": "2", "b": "3", "c": "4", "d": "0",
                        "correct": "B",
                        "explanation": "range(3) yields 0, 1, 2 — three iterations.",
                    },
                ],
            },
        ],
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        created = 0
        for spec in COURSES:
            if db.query(models.TechCourse).filter_by(slug=spec["slug"]).first():
                print(f"  - {spec['slug']} already seeded, skipping")
                continue
            course = models.TechCourse(
                slug=spec["slug"], title=spec["title"], description=spec["description"],
                track=spec["track"], level=spec["level"],
            )
            db.add(course)
            db.flush()
            for l in spec["lessons"]:
                lesson = models.TechLesson(
                    course_id=course.id, title=l["title"], content=l["content"],
                    order_index=l["order_index"], xp_reward=l["xp_reward"],
                )
                db.add(lesson)
                db.flush()
                for q in l.get("quiz", []):
                    db.add(models.TechQuizQuestion(
                        lesson_id=lesson.id, question_text=q["q"],
                        option_a=q["a"], option_b=q["b"], option_c=q["c"], option_d=q["d"],
                        correct_option=q["correct"], explanation=q.get("explanation"),
                    ))
            created += 1
            print(f"  + seeded course: {course.title}")
        db.commit()
        print(f"Done. {created} new course(s) created.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
