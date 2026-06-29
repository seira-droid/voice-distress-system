from django.db import models


class EmergencyContact(models.Model):
    """Stores emergency contact information used for distress notifications."""

    user_id = models.UUIDField(null=True, blank=True, db_index=True)

    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    relationship = models.CharField(max_length=50)
    telegram_chat_id = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.name


class VoiceEvent(models.Model):
    """Stores uploaded voice events and detected distress keywords."""

    user_id = models.UUIDField(null=True, blank=True, db_index=True)

    audio_file = models.CharField(max_length=255)
    distress_keyword = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return self.distress_keyword


class TriggerWord(models.Model):
    """Stores the active trigger word for a user."""

    user_id = models.CharField(max_length=100, unique=True, default="test-user")
    word = models.CharField(max_length=100)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.word


class RiskAssessment(models.Model):
    """Stores AI-generated risk assessment results for a voice event."""

    user_id = models.UUIDField(null=True, blank=True, db_index=True)

    voice_event = models.ForeignKey(VoiceEvent, on_delete=models.CASCADE)
    risk_score = models.FloatField()
    risk_level = models.CharField(max_length=20)
    ai_explanation = models.TextField()


    def __str__(self):
        return self.risk_level


class AlertLog(models.Model):
    """Stores records of alerts sent to emergency contacts."""

    user_id = models.UUIDField(null=True, blank=True, db_index=True)

    voice_event = models.ForeignKey(VoiceEvent, on_delete=models.CASCADE)
    contact = models.ForeignKey(EmergencyContact, on_delete=models.CASCADE, null=True, blank=True)
    message_sent = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"Alert sent to {self.contact.name}"
