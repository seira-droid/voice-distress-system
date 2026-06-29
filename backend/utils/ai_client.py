import re
import json
from utils.config import GROQ_API_KEY
from distress_app.models import EmergencyContact


# ----------------------------
# JSON EXTRACTION SAFETY
# ----------------------------
def extract_json(text):
    """
    Extract JSON safely from model output
    """
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in model output")
    return json.loads(match.group())


# ----------------------------
# TOOL IMPLEMENTATION
# ----------------------------
def get_emergency_contacts(user_id=None):
    """
    Tool: Fetch emergency contacts safely from DB
    """

    # IMPORTANT: avoid crashing on invalid UUID/string
    try:
        if user_id:
            contacts = EmergencyContact.objects.filter(user_id=user_id)
        else:
            contacts = EmergencyContact.objects.all()
    except Exception:
        contacts = EmergencyContact.objects.all()

    return [
        {
            "id": str(c.id),
            "name": c.name,
            "relationship": c.relationship,
            "phone_number": c.phone_number,
            "telegram_chat_id": c.telegram_chat_id,
        }
        for c in contacts
    ]


# ----------------------------
# AI CLIENT
# ----------------------------
class AIClient:

    def __init__(self):
        from groq import Groq
        self.client = Groq(api_key=GROQ_API_KEY)

        # TOOL DEFINITIONS (IMPORTANT)
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_emergency_contacts",
                    "description": (
                        "Fetch emergency contacts from database. "
                        "Use only when needed. Do NOT invent user_id."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "string",
                                "description": "Optional user UUID (can be omitted)"
                            }
                        },
                        "required": []
                    }
                }
            }
        ]

    # ----------------------------
    # MAIN AI FUNCTION
    # ----------------------------
    def analyze_event(self, payload):

        try:
            # STEP 1: CALL MODEL
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
                tools=self.tools,
                tool_choice="auto",
                temperature=0.2
            )

            message = response.choices[0].message

            print("\n=== RAW MODEL OUTPUT ===\n")
            print(message)

            # ----------------------------
            # STEP 2: TOOL CALL CHECK
            # ----------------------------
            if hasattr(message, "tool_calls") and message.tool_calls:

                tool_call = message.tool_calls[0]
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments or "{}")

                print("\n=== TOOL CALLED ===")
                print(tool_name, tool_args)

                # EXECUTE TOOL
                if tool_name == "get_emergency_contacts":
                    tool_result = get_emergency_contacts(**tool_args)
                else:
                    raise ValueError(f"Unknown tool: {tool_name}")

                # STEP 3: SEND TOOL RESULT BACK
                final_response = self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {
                            "role": "system",
                            "content": payload["system_prompt"]
                        },
                        {
                            "role": "user",
                            "content": json.dumps(payload["user_input"])
                        },
                        message,
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(tool_result)
                        }
                    ],
                    temperature=0.2
                )

                final_text = final_response.choices[0].message.content

                return extract_json(final_text)

            # ----------------------------
            # NO TOOL USED
            # ----------------------------
            return extract_json(message.content)

        except Exception as e:
            print("\n=== AI CLIENT ERROR ===")
            print(type(e).__name__)
            print(e)
            raise