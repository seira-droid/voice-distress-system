from django.db import models


class EmergencyContact(models.Model):
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    relationship = models.CharField(max_length=50)
    telegram_chat_id = models.CharField(max_length=100, null=True, blank=True)

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
    user_id = models.CharField(max_length=100, unique=True, default="test-user")
    word = models.CharField(max_length=100)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.word


class RiskThreshold(models.Model):
    user_id = models.CharField(max_length=100, unique=True, default="test-user")
    threshold = models.IntegerField(default=80)


    def __str__(self):
        return f"Threshold: {self.threshold}"

    @classmethod
    def get_threshold(cls):
        obj, _ = cls.objects.get_or_create(
            user_id="test-user",
            defaults={"threshold": 80}
        )
        return obj.threshold


class VoiceEvent(models.Model):
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    transcript = models.TextField(blank=True, default="")
    trigger_phrase_detected = models.BooleanField(default=False)
    intensity_score = models.FloatField(default=0.5)
    base_risk_score = models.FloatField(default=0.5)
    classification = models.CharField(max_length=100, blank=True, default="")
    risk_score = models.FloatField(default=0)
    confidence_score = models.FloatField(default=0)
    category = models.CharField(max_length=100, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    recommendations = models.JSONField(default=list)
    send_alert = models.BooleanField(default=False)
    alert_triggered = models.BooleanField(default=False)
    telegram_sent = models.BooleanField(default=False)
    user_latitude = models.FloatField(null=True, blank=True)
    user_longitude = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Event {self.id} - {self.classification}"


class RiskAssessment(models.Model):
    voice_event = models.ForeignKey(VoiceEvent, on_delete=models.CASCADE)
    risk_score = models.FloatField()
    risk_level = models.CharField(max_length=20)
    ai_explanation = models.TextField()

    def __str__(self):
        return f"RiskAssessment {self.id} - {self.risk_level}"


class AlertLog(models.Model):
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    voice_event = models.ForeignKey(VoiceEvent, on_delete=models.CASCADE)
    contact = models.ForeignKey(EmergencyContact, on_delete=models.CASCADE, null=True, blank=True)
    message_sent = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"Alert sent to {self.contact.name}"