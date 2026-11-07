import os

backend_dir = r"c:\Users\Moha-qadar\OneDrive\Desktop\SomPrep AI\somprep-ai\backend"

for root, dirs, files in os.walk(backend_dir):
    for f in files:
        if f.endswith(".py"):
            filepath = os.path.join(root, f)
            with open(filepath, "r", encoding="utf-8") as file:
                content = file.read()
                if "grade_level" in content:
                    for line_no, line in enumerate(content.splitlines(), 1):
                        if "@router." in line or "grade_level" in line:
                            # Print router definitions and lines containing grade_level
                            if "@router." in line or "filter" in line or "def " in line:
                                print(f"{f}:{line_no}: {line.strip()}")
