import sys
from pathlib import Path

project_root = Path(__file__).resolve().parents[1]
backend_path = project_root / "backend"

sys.path.insert(0, str(backend_path))

from distress_app.services.ai_services import analyze_voice_event
result = analyze_voice_event(
    trigger_phrase_detected=True,
    transcript="Someone is following me. Please help.",
    intensity_score=90,
    base_risk_score=85
)

print(result)