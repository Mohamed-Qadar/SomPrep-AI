import sys
import os
import datetime
import json

# Add parent directory to system path to import app correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app import models
from app.utils.auth import get_password_hash


def seed_database(reset: bool = False):
    if reset:
        print("Reset requested. Dropping existing tables for a clean slate...")
        Base.metadata.drop_all(bind=engine)
    else:
        print("Safe seed mode enabled. Existing data will not be deleted.")

    print("Creating any missing tables from database schema...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        existing_user_count = db.query(models.User).count()
        if existing_user_count and not reset:
            print("Database already contains users. Skipping seed. Re-run with --reset to rebuild sample data.")
            return

        # 1. SEED EDUCATION LEVELS
        print("Seeding education levels...")
        primary_level = models.EducationLevel(name_en="Primary School", name_so="Dugsiga Hoose", order=1)
        middle_level = models.EducationLevel(name_en="Middle School", name_so="Dugsiga Dhexe", order=2)
        secondary_level = models.EducationLevel(name_en="Secondary School", name_so="Dugsiga Sare", order=3)
        db.add_all([primary_level, middle_level, secondary_level])
        db.commit()
        db.refresh(primary_level)
        db.refresh(middle_level)
        db.refresh(secondary_level)

        # 2. SEED GRADES
        print("Seeding grades 1-12...")
        grades_map = {}
        for g_num in range(1, 13):
            if g_num <= 6:
                level_id = primary_level.id
            elif g_num <= 8:
                level_id = middle_level.id
            else:
                level_id = secondary_level.id
            
            grade = models.Grade(
                level_id=level_id,
                name=f"Grade {g_num}" if g_num != 8 and g_num != 12 else (f"Grade {g_num} (Form 4)" if g_num == 12 else f"Grade {g_num} (Form 2)"),
                number=g_num,
                order=g_num
            )
            db.add(grade)
            db.commit()
            db.refresh(grade)
            grades_map[g_num] = grade

        # 3. SEED REGION OR EXAM TRACKS
        print("Seeding regional exam tracks...")
        fed_track = models.RegionOrExamTrack(name="Federal Board", type="federal")
        pl_track = models.RegionOrExamTrack(name="Puntland Board", type="state")
        sl_track = models.RegionOrExamTrack(name="Somaliland Board", type="state")
        db.add_all([fed_track, pl_track, sl_track])
        db.commit()

        # 4. SEED SUBSCRIPTION PLANS
        print("Seeding subscription plans...")
        plan_primary = models.SubscriptionPlan(
            name="Primary Prep Bundle",
            grade_range="1-6",
            price=2.50,
            duration_months=12,
            features="Access to primary school courses, worksheets, and mini-games."
        )
        plan_middle = models.SubscriptionPlan(
            name="Middle Prep Bundle",
            grade_range="7-8",
            price=2.50,
            duration_months=12,
            features="Access to Grade 8 regional/state exam simulations, subject roadmap, and AI progress tools."
        )
        plan_secondary = models.SubscriptionPlan(
            name="Secondary Prep Bundle",
            grade_range="9-12",
            price=2.50,
            duration_months=12,
            features="Full access to Grade 12 National Exam blueprints, subject roadmap, video lectures, and AI coach Coach Refik."
        )
        db.add_all([plan_primary, plan_middle, plan_secondary])
        db.commit()
        db.refresh(plan_primary)
        db.refresh(plan_middle)
        db.refresh(plan_secondary)

        # 5. SEED SCHOOLS
        print("Seeding school options...")
        school_mog = models.School(name="Mogadishu Premier Academy", region="Federal")
        school_gar = models.School(name="Garowe Secondary School", region="Puntland")
        school_har = models.School(name="Hargeisa Science High School", region="Somaliland")
        db.add_all([school_mog, school_gar, school_har])
        db.commit()
        db.refresh(school_mog)
        db.refresh(school_gar)
        db.refresh(school_har)

        # 6. SEED CLASSROOMS
        print("Seeding classrooms...")
        class_mog_12 = models.Classroom(school_id=school_mog.id, grade_id=grades_map[12].id, name="Form 4A Science")
        class_gar_8 = models.Classroom(school_id=school_gar.id, grade_id=grades_map[8].id, name="Grade 8 Blue")
        db.add_all([class_mog_12, class_gar_8])
        db.commit()
        db.refresh(class_mog_12)
        db.refresh(class_gar_8)

        # 7. SEED USERS
        print("Seeding default system users...")
        users_to_seed = [
            {
                "phone_number": "+252611111111",
                "full_name": "SomPrep Admin",
                "role": "admin",
                "password": "admin123",
                "selected_region": "Federal",
                "grade_level": 12,
                "education_level": "Secondary",
                "learning_goal": "System Administration"
            },
            {
                "phone_number": "+252612222222",
                "full_name": "Dr. Mohamed Farah",
                "role": "teacher",
                "password": "teacher123",
                "selected_region": "Federal",
                "grade_level": 12,
                "education_level": "Secondary",
                "learning_goal": "Teach Physics and Chemistry"
            },
            {
                "phone_number": "+252613333333",
                "full_name": "Abdirahman Warsame",
                "role": "student",
                "password": "student123",
                "selected_region": "Federal",
                "grade_level": 12,
                "education_level": "Secondary",
                "learning_goal": "Grade 12 National Exam Prep"
            },
            {
                "phone_number": "+252614444444",
                "full_name": "Halima Ali",
                "role": "student",
                "password": "student123",
                "selected_region": "Puntland",
                "grade_level": 8,
                "education_level": "Middle",
                "learning_goal": "Grade 8 Regional Exam Prep"
            },
            {
                "phone_number": "+252615555555",
                "full_name": "Faisal Omar",
                "role": "student",
                "password": "student123",
                "selected_region": "Somaliland",
                "grade_level": 4,
                "education_level": "Primary",
                "learning_goal": "Daily Learning & Arithmetic"
            }
        ]

        users_map = {}
        for u_data in users_to_seed:
            hashed_pwd = get_password_hash(u_data["password"])
            user = models.User(
                phone_number=u_data["phone_number"],
                full_name=u_data["full_name"],
                role=u_data["role"],
                hashed_password=hashed_pwd,
                selected_region=u_data["selected_region"],
                grade_level=u_data["grade_level"],
                education_level=u_data["education_level"],
                learning_goal=u_data["learning_goal"],
                current_streak=3,
                total_xp_points=420
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            users_map[u_data["phone_number"]] = user
            print(f"Created user {user.full_name} ({user.role})")

        # Add active subscriptions for students
        for phone in ["+252613333333", "+252614444444", "+252615555555"]:
            student = users_map[phone]
            student.package_type = "Secondary School Prep Bundle"
            student.package_paid_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
            student.package_expires_at = student.package_paid_at + datetime.timedelta(days=365)
            db.add(student)
            
            sub = models.UserSubscription(
                user_id=student.id,
                status="active",
                expires_at=student.package_expires_at,
                transaction_id=f"TXN-SEED-{student.id}",
                price_paid=2.50
            )
            db.add(sub)
        db.commit()

        # 8. SEED TEACHER ASSIGNMENT
        print("Seeding teacher assignment...")
        teacher = users_map["+252612222222"]
        assignment = models.TeacherAssignment(
            teacher_id=teacher.id,
            classroom_id=class_mog_12.id,
            subject_id=1 # Will align with subject seeding below
        )
        db.add(assignment)
        db.commit()

        # 9. SEED VOUCHERS
        print("Seeding voucher codes for Mobile Money / School redemption...")
        vouchers = [
            models.Voucher(code="EVC-2026-OK", plan_id=plan_secondary.id, school_id=school_mog.id, status="active"),
            models.Voucher(code="SOMPREP-VOL-1", plan_id=plan_secondary.id, status="active"),
            models.Voucher(code="SOMPREP-VOL-2", plan_id=plan_middle.id, status="active"),
            models.Voucher(code="FREE-TRIAL", plan_id=plan_primary.id, status="active"),
        ]
        db.add_all(vouchers)
        db.commit()

        # 10. SEED SUBJECTS (for G8 & G12 curriculum)
        print("Seeding curriculum subjects...")
        subjects_data = [
            # Grade 12 Subjects
            {"grade_num": 12, "name_en": "Physics", "name_so": "Fiisigis", "category": "Sciences", "icon": "atom", "order": 1},
            {"grade_num": 12, "name_en": "Chemistry", "name_so": "Kimiko", "category": "Sciences", "icon": "flame", "order": 2},
            {"grade_num": 12, "name_en": "Biology", "name_so": "Bayooloji", "category": "Sciences", "icon": "dna", "order": 3},
            {"grade_num": 12, "name_en": "Mathematics", "name_so": "Xisaab", "category": "Mathematics", "icon": "binary", "order": 4},
            {"grade_num": 12, "name_en": "English", "name_so": "Ingiriisi", "category": "Languages", "icon": "book-open", "order": 5},
            {"grade_num": 12, "name_en": "Somali Language", "name_so": "Af-Soomaali", "category": "Languages", "icon": "feather", "order": 6},
            # Grade 8 Subjects
            {"grade_num": 8, "name_en": "General Science", "name_so": "Sayniska Guud", "category": "Sciences", "icon": "atom", "order": 1},
            {"grade_num": 8, "name_en": "Mathematics", "name_so": "Xisaab", "category": "Mathematics", "icon": "calculator", "order": 2},
            {"grade_num": 8, "name_en": "English", "name_so": "Ingiriisi", "category": "Languages", "icon": "book-open", "order": 3},
            {"grade_num": 8, "name_en": "Somali Language", "name_so": "Af-Soomaali", "category": "Languages", "icon": "feather", "order": 4},
        ]
        subjects_map = {}
        for s_data in subjects_data:
            grade_obj = grades_map[s_data["grade_num"]]
            subject = models.Subject(
                grade_id=grade_obj.id,
                name_en=s_data["name_en"],
                name_so=s_data["name_so"],
                category=s_data["category"],
                icon=s_data["icon"],
                order=s_data["order"]
            )
            db.add(subject)
            db.commit()
            db.refresh(subject)
            subjects_map[f"G{s_data['grade_num']} {s_data['name_en']}"] = subject

        # 11. SEED UNITS
        print("Seeding study units...")
        units_data = [
            {"subject_key": "G12 Physics", "title": "Unit 1: Mechanics & Newton's Laws", "order": 1},
            {"subject_key": "G12 Physics", "title": "Unit 2: Electrostatics & Fields", "order": 2},
            {"subject_key": "G12 Mathematics", "title": "Unit 1: Limits & Derivatives", "order": 1},
            {"subject_key": "G8 General Science", "title": "Cutubka 1aad: Hab-dhiska Neefsashada", "order": 1},
            {"subject_key": "G8 Mathematics", "title": "Cutubka 1aad: Isle'egyada Toosan", "order": 1},
        ]
        for u_data in units_data:
            subj = subjects_map[u_data["subject_key"]]
            unit = models.Unit(
                subject_id=subj.id,
                title=u_data["title"],
                order=u_data["order"]
            )
            db.add(unit)
        db.commit()

        # 12. SEED EXAM BLUEPRINTS
        print("Seeding exam blueprints for auto-generation...")
        blueprints = [
            models.ExamBlueprint(
                grade_id=grades_map[12].id,
                subject_id=subjects_map["G12 Physics"].id,
                exam_type="subject_mock",
                duration_minutes=60,
                question_count=10,
                difficulty_distribution=json.dumps({"easy": 0.4, "medium": 0.4, "hard": 0.2}),
                topic_distribution=json.dumps({"Mechanics": 6, "Electromagnetism": 4})
            ),
            models.ExamBlueprint(
                grade_id=grades_map[12].id,
                exam_type="full_mock",
                duration_minutes=120,
                question_count=15,
                difficulty_distribution=json.dumps({"easy": 0.3, "medium": 0.5, "hard": 0.2}),
                topic_distribution=json.dumps({"Physics": 5, "Chemistry": 5, "Biology": 5})
            ),
            models.ExamBlueprint(
                grade_id=grades_map[8].id,
                exam_type="full_mock",
                duration_minutes=90,
                question_count=10,
                difficulty_distribution=json.dumps({"easy": 0.5, "medium": 0.4, "hard": 0.1})
            )
        ]
        db.add_all(blueprints)
        db.commit()

        # 13. SEED ROADMAP CATEGORIES (Matches UI expectations)
        print("Seeding categories for Konu Agaci roadmap...")
        categories_to_seed = [
            {
                "name": "Grade 12 Physics",
                "description": "Advanced Physics curriculum (Mechanics, Waves, Electromagnetism) preparing for national exams.",
                "icon_slug": "atom",
                "grade_level": 12,
                "regional_board": "Federal"
            },
            {
                "name": "Grade 12 Chemistry",
                "description": "Organic, Inorganic and Physical Chemistry for form 4 students.",
                "icon_slug": "flame",
                "grade_level": 12,
                "regional_board": "Federal"
            },
            {
                "name": "Grade 12 Biology",
                "description": "Human anatomy, Genetics, and Plant physiology.",
                "icon_slug": "dna",
                "grade_level": 12,
                "regional_board": "Federal"
            },
            {
                "name": "Grade 12 Mathematics",
                "description": "Calculus, algebra, and probability theory.",
                "icon_slug": "binary",
                "grade_level": 12,
                "regional_board": "Federal"
            },
            {
                "name": "Grade 12 Somali Language",
                "description": "Somali grammar, literature, and essay composition.",
                "icon_slug": "feather",
                "grade_level": 12,
                "regional_board": "Federal"
            },
            {
                "name": "Xisaab Grade 8",
                "description": "Xisaabta fasalka 8aad ee dugsiga dhexe: joomatari iyo aljebra.",
                "icon_slug": "binary",
                "grade_level": 8,
                "regional_board": "Puntland"
            },
            {
                "name": "Saynis Grade 8",
                "description": "Sayniska guud ee fasalka 8aad (bayooloji, kimiko, iyo fiisigis).",
                "icon_slug": "atom",
                "grade_level": 8,
                "regional_board": "Puntland"
            }
        ]

        category_map = {}
        for cat_data in categories_to_seed:
            cat = models.Category(
                name=cat_data["name"],
                description=cat_data["description"],
                icon_slug=cat_data["icon_slug"],
                grade_level=cat_data["grade_level"],
                regional_board=cat_data["regional_board"]
            )
            db.add(cat)
            db.commit()
            db.refresh(cat)
            category_map[cat_data["name"]] = cat
            print(f"Created Category: {cat.name}")

        # 14. SEED TOPICS
        print("Seeding topic group folders...")
        topics_to_seed = [
            {"category_name": "Grade 12 Physics", "name": "Mechanics & Forces", "order_index": 1},
            {"category_name": "Grade 12 Physics", "name": "Electromagnetism", "order_index": 2},
            {"category_name": "Grade 12 Mathematics", "name": "Calculus Core", "order_index": 1},
            {"category_name": "Grade 12 Chemistry", "name": "Organic Compounds", "order_index": 1},
            {"category_name": "Grade 12 Biology", "name": "Cellular Biology", "order_index": 1},
            {"category_name": "Grade 12 Somali Language", "name": "Maahmaahyo & Naxwe", "order_index": 1},
            {"category_name": "Xisaab Grade 8", "name": "Aljebra & Isle'egyada", "order_index": 1},
            {"category_name": "Saynis Grade 8", "name": "Noolaha iyo Deegaanka", "order_index": 1},
        ]

        topic_map = {}
        for t_data in topics_to_seed:
            cat = category_map[t_data["category_name"]]
            topic = models.Topic(
                category_id=cat.id,
                name=t_data["name"],
                order_index=t_data["order_index"]
            )
            db.add(topic)
            db.commit()
            db.refresh(topic)
            topic_map[f"{t_data['category_name']} -> {t_data['name']}"] = topic
            print(f"Created Topic: {topic.name} under {cat.name}")

        # 15. SEED SUBTOPICS (Concept Tree roadmap nodes)
        print("Seeding subtopics...")
        subtopics_to_seed = [
            # Physics Subtopics
            {
                "topic_key": "Grade 12 Physics -> Mechanics & Forces",
                "category_name": "Grade 12 Physics",
                "name": "Newton's Laws of Motion",
                "order_index": 1,
                "icon_slug": "arrow-up-right",
                "prerequisite": None
            },
            {
                "topic_key": "Grade 12 Physics -> Mechanics & Forces",
                "category_name": "Grade 12 Physics",
                "name": "Work, Energy & Power",
                "order_index": 2,
                "icon_slug": "battery-charging",
                "prerequisite": "Newton's Laws of Motion"
            },
            {
                "topic_key": "Grade 12 Physics -> Electromagnetism",
                "category_name": "Grade 12 Physics",
                "name": "Magnetic Fields",
                "order_index": 1,
                "icon_slug": "magnet",
                "prerequisite": None
            },
            # Math Calculus Subtopics
            {
                "topic_key": "Grade 12 Mathematics -> Calculus Core",
                "category_name": "Grade 12 Mathematics",
                "name": "Limits & Continuity",
                "order_index": 1,
                "icon_slug": "trending-up",
                "prerequisite": None
            },
            {
                "topic_key": "Grade 12 Mathematics -> Calculus Core",
                "category_name": "Grade 12 Mathematics",
                "name": "Derivatives",
                "order_index": 2,
                "icon_slug": "activity",
                "prerequisite": "Limits & Continuity"
            },
            # G12 Chemistry Subtopics
            {
                "topic_key": "Grade 12 Chemistry -> Organic Compounds",
                "category_name": "Grade 12 Chemistry",
                "name": "Hydrocarbons",
                "order_index": 1,
                "icon_slug": "droplet",
                "prerequisite": None
            },
            # G12 Biology Subtopics
            {
                "topic_key": "Grade 12 Biology -> Cellular Biology",
                "category_name": "Grade 12 Biology",
                "name": "Cell Organelles",
                "order_index": 1,
                "icon_slug": "dna",
                "prerequisite": None
            },
            # Somali Language
            {
                "topic_key": "Grade 12 Somali Language -> Maahmaahyo & Naxwe",
                "category_name": "Grade 12 Somali Language",
                "name": "Grammar Structure & Poetry",
                "order_index": 1,
                "icon_slug": "book-open",
                "prerequisite": None
            },
            # Grade 8 Somali math subtopics
            {
                "topic_key": "Xisaab Grade 8 -> Aljebra & Isle'egyada",
                "category_name": "Xisaab Grade 8",
                "name": "Isle'egyada Toosan (Linear Equations)",
                "order_index": 1,
                "icon_slug": "plus-minus",
                "prerequisite": None
            },
            # Grade 8 Somali saynis subtopics
            {
                "topic_key": "Saynis Grade 8 -> Noolaha iyo Deegaanka",
                "category_name": "Saynis Grade 8",
                "name": "Hab-dhiska Neefsashada (Respiratory System)",
                "order_index": 1,
                "icon_slug": "wind",
                "prerequisite": None
            }
        ]

        subtopic_map = {}
        for s_data in subtopics_to_seed:
            topic = topic_map[s_data["topic_key"]]
            cat = category_map[s_data["category_name"]]
            sub = models.SubTopic(
                category_id=cat.id,
                topic_id=topic.id,
                name=s_data["name"],
                order_index=s_data["order_index"],
                icon_slug=s_data["icon_slug"]
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)
            subtopic_map[s_data["name"]] = sub

        # Set prerequisites where needed
        for s_data in subtopics_to_seed:
            if s_data["prerequisite"]:
                sub = subtopic_map[s_data["name"]]
                prereq_sub = subtopic_map[s_data["prerequisite"]]
                sub.prerequisite_subtopic_id = prereq_sub.id
                db.commit()
                print(f"Set prerequisite: {sub.name} requires {prereq_sub.name}")

        # 16. SEED VIDEO LESSONS (At least 3 lessons)
        print("Seeding video lectures...")
        videos_data = [
            {
                "subtopic_name": "Newton's Laws of Motion",
                "title": "Casharka 1aad: Newton's First Law of Motion",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                "duration": 65,
                "order_index": 1
            },
            {
                "subtopic_name": "Derivatives",
                "title": "Derivative Concept & Power Rule Walkthrough",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                "duration": 90,
                "order_index": 1
            },
            {
                "subtopic_name": "Isle'egyada Toosan (Linear Equations)",
                "title": "Isle'eg Toosan iyo Sida loo Xalliyo (Grade 8)",
                "video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
                "duration": 45,
                "order_index": 1
            }
        ]

        for v_data in videos_data:
            sub = subtopic_map[v_data["subtopic_name"]]
            video = models.VideoLesson(
                subtopic_id=sub.id,
                title=v_data["title"],
                video_url=v_data["video_url"],
                duration=v_data["duration"],
                order_index=v_data["order_index"]
            )
            db.add(video)
            db.commit()
            print(f"Seeded Video Lecture: {video.title}")

        # 17. SEED PRACTICE QUESTIONS (At least 20 questions)
        print("Seeding exam simulation questions & answer options...")
        questions_data = [
            # G12 Physics (Newton's Laws)
            {
                "subtopic": "Newton's Laws of Motion",
                "text": "What is the net force acting on a 5kg block accelerating at 4 m/s^2?",
                "explanation": "Newton's Second Law states F = ma. Here, m = 5kg, a = 4 m/s^2. Thus, F = 5 * 4 = 20 N.",
                "difficulty": "easy",
                "reflex": "Newton's Second Law F=ma -> Substitute mass and acceleration values",
                "choices": [
                    {"text": "20 N", "is_correct": True},
                    {"text": "9 N", "is_correct": False},
                    {"text": "1.25 N", "is_correct": False},
                    {"text": "15 N", "is_correct": False}
                ]
            },
            {
                "subtopic": "Newton's Laws of Motion",
                "text": "An object maintains constant velocity unless acted upon by an external net force. Which law is this?",
                "explanation": "This statement describes Newton's First Law of Motion, also known as the Law of Inertia.",
                "difficulty": "easy",
                "reflex": "Match state of rest/motion continuity to Newton's First Law",
                "choices": [
                    {"text": "Newton's First Law", "is_correct": True},
                    {"text": "Newton's Second Law", "is_correct": False},
                    {"text": "Newton's Third Law", "is_correct": False},
                    {"text": "Law of Gravitation", "is_correct": False}
                ]
            },
            {
                "subtopic": "Newton's Laws of Motion",
                "text": "A swimmer pushes back on the water, and the water pushes the swimmer forward. Which law applies?",
                "explanation": "Newton's Third Law: For every action, there is an equal and opposite reaction.",
                "difficulty": "medium",
                "reflex": "Identify action-reaction force pair -> Match to Third Law",
                "choices": [
                    {"text": "Newton's Third Law", "is_correct": True},
                    {"text": "Newton's First Law", "is_correct": False},
                    {"text": "Newton's Second Law", "is_correct": False},
                    {"text": "Conservation of Energy", "is_correct": False}
                ]
            },
            # G12 Physics (Work & Energy)
            {
                "subtopic": "Work, Energy & Power",
                "text": "A 10kg mass is lifted vertically by 3 meters. What is the potential energy gained? (g = 10 m/s^2)",
                "explanation": "Potential energy PE = mgh. Here, m = 10kg, g = 10 m/s^2, h = 3m. PE = 10 * 10 * 3 = 300 Joules.",
                "difficulty": "easy",
                "reflex": "Recall potential energy formula mgh -> Multiply weight and height",
                "choices": [
                    {"text": "300 Joules", "is_correct": True},
                    {"text": "30 Joules", "is_correct": False},
                    {"text": "100 Joules", "is_correct": False},
                    {"text": "33 Joules", "is_correct": False}
                ]
            },
            {
                "subtopic": "Work, Energy & Power",
                "text": "A machine does 600 Joules of work in 20 seconds. What is its power output?",
                "explanation": "Power is Work done divided by time: P = W / t = 600 / 20 = 30 Watts.",
                "difficulty": "medium",
                "reflex": "Recall Power = Work / Time -> Divide 600 by 20",
                "choices": [
                    {"text": "30 Watts", "is_correct": True},
                    {"text": "12,000 Watts", "is_correct": False},
                    {"text": "120 Watts", "is_correct": False},
                    {"text": "3 Watts", "is_correct": False}
                ]
            },
            # G12 Math (Limits)
            {
                "subtopic": "Limits & Continuity",
                "text": "Find the limit as x approaches 3 of: (x^2 - 9) / (x - 3)",
                "explanation": "Factor the numerator: x^2 - 9 = (x-3)(x+3). Cancel the (x-3) terms: limit as x approaches 3 of (x+3) = 3 + 3 = 6.",
                "difficulty": "medium",
                "reflex": "Factor algebraic expressions to resolve 0/0 indeterminate limit",
                "choices": [
                    {"text": "6", "is_correct": True},
                    {"text": "0", "is_correct": False},
                    {"text": "Undefined", "is_correct": False},
                    {"text": "3", "is_correct": False}
                ]
            },
            {
                "subtopic": "Limits & Continuity",
                "text": "What is the limit of 1/x as x approaches infinity?",
                "explanation": "As x grows arbitrarily large, 1 divided by x approaches 0.",
                "difficulty": "easy",
                "reflex": "Evaluate limit of reciprocal function at infinity",
                "choices": [
                    {"text": "0", "is_correct": True},
                    {"text": "1", "is_correct": False},
                    {"text": "Infinity", "is_correct": False},
                    {"text": "Undefined", "is_correct": False}
                ]
            },
            # G12 Math (Derivatives)
            {
                "subtopic": "Derivatives",
                "text": "What is the derivative of y = x^2 with respect to x?",
                "explanation": "Using the Power Rule: d/dx(x^n) = n * x^(n-1). For x^2, the derivative is 2x.",
                "difficulty": "easy",
                "reflex": "Recall derivative Power Rule -> Bring down exponent and decrease power",
                "choices": [
                    {"text": "2x", "is_correct": True},
                    {"text": "x", "is_correct": False},
                    {"text": "2", "is_correct": False},
                    {"text": "x^3 / 3", "is_correct": False}
                ]
            },
            {
                "subtopic": "Derivatives",
                "text": "What is the derivative of a constant term (like y = 5) with respect to x?",
                "explanation": "A constant function has a rate of change of 0. Thus, its derivative is always 0.",
                "difficulty": "easy",
                "reflex": "Differentiate a constant -> Return zero",
                "choices": [
                    {"text": "0", "is_correct": True},
                    {"text": "5", "is_correct": False},
                    {"text": "1", "is_correct": False},
                    {"text": "5x", "is_correct": False}
                ]
            },
            # G12 Chemistry
            {
                "subtopic": "Hydrocarbons",
                "text": "Which of the following is the general formula for Alkanes?",
                "explanation": "Alkanes are saturated hydrocarbons with the general formula CnH2n+2.",
                "difficulty": "medium",
                "reflex": "Distinguish formulas for Alkanes, Alkenes, and Alkynes",
                "choices": [
                    {"text": "CnH2n+2", "is_correct": True},
                    {"text": "CnH2n", "is_correct": False},
                    {"text": "CnH2n-2", "is_correct": False},
                    {"text": "CnHn", "is_correct": False}
                ]
            },
            {
                "subtopic": "Hydrocarbons",
                "text": "What is the name of the simplest alkane containing only one carbon atom?",
                "explanation": "Methane (CH4) is the simplest alkane with one carbon atom.",
                "difficulty": "easy",
                "reflex": "Identify IUPAC name for 1-carbon alkane",
                "choices": [
                    {"text": "Methane", "is_correct": True},
                    {"text": "Ethane", "is_correct": False},
                    {"text": "Propane", "is_correct": False},
                    {"text": "Butane", "is_correct": False}
                ]
            },
            # G12 Biology
            {
                "subtopic": "Cell Organelles",
                "text": "Which organelle is known as the powerhouse of the cell?",
                "explanation": "The Mitochondria produces energy through cellular respiration, earning the name 'powerhouse'.",
                "difficulty": "easy",
                "reflex": "Link energy production / ATP synthesis to Mitochondria",
                "choices": [
                    {"text": "Mitochondria", "is_correct": True},
                    {"text": "Nucleus", "is_correct": False},
                    {"text": "Ribosome", "is_correct": False},
                    {"text": "Golgi Apparatus", "is_correct": False}
                ]
            },
            {
                "subtopic": "Cell Organelles",
                "text": "What is the primary function of Ribosomes inside a cell?",
                "explanation": "Ribosomes are responsible for protein synthesis by linking amino acids.",
                "difficulty": "medium",
                "reflex": "Link ribosomal machinery to protein synthesis",
                "choices": [
                    {"text": "Protein synthesis", "is_correct": True},
                    {"text": "Lipid storage", "is_correct": False},
                    {"text": "Waste disposal", "is_correct": False},
                    {"text": "Photosynthesis", "is_correct": False}
                ]
            },
            # G12 Somali
            {
                "subtopic": "Grammar Structure & Poetry",
                "text": "Waa maxay qaybta hadalka ee beddesha magaca?",
                "explanation": "Magac u yaalka (Pronoun) wuxuu beddelaa magaca si looga baaqsado ku-celcelin.",
                "difficulty": "easy",
                "reflex": "Garsoorka magac-u-yaalka naxwaha Af-Soomaaliga",
                "choices": [
                    {"text": "Magac u yaal", "is_correct": True},
                    {"text": "Fal", "is_correct": False},
                    {"text": "Sifo", "is_correct": False},
                    {"text": "Xiriiriye", "is_correct": False}
                ]
            },
            {
                "subtopic": "Grammar Structure & Poetry",
                "text": "Dhammaystir maahmaahdan: 'Aqal arkaba...'",
                "explanation": "Maahmaahdu waxay u dhacdaa: 'Aqal arkaba dhiilna waa la geeyaa, wadaad arkaba duco waa la weyddiistaa.'",
                "difficulty": "medium",
                "reflex": "Dhammaystirka odhaahyada iyo maahmaahda caanka ah",
                "choices": [
                    {"text": "wadaad arkaba duco waa la weyddiistaa", "is_correct": True},
                    {"text": "nin arkaba nabad baa la siiyaa", "is_correct": False},
                    {"text": "col arkaba hub baa la qaataa", "is_correct": False},
                    {"text": "geel arkaba caano baa la shubaa", "is_correct": False}
                ]
            },
            # Grade 8 Math
            {
                "subtopic": "Isle'egyada Toosan (Linear Equations)",
                "text": "Xal u hel x: 3x - 7 = 11",
                "explanation": "Ku dar 7 labada dhinac: 3x = 18. Labada dhinac u qaybi 3: x = 6.",
                "difficulty": "easy",
                "reflex": "Isolating variables -> Perform inverse operation to find solution",
                "choices": [
                    {"text": "x = 6", "is_correct": True},
                    {"text": "x = 4", "is_correct": False},
                    {"text": "x = 8", "is_correct": False},
                    {"text": "x = 5", "is_correct": False}
                ]
            },
            {
                "subtopic": "Isle'egyada Toosan (Linear Equations)",
                "text": "Xalliso x: 2x = 10",
                "explanation": "Qaybi labada dhinac 2: x = 5.",
                "difficulty": "easy",
                "reflex": "Qaybinta isle'egta toosan",
                "choices": [
                    {"text": "x = 5", "is_correct": True},
                    {"text": "x = 2", "is_correct": False},
                    {"text": "x = 20", "is_correct": False},
                    {"text": "x = 8", "is_correct": False}
                ]
            },
            # Grade 8 General Science
            {
                "subtopic": "Hab-dhiska Neefsashada (Respiratory System)",
                "text": "Waa kuwee xubnaha ugu muhiimsan hab-dhiska neefsashada bini'aadamka?",
                "explanation": "Sambabada (Lungs) waa xubinta ugu muhiimsan ee sarrifka hawada ka dhaco.",
                "difficulty": "easy",
                "reflex": "Aqoonsiga xubnaha neefsashada",
                "choices": [
                    {"text": "Sambabada", "is_correct": True},
                    {"text": "Wadnaha", "is_correct": False},
                    {"text": "Kelyaha", "is_correct": False},
                    {"text": "Beerka", "is_correct": False}
                ]
            },
            {
                "subtopic": "Hab-dhiska Neefsashada (Respiratory System)",
                "text": "Waa kuwee gaaska uu jidhku qaato marka aynu neefsanayno?",
                "explanation": "Jidhku wuxuu u baahan yahay Ogsajiin (Oxygen) neefsashada dhexdeeda.",
                "difficulty": "easy",
                "reflex": "Gaaska sarrifka hawada ee sambabada",
                "choices": [
                    {"text": "Ogsajiin", "is_correct": True},
                    {"text": "Kaarboon laba-oksaydh", "is_correct": False},
                    {"text": "Naytarijin", "is_correct": False},
                    {"text": "Haydarojiin", "is_correct": False}
                ]
            },
            # Chemistry pending review
            {
                "subtopic": "Hydrocarbons",
                "text": "[DRAFT] Which hydrocarbon has a double bond?",
                "explanation": "Alkenes contain at least one carbon-carbon double bond.",
                "difficulty": "hard",
                "reflex": "Identify functional group double bonds as Alkenes",
                "status": "pending_review",
                "choices": [
                    {"text": "Alkene", "is_correct": True},
                    {"text": "Alkane", "is_correct": False},
                    {"text": "Alkyne", "is_correct": False},
                    {"text": "Alcohol", "is_correct": False}
                ]
            }
        ]

        question_obj_map = {}
        for q_data in questions_data:
            sub = subtopic_map[q_data["subtopic"]]
            q = models.Question(
                subtopic_id=sub.id,
                question_text=q_data["text"],
                explanation_text=q_data["explanation"],
                difficulty_level=q_data["difficulty"],
                reflex_step_title=q_data["reflex"],
                review_status=q_data.get("status", "approved")
            )
            db.add(q)
            db.commit()
            db.refresh(q)
            question_obj_map[q_data["text"]] = q

            for choice_data in q_data["choices"]:
                c = models.Choice(
                    question_id=q.id,
                    choice_text=choice_data["text"],
                    is_correct=choice_data["is_correct"]
                )
                db.add(c)
            db.commit()

        print(f"Seeded {len(questions_data)} curriculum questions successfully!")

        # 18. SEED MOCK EXAMS (At least 3 mock exams)
        print("Seeding full trial mock exams...")
        mock1 = models.MockExam(
            title="Form 4 Secondary Unified Physics Trial Exam",
            regional_board="Federal",
            grade_level=12,
            duration_minutes=120
        )
        mock2 = models.MockExam(
            title="Form 4 Secondary Unified Math Trial Exam",
            regional_board="Federal",
            grade_level=12,
            duration_minutes=120
        )
        mock3 = models.MockExam(
            title="Grade 8 Middle General Science Regional Trial Exam",
            regional_board="Puntland",
            grade_level=8,
            duration_minutes=90
        )
        db.add_all([mock1, mock2, mock3])
        db.commit()
        db.refresh(mock1)
        db.refresh(mock2)
        db.refresh(mock3)

        # Link questions to mock exams
        for q_text, q in question_obj_map.items():
            if q.subtopic.name == "Newton's Laws of Motion" or q.subtopic.name == "Work, Energy & Power":
                q.mock_exam_id = mock1.id
            elif q.subtopic.name == "Limits & Continuity" or q.subtopic.name == "Derivatives":
                q.mock_exam_id = mock2.id
            elif q.subtopic.name == "Hab-dhiska Neefsashada (Respiratory System)" or q.subtopic.name == "Isle'egyada Toosan (Linear Equations)":
                q.mock_exam_id = mock3.id
        db.commit()
        print("Linked seeded questions to mock exams.")

        # 19. SEED EXAM ATTEMPTS, ANSWER RECORDS, AND WEAKNESS REPORTS (For student user)
        # Abdirahman Warsame (student for Grade 12) id
        student_user = users_map["+252613333333"]

        print("Simulating historical attempts for Abdirahman (Grade 12)...")
        # Attempt 1: Subtopic exam on Newton's Laws (Score: 66.6% - Fail/Weak)
        attempt1 = models.ExamAttempt(
            user_id=student_user.id,
            subtopic_id=subtopic_map["Newton's Laws of Motion"].id,
            mock_exam_id=None,
            score=66.6,
            total_questions=3,
            correct_answers=2,
            wrong_answers=1,
            time_spent_seconds=180,
            ai_insight="Abdirahman needs to focus on action-reaction force matching rules inside Newton's Third Law."
        )
        db.add(attempt1)
        db.commit()
        db.refresh(attempt1)

        # Retrieve questions in Newton's Laws to create AnswerRecords
        q_newton = db.query(models.Question).filter(models.Question.subtopic_id == subtopic_map["Newton's Laws of Motion"].id).all()
        for idx, q in enumerate(q_newton):
            choices = db.query(models.Choice).filter(models.Choice.question_id == q.id).all()
            correct_choice = next(c for c in choices if c.is_correct)
            wrong_choice = next(c for c in choices if not c.is_correct)
            
            # Make first 2 correct, last 1 wrong
            is_correct = idx < 2
            selected = correct_choice.choice_text if is_correct else wrong_choice.choice_text
            
            rec = models.AnswerRecord(
                attempt_id=attempt1.id,
                question_id=q.id,
                selected_answer=selected,
                is_correct=is_correct,
                time_spent_seconds=60
            )
            db.add(rec)
        db.commit()

        # Attempt 2: Subtopic exam on Work & Power (Score: 100% - Pass)
        attempt2 = models.ExamAttempt(
            user_id=student_user.id,
            subtopic_id=subtopic_map["Work, Energy & Power"].id,
            mock_exam_id=None,
            score=100.0,
            total_questions=2,
            correct_answers=2,
            wrong_answers=0,
            time_spent_seconds=90,
            ai_insight="Excellent progress in energy calculations."
        )
        db.add(attempt2)
        db.commit()
        db.refresh(attempt2)

        q_work = db.query(models.Question).filter(models.Question.subtopic_id == subtopic_map["Work, Energy & Power"].id).all()
        for q in q_work:
            choices = db.query(models.Choice).filter(models.Choice.question_id == q.id).all()
            correct_choice = next(c for c in choices if c.is_correct)
            rec = models.AnswerRecord(
                attempt_id=attempt2.id,
                question_id=q.id,
                selected_answer=correct_choice.choice_text,
                is_correct=True,
                time_spent_seconds=45
            )
            db.add(rec)
        db.commit()

        # Update student progress tracking
        prog1 = models.StudentProgress(
            user_id=student_user.id,
            subtopic_id=subtopic_map["Newton's Laws of Motion"].id,
            is_completed=False,
            points_earned=0,
            stars_awarded=0
        )
        prog2 = models.StudentProgress(
            user_id=student_user.id,
            subtopic_id=subtopic_map["Work, Energy & Power"].id,
            is_completed=True,
            points_earned=40,
            stars_awarded=3
        )
        db.add_all([prog1, prog2])
        db.commit()

        # Seed 2 Weakness Reports as requested
        print("Seeding weakness reports...")
        report1 = models.WeaknessReport(
            student_id=student_user.id,
            attempt_id=attempt1.id,
            weak_subjects=json.dumps(["G12 Physics"]),
            weak_topics=json.dumps(["Newton's Laws of Motion"]),
            recommendations="Daawo muuqaalka Newton's Third Law oo dib u xalliso su'aalaha khaldan.",
            readiness_score=66.6
        )
        report2 = models.WeaknessReport(
            student_id=student_user.id,
            attempt_id=attempt1.id,
            weak_subjects=json.dumps(["G12 Physics"]),
            weak_topics=json.dumps(["Action-Reaction Forces"]),
            recommendations="Xoogga saar barashada farqiga u dhexeeya ciidammada ficilka iyo falcelinta.",
            readiness_score=70.0
        )
        db.add_all([report1, report2])
        db.commit()

        # Seed study plan
        print("Seeding study plans...")
        plan = models.StudyPlan(
            student_id=student_user.id,
            week_start=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
            tasks=json.dumps([
                "Daawo fiidiyowga sharraxaadda ah ee Newton's First Law",
                "Xalliso 5 su'aalood oo ku saabsan Work, Energy & Power",
                "Dhameystir Casharka Limits & Continuity ee Xisaabta"
            ]),
            completion_status=json.dumps([True, True, False])
        )
        db.add(plan)
        db.commit()

        # Seed AI Coach Log
        print("Seeding Coach Refik initial brief message...")
        coach_log = models.AICoachLog(
            user_id=student_user.id,
            coach_message="=== KOOCHKA AI: REFIK ===\n\n📚 Abdirahman, waxaan garanayaa inaad dadaaleyso — laakiin xogtu waxay muujinaysaa inaad ku dhibtootay cutubka «Newton's Laws of Motion» (Grade 12 Physics) — natiijadaadu waxay ahayd 67% waxaadna khaladday 1 su'aalood.\n\n🔁 Talooyinkayga:\n• Dib u eeg buugga dugsiga ee cutubkaas\n• Daawo muuqaalada sharraxaadda (explanation videos)\n• Isku day in aad mar kale xalliso su'aalihii aad khaladday\n• Imtixaan mar kale si aad u furato xididdada xiga!\n\nWaad awooddaa — hal tallaabo ayaa kala dheexaysa adiga iyo xiddiga xiga! ⭐\n\n─────────────────────\n\nI see you're working hard, Abdirahman — but the data shows you're struggling with «Newton's Laws of Motion» in Grade 12 Physics (Score: 67%, 1 mistakes).\n\n🔁 Coach Refik's Action Plan:\n• Re-read the textbook chapter on this topic\n• Watch the reflex explanation video walkthrough\n• Re-attempt the questions you got wrong\n• Then re-take the exam to unlock the next node!\n\nYou're just one star away from the next roadmap checkpoint! ⭐",
            suggestion_type="focus_needed",
            mood_type="strict_warning",
            created_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
        )
        db.add(coach_log)
        db.commit()

        # Seed default payment accounts
        print("Seeding default payment accounts...")
        payment_accounts = [
            models.PaymentAccount(
                method_type="evc_plus",
                account_name="SomPrep Mobile Money Merchant",
                receiving_number="252611111111",
                currency="USD",
                is_active=True,
                instructions="Geli lambarkaaga lacag bixinta si aad toos ugu bixiso lacagta. (Enter your payment number below to make an instant payment request.)",
                is_recommended=True,
                mode="api",
                api_status="test",
                api_user_id="TEST_MERCHANT"
            ),
            models.PaymentAccount(
                method_type="zaad",
                account_name="SomPrep ZAAD Merchant",
                receiving_number="252631111111",
                currency="USD",
                is_active=True,
                instructions="Ka dir lacagta ZAAD lambarka *211*252631111111*Amount# kadibna geli aqoonsiga (Transaction ID) halkaan. (Dial *211*252631111111*Amount# and submit the Transaction ID below.)",
                is_recommended=False,
                mode="manual",
                api_status="disabled"
            ),
            models.PaymentAccount(
                method_type="sahal",
                account_name="SomPrep Sahal Merchant",
                receiving_number="252901111111",
                currency="USD",
                is_active=True,
                instructions="Ku dir lacagta Sahal lambarka 252901111111 kadibna geli aqoonsiga (Transaction ID) halkaan. (Send payment via Sahal to 252901111111 and enter the Transaction ID below.)",
                is_recommended=False,
                mode="manual",
                api_status="disabled"
            ),
            models.PaymentAccount(
                method_type="edahab",
                account_name="SomPrep eDahab Merchant",
                receiving_number="252651111111",
                currency="USD",
                is_active=True,
                instructions="Ku wareeji lacagta eDahab lambarka 252651111111 kadibna geli aqoonsiga (Transaction ID) halkaan. (Transfer to eDahab account 252651111111 and enter the Transaction ID below.)",
                is_recommended=False,
                mode="manual",
                api_status="disabled"
            ),
            models.PaymentAccount(
                method_type="bank_transfer",
                account_name="Salaam Somali Bank",
                receiving_number="10123456789",
                currency="USD",
                is_active=True,
                instructions="U wareeji lacagta akoonka Salaam Somali Bank: 10123456789, kadibna soo geli sawirka caddaynta. (Transfer to Salaam Somali Bank Account: 10123456789 and upload screenshot proof.)",
                is_recommended=False,
                mode="manual",
                api_status="disabled"
            ),
            models.PaymentAccount(
                method_type="card",
                account_name="Credit/Debit Card",
                receiving_number="Credit Card Gateway",
                currency="USD",
                is_active=False,
                instructions="Adeegga kaarka bixinta hadda diyaar ma aha, dhowaan ayaa la hawlgelin doonaa. (Credit card payment support is coming soon.)",
                is_recommended=False,
                mode="manual",
                api_status="disabled"
            )
        ]
        db.add_all(payment_accounts)
        db.commit()

        print("\nSOMPREP AI DATABASE FULLY SEEDED SUCCESSFULLY!")
        print("Created levels, grades, subjects, topics, subtopics, lessons, questions, vouchers, attempts, weakness reports, payment accounts, and diagnostic data.")

    except Exception as e:
        db.rollback()
        print(f"Error occurred during seeding: {str(e)}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database(reset="--reset" in sys.argv)
