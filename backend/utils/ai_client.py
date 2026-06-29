import re
import json
from utils.config import GROQ_API_KEY


def extract_json(text):
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in model output")
    return json.loads(match.group())


class AIClient:

    def __init__(self):
        from groq import Groq
        self.client = Groq()  # ← now only runs when AIClient() is called in the view

    def analyze_event(self, payload):
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": payload["system_prompt"]
                    },
                    {
                        "role": "user",
                        "content": json.dumps(payload["user_input"])
                    }
                ],
                temperature=0.2
            )

            text = response.choices[0].message.content

            print("\n=== RAW GROQ OUTPUT ===\n")
            print(text)

            return extract_json(text)

        except Exception as e:
            print("\n=== AI CLIENT ERROR ===")
            print(type(e).__name__)
            print(e)
            raise