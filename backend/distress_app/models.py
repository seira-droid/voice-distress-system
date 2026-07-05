from django.db import models


class EmergencyContact(models.Model):
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(max_length=100, blank=True, default='')
    relationship = models.CharField(max_length=50)
    telegram_chat_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name



class TriggerWord(models.Model):
    user_id = models.CharField(max_length=100, db_index=True)
    word = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user_id', 'word']
        ordering = ['-is_active', 'word']

    def __str__(self):
        return f"{self.word} ({'active' if self.is_active else 'inactive'})"


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
    delivered = models.BooleanField(default=False)
    delivery_error = models.TextField(blank=True, default="")
    incident = models.ForeignKey(
        "Incident", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="alert_logs"
    )

    def __str__(self):
        contact_name = self.contact.name if self.contact else "Unknown"
        return f"Alert sent to {contact_name}"


class InferenceLog(models.Model):
    """Stores inference data for ML training and analysis."""
    timestamp = models.DateTimeField(db_index=True)
    transcription = models.TextField()
    voice_features = models.JSONField(default=dict)
    text_score = models.FloatField()
    voice_score = models.FloatField()
    text_confidence = models.FloatField()
    voice_confidence = models.FloatField()
    final_risk_score = models.FloatField()
    alert_triggered = models.BooleanField(default=False)
    label = models.CharField(max_length=20, db_index=True)
    dataset_version = models.CharField(max_length=20, default="v1.0.0")

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["-timestamp", "label"]),
        ]

    def __str__(self):
        return f"Inference {self.id} - {self.label} (score: {self.final_risk_score})"


class Incident(models.Model):
    """
    Stores a single emergency incident record for every alert-triggered emergency.
    Links together the VoiceEvent, InferenceLog, and all AlertLog records.
    """
    class Status(models.TextChoices):
        OPEN = "Open", "Open"
        RESOLVED = "Resolved", "Resolved"
        FALSE_ALARM = "False Alarm", "False Alarm"

    # Core incident data
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    transcript = models.TextField(blank=True, default="")
    voice_features = models.JSONField(default=dict, blank=True)
    risk_score = models.FloatField(default=0.0)
    classification = models.CharField(max_length=100, blank=True, default="")
    confidence_score = models.FloatField(default=0.0)

    # Alert message data
    alert_message = models.TextField(blank=True, default="")
    alert_triggered = models.BooleanField(default=False)

    # Telegram delivery status
    telegram_delivery_status = models.BooleanField(default=False)
    contacts_notified = models.IntegerField(default=0)
    contacts_successful = models.IntegerField(default=0)
    contacts_failed = models.IntegerField(default=0)

    # Status
    incident_status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )

    # Related records
    voice_event = models.ForeignKey(
        VoiceEvent, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="incidents"
    )
    inference_log = models.ForeignKey(
        InferenceLog, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="incidents"
    )

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"Incident {self.id} - {self.classification} (score: {self.risk_score})"