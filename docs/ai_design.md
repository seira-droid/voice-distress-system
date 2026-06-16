# AI Voice Analysis Design

## Input to AI

{
  "event_id": "uuid",
  "trigger_phrase_detected": true,
  "transcript": "someone is following me please help",
  "intensity_score": 78,
  "base_risk_score": 72
}

## AI Responsibilities

1. Classify event
   - Emergency
   - Suspicious
   - Test
   - False Positive

2. Assign risk score
   - 0 to 100

3. Determine category
   - Personal Safety
   - Medical
   - Fire
   - Accident
   - Harassment
   - Other

4. Generate summary

5. Generate recommendations

6. Decide whether alert should be sent

## Structured Output

{
  "classification": "Emergency",
  "risk_score": 92,
  "category": "Personal Safety",
  "summary": "User reports being followed and requests help.",
  "recommendations": [
    "Notify emergency contacts",
    "Share location immediately"
  ],
  "send_alert": true
}

## Supabase Storage

risk_assessments
- event_id
- classification
- risk_score

ai_reports
- event_id
- summary
- recommendations