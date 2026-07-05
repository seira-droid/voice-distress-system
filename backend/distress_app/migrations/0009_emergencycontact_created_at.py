# Generated migration to add created_at field to EmergencyContact

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('distress_app', '0008_incident_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='emergencycontact',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
