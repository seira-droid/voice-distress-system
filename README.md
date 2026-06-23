Voice Distress System
Overview

Voice Distress System is a safety-focused backend application built using Django and Django REST Framework. The system analyzes voice recordings and speech-derived transcripts to identify potential distress situations and generate risk assessments. It provides emergency contact management, trigger word management, file storage, and AI-assisted distress analysis through REST APIs.

The project is designed to evolve beyond transcript analysis by incorporating advanced acoustic voice analysis techniques such as pitch, tone, speech rate, stress patterns, and emotional indicators to improve distress detection accuracy.

Problem Statement

In emergency situations, individuals may not always be able to manually contact emergency services or explain their condition. Traditional safety systems often depend on direct user interaction, which may not be possible during distress. The Voice Distress System aims to support emergency response workflows by analyzing voice recordings, detecting distress indicators, assessing risk levels, and providing structured information that can be used for timely intervention.

Features
Emergency Contact Management
Create emergency contacts
Retrieve all emergency contacts
Retrieve contact by ID
Update contact information
Delete emergency contacts
Trigger Word Management
Retrieve current trigger word
Update trigger word dynamically
File Management
Upload audio files
Retrieve uploaded file URLs
Store audio resources for analysis
Voice Distress Analysis
Process uploaded voice recordings
Analyze speech-derived transcripts
Detect distress-related phrases
Detect trigger words
Calculate intensity score
Generate risk assessment
Return structured analysis results
API Documentation
Swagger UI documentation
OpenAPI schema via DRF Spectacular
Published Fern documentation
Technology Stack
Backend
Python
Django
Django REST Framework
API Documentation
DRF Spectacular
Swagger UI
OpenAPI Specification
Fern Documentation
Database
PostgreSQL (Supabase)
Tools
Git
GitHub
Postman
Project Structure
voice-distress-system/
│
├── backend/
│   ├── distress_app/
│   ├── config/
│   ├── utils/
│   ├── manage.py
│   └── requirements.txt
│
├── docs/
├── CONTRIBUTING.md
└── README.md
Installation & Setup
Clone Repository
git clone <https://github.com/seira-droid/voice-distress-system>
cd voice-distress-system
Create Virtual Environment
python -m venv venv
Activate Virtual Environment

Windows:

venv\Scripts\activate

Linux/macOS:

source venv/bin/activate
Install Dependencies
pip install -r requirements.txt
Environment Variables

Create .env file:

SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=your-supabase-postgres-url
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
Run Migrations
python manage.py migrate
Start Server
python manage.py runserver

Frontend

A lightweight API console is available in `frontend/`.

Open `frontend/index.html` in a browser. It uses the deployed Render API by default:

https://voice-distress-system.onrender.com/api/v1

Deployment Note

After pulling backend changes, run migrations before testing the trigger word endpoint:

python manage.py migrate

API Documentation
Production Swagger UI
https://voice-distress-system.onrender.com/api/schema/swagger-ui/
OpenAPI Schema
https://voice-distress-system.onrender.com/api/schema/
Published Documentation
https://seira-elsa-biju-s-team.docs.buildwithfern.com/voice-distress-system-api/
Live Demo
https://voice-distress-system.onrender.com
API Endpoints
Emergency Contacts
Method	Endpoint
GET	/api/v1/emergency-contacts/
POST	/api/v1/emergency-contacts/
GET	/api/v1/emergency-contacts/{id}/
PUT	/api/v1/emergency-contacts/{id}/
PATCH	/api/v1/emergency-contacts/{id}/
DELETE	/api/v1/emergency-contacts/{id}/
Trigger Word
Method	Endpoint
GET	/api/v1/trigger-word/
PUT	/api/v1/trigger-word/
File Management
Method	Endpoint
POST	/api/v1/upload-file/
GET	/api/v1/file-url/
Voice Analysis
Method	Endpoint
POST	/api/v1/voice/analyze/
Health Check
Method	Endpoint
GET	/api/v1/diagnose/
Testing
Postman

All endpoints tested using Postman collections.

Swagger UI

Interactive testing available via Swagger.

Production Validation

All endpoints verified on live Render deployment.

Test Coverage
14/14 tests passing
Pytest configured
Supabase integration tests included
RLS validation tests included


Architecture
## Architecture

### System Flow

```mermaid
flowchart TD
    User[User] --> API[Django REST API]

    API --> EC[Emergency Contacts Module]
    API --> TW[Trigger Word Module]
    API --> FU[File Upload Module]
    API --> VA[Voice Analysis Module]

    EC --> DB[(PostgreSQL - Supabase)]
    TW --> DB
    VA --> DB

    FU --> STORAGE[Supabase Storage]
    VA --> AI[AI Analysis Engine]

    AI --> DB

    API --> DOCS[Swagger / OpenAPI Docs]
    DOCS --> User


Future Improvements
Real-time voice processing
Acoustic emotion detection (tone, pitch, stress)
Panic detection without trigger words
SMS alert system
Live emergency notifications
Location tracking integration
Mobile app support
Multi-language analysis


Contributors
Seira Elsa Biju

License
Educational / internship project use only.
