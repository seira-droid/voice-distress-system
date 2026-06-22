import requests
import time

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
    try:
        r = requests.post(url, json=data, headers=headers, timeout=10)

        print(i + 1, r.status_code)

        # Optional: print response when rate limit triggers
        if r.status_code != 200:
            print("Response:", r.text)

    except Exception as e:
        print(i + 1, "ERROR:", str(e))

    time.sleep(0.05)  # small delay (optional but realistic load)