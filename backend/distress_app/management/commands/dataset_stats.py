"""
Django management command to display dataset statistics.
Usage: python backend/manage.py dataset_stats
"""

from django.core.management.base import BaseCommand
from distress_app.models import InferenceLog
from django.db.models import Count, Avg


class Command(BaseCommand):
    help = 'Display statistics about the inference dataset'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('DATASET STATISTICS'))
        self.stdout.write(self.style.SUCCESS('='*60))
        
        # Total records
        total = InferenceLog.objects.count()
        self.stdout.write(f'\nTotal Inference Records: {total}')
        
        if total == 0:
            self.stdout.write(self.style.WARNING('\nNo inference records found.'))
            self.stdout.write(self.style.WARNING('The logging pipeline is working, but no voice interactions have been processed yet.'))
            self.stdout.write(self.style.WARNING('Use the application to generate inference data.'))
            return
        
        # Label distribution
        self.stdout.write('\nLabel Distribution:')
        label_counts = InferenceLog.objects.values('label').annotate(count=Count('id'))
        for item in label_counts:
            label = item['label']
            count = item['count']
            percentage = (count / total) * 100
            self.stdout.write(f'  {label:12s}: {count:5d} ({percentage:5.1f}%)')
        
        # Average risk score
        avg_risk = InferenceLog.objects.aggregate(Avg('final_risk_score'))['final_risk_score__avg']
        if avg_risk is not None:
            self.stdout.write(f'\nAverage Risk Score: {avg_risk:.2f}')
        
        # Dataset version
        latest = InferenceLog.objects.first()
        if latest:
            self.stdout.write(f'Dataset Version: {latest.dataset_version}')
        
        # Additional stats
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('Dataset is ready for ML training!'))
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))