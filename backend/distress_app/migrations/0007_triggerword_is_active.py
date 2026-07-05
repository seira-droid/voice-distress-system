# Generated migration for TriggerWord model changes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('distress_app', '0006_merge'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='triggerword',
            name='triggerword_user_id_key',
        ),
        migrations.AddField(
            model_name='triggerword',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='triggerword',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name='triggerword',
            name='user_id',
            field=models.CharField(db_index=True, max_length=100),
        ),
        migrations.AddConstraint(
            model_name='triggerword',
            constraint=models.UniqueConstraint(fields=['user_id', 'word'], name='unique_user_word'),
        ),
    ]