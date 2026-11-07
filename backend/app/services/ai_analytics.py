"""
Per-exam diagnostic report ("DIB-U-EEGISTA QAASKA AH") — OpenAI-powered.

Called synchronously during exam submission. Weak-topic detection is
deterministic keyword analysis; the personalized study report itself is
written by the OpenAI API.

Important: this runs inside /api/exams/.../submit. A missing OPENAI_API_KEY or
an API outage must NEVER fail the exam submission (that would break the
completed exam-simulator module). In that case the stored report is an honest
"AI report unavailable" notice with the raw detected topics — never fake AI
content. The Coach Refik endpoints (app/services/ai_engine.py) are the ones
that surface a hard 503 to the frontend.
"""
import logging

from app.config import settings

logger = logging.getLogger("somprep.ai_analytics")

# Keyword maps matching standard high school topics in Somali & English
TOPICS_MAP = {
    "Isla'egyada & Aljebra (Equations & Algebra)": [
        "equation", "solve", "algebra", "linear", "quadratic", "isla'eg", "aljebra"
    ],
    "Hendese & Baaxad (Geometry & Measurement)": [
        "geometry", "triangle", "circle", "rectangle", "area", "volume", "angle",
        "xagal", "goobo", "saddexgal", "baaxad"
    ],
    "Xoogga & Dhaqdhaqaaqa (Force & Motion)": [
        "gravity", "force", "velocity", "acceleration", "mass", "motion", "newton",
        "xoog", "xawaare", "dhaqdhaqaaq"
    ],
    "Korontada & Magniska (Electricity & Magnetism)": [
        "electricity", "charge", "circuit", "voltage", "current", "magnet",
        "koronto", "magnis"
    ],
    "Aashitada & Saldhigyada (Acids & Bases)": [
        "acid", "base", "ph", "alkaline", "litmus", "aashito", "saldhig", "alkali"
    ],
    "Brosesyada Nolosha & Unugyada (Cellular Biology)": [
        "cell", "mitochondria", "nucleus", "membrane", "organelle", "unug", "nolol"
    ],
    "Hido-raaca & DNA (Genetics & DNA)": [
        "dna", "gene", "chromosome", "genetics", "rna", "hereditary", "hido", "hiddo"
    ],
}

_PERFECT_SCORE_REPORT = (
    "=== NATIIJADAADA (YOUR RESULT) ===\n\n"
    "Hambalyo! Waxaad saxday dhammaan su'aalaha. Sii wad dadaalkaaga sare!\n\n"
    "Congratulations! You got a perfect score. Keep up your excellent work!"
)

_SYSTEM_PROMPT = (
    "You are the diagnostic-report writer for SomPrep AI, a Somali high-school "
    "exam preparation platform. Given a student's weak topics and sample wrong "
    "questions, write a personalized study report in TWO languages with this "
    "exact layout:\n"
    "=== DIB-U-EEGISTA QAASKA AH (PERSONALIZED INSIGHTS) ===\n\n"
    "<Somali section: weak topics + 3 concrete study tips>\n\n"
    "=====================================================\n\n"
    "<English section: weak topics + the same 3 study tips>\n\n"
    "Rules: list ONLY the weak topics provided. Tips must be concrete and tied "
    "to the topics (textbook chapters, explanation videos, redoing wrong "
    "questions). Encouraging tone. Under 150 words per language. No invented data."
)


def _detect_weak_topics(wrong_questions_list: list) -> set:
    detected = set()
    for question in wrong_questions_list:
        text = f"{question.question_text or ''} {question.explanation_text or ''}".lower()
        matched = False
        for topic, keywords in TOPICS_MAP.items():
            if any(kw in text for kw in keywords):
                detected.add(topic)
                matched = True
        if not matched and getattr(question, "category", None):
            detected.add(f"Cutubyada {question.category.name} ({question.category.name} general topics)")
    return detected


def _unavailable_notice(detected_topics: set) -> str:
    """Honest non-AI notice — clearly labeled, never pretends to be AI output."""
    topics = "\n".join(f"- {t}" for t in sorted(detected_topics)) or "- (no topics detected)"
    return (
        "=== DIB-U-EEGIS (REVIEW TOPICS) ===\n\n"
        "Qodobada laga helay falanqaynta tooska ah ee su'aalaha aad khaladday:\n"
        f"{topics}\n\n"
        "FIIRO GAAR AH: Warbixinta AI ee qaaska ah hadda lama heli karo. "
        "(NOTE: The personalized AI study report is temporarily unavailable. "
        "The topics above come from automatic keyword analysis of your wrong answers.)"
    )


def generate_learning_insight(wrong_questions_list: list) -> str:
    """
    Builds the personalized diagnostic report for an exam attempt.

    Deterministic topic detection + OpenAI-written report. Never raises:
    exam submission must not fail because the AI service is down.
    """
    if not wrong_questions_list:
        return _PERFECT_SCORE_REPORT

    detected = _detect_weak_topics(wrong_questions_list)

    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY missing — storing unavailability notice instead of AI report.")
        return _unavailable_notice(detected)

    samples = []
    for q in wrong_questions_list[:5]:
        samples.append(f"- {(q.question_text or '').strip()[:200]}")

    user_prompt = (
        f"Number of wrong answers: {len(wrong_questions_list)}\n"
        f"Detected weak topics:\n" + "\n".join(f"- {t}" for t in sorted(detected)) + "\n\n"
        f"Sample wrong questions:\n" + "\n".join(samples) + "\n\n"
        "Write the diagnostic report now, following the required layout exactly."
    )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.OPENAI_TIMEOUT_SECONDS)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
            max_tokens=700,
        )
        report = (response.choices[0].message.content or "").strip()
        if not report:
            raise ValueError("OpenAI returned an empty report")
        return report
    except Exception as exc:  # noqa: BLE001 — never break exam submission
        logger.error("OpenAI diagnostic report failed: %s", exc)
        return _unavailable_notice(detected)
