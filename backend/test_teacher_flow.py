import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def setup_db():
    db = SessionLocal()
    try:
        # Clear old teacher-exam related records for a clean test
        db.query(models.TeacherExamAttempt).delete()
        db.query(models.TeacherExamQuestion).delete()
        db.query(models.TeacherExam).delete()
        db.query(models.TeacherVideo).delete()
        
        # Ensure we have an admin user, a teacher user, and a student user
        admin = db.query(models.User).filter(models.User.phone_number == "111").first()
        if not admin:
            from app.utils.auth import get_password_hash
            admin = models.User(
                phone_number="111",
                full_name="Test Admin",
                role="admin",
                hashed_password=get_password_hash("password123"),
                is_active=True
            )
            db.add(admin)
            
        student = db.query(models.User).filter(models.User.phone_number == "222").first()
        if not student:
            from app.utils.auth import get_password_hash
            student = models.User(
                phone_number="222",
                full_name="Test Student",
                role="student",
                grade_level=12,
                selected_region="Federal",
                hashed_password=get_password_hash("password123"),
                is_active=True
            )
            db.add(student)
            
        db.commit()
    finally:
        db.close()

def get_token(phone_number, password):
    response = client.post(
        "/api/auth/login",
        json={"phone_number": phone_number, "password": password}
    )
    assert response.status_code == 200, f"Login failed for {phone_number}: {response.text}"
    return response.json()["access_token"]

def test_teacher_portal_flow():
    setup_db()
    
    # 1. Admin login
    admin_token = get_token("111", "password123")
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Admin creates a Teacher
    create_teacher_payload = {
        "phone_number": "333",
        "full_name": "Test Teacher",
        "password": "password123",
        "subject": "Mathematics",
        "school": "SomPrep Academy",
        "bio": "Certified Math Instructor"
    }
    # Check if teacher already exists, if so delete first to test creation
    db = SessionLocal()
    existing_teacher = db.query(models.User).filter(models.User.phone_number == "333").first()
    if existing_teacher:
        db.delete(existing_teacher)
        db.commit()
    db.close()
    
    res = client.post("/api/admin/create-teacher", json=create_teacher_payload, headers=headers_admin)
    assert res.status_code == 201, f"Failed to create teacher: {res.text}"
    teacher_id = res.json()["id"]
    print("Step 1: Admin created teacher successfully.")
    
    # 3. Teacher logins
    teacher_token = get_token("333", "password123")
    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}
    
    # 4. Teacher creates an Exam
    exam_payload = {
        "title": "Algebra Quiz",
        "subject": "Mathematics",
        "grade_level": 12,
        "instructions": "Solve all questions.",
        "duration_minutes": 45,
        "is_open": True,
        "allow_review": True,
        "questions": [
            {
                "question_text": "What is 2x + 5 = 15? Find x.",
                "option_a": "3",
                "option_b": "5",
                "option_c": "10",
                "option_d": "7",
                "correct_answer": "B",
                "explanation": "2x = 10 => x = 5",
                "order_index": 0
            },
            {
                "question_text": "Simplify x^2 * x^3.",
                "option_a": "x^5",
                "option_b": "x^6",
                "option_c": "2x^5",
                "option_d": "x",
                "correct_answer": "A",
                "explanation": "Add the exponents: 2 + 3 = 5",
                "order_index": 1
            }
        ]
    }
    res = client.post("/api/teacher/exams", json=exam_payload, headers=headers_teacher)
    assert res.status_code == 201, f"Failed to create exam: {res.text}"
    exam_id = res.json()["id"]
    questions = res.json()["questions"]
    assert len(questions) == 2
    q1_id = questions[0]["id"]
    q2_id = questions[1]["id"]
    print(f"Step 2: Teacher created exam with ID {exam_id} and {len(questions)} questions.")
    
    # 5. Student logins
    student_token = get_token("222", "password123")
    headers_student = {"Authorization": f"Bearer {student_token}"}
    
    # 6. Student fetches open teacher exams
    res = client.get("/api/exams/teacher-exams", headers=headers_student)
    assert res.status_code == 200
    exams = res.json()
    assert any(e["id"] == exam_id for e in exams), "Created exam not listed for student!"
    print("Step 3: Student fetched assigned teacher exams successfully.")
    
    # 7. Student starts the exam
    res = client.post(f"/api/exams/teacher-exams/{exam_id}/start", headers=headers_student)
    assert res.status_code == 200, f"Failed to start exam: {res.text}"
    attempt_id = res.json()["id"]
    print(f"Step 4: Student started exam attempt ID {attempt_id}.")
    
    # 8. Student submits exam answers
    # Option B is correct for Q1, Option A is correct for Q2. Let's answer Q1 correctly (B) and Q2 incorrectly (B). Score should be 50%
    submit_payload = {
        "answers": {
            str(q1_id): "B",
            str(q2_id): "B"
        },
        "time_spent_seconds": 300
    }
    res = client.post(f"/api/exams/teacher-exams/{exam_id}/submit", json=submit_payload, headers=headers_student)
    assert res.status_code == 200, f"Failed to submit exam: {res.text}"
    submit_res = res.json()
    assert submit_res["score"] == 50.0
    assert submit_res["correct_answers"] == 1
    assert submit_res["total_questions"] == 2
    print("Step 5: Student submitted exam and got 50% score.")
    
    # 9. Student retrieves attempt detail
    res = client.get(f"/api/exams/teacher-exams/attempts/{attempt_id}", headers=headers_student)
    assert res.status_code == 200
    attempt_detail = res.json()
    assert attempt_detail["score"] == 50.0
    assert attempt_detail["answers"][str(q1_id)] == "B"
    print("Step 6: Student retrieved single attempt details successfully.")
    
    # 10. Student retrieves all attempts
    res = client.get("/api/exams/teacher-exams/attempts", headers=headers_student)
    assert res.status_code == 200, f"Attempts list failed: {res.status_code} - {res.text}"
    attempts_list = res.json()
    assert any(a["id"] == attempt_id for a in attempts_list)
    print("Step 7: Student retrieved all completed attempts successfully.")
    
    # 11. Teacher checks results
    res = client.get(f"/api/teacher/exams/{exam_id}/results", headers=headers_teacher)
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 1
    assert results[0]["student_name"] == "Test Student"
    assert results[0]["score"] == 50.0
    print("Step 8: Teacher retrieved exam results dashboard successfully.")
    
    print("\nALL TEACHER PORTAL & ROLE-BASED WORKSPACE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_teacher_portal_flow()
