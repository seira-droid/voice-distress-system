import os
import requests


def transcribe_audio(audio_file_path):
    """
    Transcribe audio using Groq Whisper API.
    Falls back to a placeholder if API key is missing.
    """
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        return {
            "transcript": "Transcription unavailable — GROQ_API_KEY not set.",
            "language": "en",
            "duration": 0,
        }

    url = "https://api.groq.com/openai/v1/audio/transcriptions"

    try:
        with open(audio_file_path, "rb") as f:
            response = requests.post(
                url,
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": (os.path.basename(audio_file_path), f, "audio/webm")},
                data={"model": "whisper-large-v3", "language": "en"},
                timeout=30,
            )

        if response.status_code == 200:
            data = response.json()
            return {
                "transcript": data.get("text", ""),
                "language": data.get("language", "en"),
                "duration": data.get("duration", 0),
            }
        else:
            raise Exception(f"Whisper API error: {response.text}")

    except Exception as e:
        print(f"Speech-to-text failed: {e}")
        raise


def transcribe_audio_bytes(audio_bytes, filename="recording.webm"):
    """
    Transcribe audio from bytes (used when file comes from request.FILES).
    """
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        return {
            "transcript": "Transcription unavailable — GROQ_API_KEY not set.",
            "language": "en",
            "duration": 0,
        }

    url = "https://api.groq.com/openai/v1/audio/transcriptions"

    try:
        response = requests.post(
            url,
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (filename, audio_bytes, "audio/webm")},
            data={"model": "whisper-large-v3", "language": "en"},
            timeout=30,
        )

        if response.status_code == 200:
            data = response.json()
            return {
                "transcript": data.get("text", ""),
                "language": data.get("language", "en"),
                "duration": data.get("duration", 0),
            }
        else:
            raise Exception(f"Whisper API error: {response.text}")

    except Exception as e:
        print(f"Speech-to-text failed: {e}")
        raise