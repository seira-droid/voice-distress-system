import requests

url = "https://voice-distress-system.onrender.com/api/v1/voice/analyze/"

headers = {
    "Content-Type": "application/json"
}

data = {
    "trigger_phrase_detected": False,
    "transcript": "test distress signal detected",
    "intensity_score": 50,
    "base_risk_score": 40
}

for i in range(50):
    r = requests.post(url, json=data, headers=headers)
    print(i + 1, r.status_code)