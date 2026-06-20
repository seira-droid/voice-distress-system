# Voice Distress System

## Overview

Voice Distress System is a safety-focused backend application built using Django and Django REST Framework. The system analyzes voice recordings and speech-derived transcripts to identify potential distress situations and generate risk assessments. It provides emergency contact management, trigger word management, file storage, and AI-assisted distress analysis through REST APIs.

The project is designed to evolve beyond transcript analysis by incorporating advanced acoustic voice analysis techniques such as pitch, tone, speech rate, stress patterns, and emotional indicators to improve distress detection accuracy.

---

## Problem Statement

In emergency situations, individuals may not always be able to manually contact emergency services or explain their condition. Traditional safety systems often depend on direct user interaction, which may not be possible during distress. The Voice Distress System aims to support emergency response workflows by analyzing voice recordings, detecting distress indicators, assessing risk levels, and providing structured information that can be used for timely intervention.

---

## Features

### Emergency Contact Management

* Create emergency contacts
* Retrieve all emergency contacts
* Retrieve contact details by ID
* Update contact information
* Delete emergency contacts

### Trigger Word Management

* Retrieve the current trigger word
* Update trigger words dynamically through API

### File Management

* Upload audio files
* Retrieve uploaded file URLs
* Store audio resources for analysis

### Voice Distress Analysis

* Process uploaded voice recordings
* Analyze speech-derived transcripts
* Detect distress-related phrases and keywords
* Detect trigger words
* Calculate intensity scores
* Generate risk assessment scores
* Return structured analysis results

### API Documentation

* Interactive Swagger UI documentation
* OpenAPI schema generation using DRF Spectacular
* Published Fern documentation

---

## Technology Stack

### Backend

* Python
* Django
* Django REST Framework (DRF)

### API Documentation

* DRF Spectacular
* Swagger UI
* OpenAPI Specification
* Fern Documentation

### Database

* PostgreSQL (Supabase)

### Development & Testing Tools

* Git
* GitHub
* Postman

---

## Project Structure

```text
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
```

---

## Installation & Setup

### Clone Repository

```bash
git clone <repository-url>
cd voice-distress-system
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Virtual Environment

#### Windows

```bash
venv\Scripts\activate
```

#### Linux / macOS

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment Variables

Create a `.env` file and configure:

```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=your-supabase-postgres-url
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Apply Database Migrations

```bash
python manage.py migrate
```

### Run Development Server

```bash
python manage.py runserver
```

Application URL:

```text
http://127.0.0.1:8000/
```

---

## API Documentation

### Swagger UI

```text
http://127.0.0.1:8000/api/schema/swagger-ui/
```

### OpenAPI Schema

```text
http://127.0.0.1:8000/api/schema/
```

### Published API Documentation

```text
https://seira-elsa-biju-s-team.docs.buildwithfern.com/voice-distress-system-api/
```

---

## API Endpoints

### Emergency Contacts

| Method | Endpoint                        |
| ------ | ------------------------------- |
| GET    | `/api/emergency-contacts/`      |
| POST   | `/api/emergency-contacts/`      |
| GET    | `/api/emergency-contacts/{id}/` |
| PUT    | `/api/emergency-contacts/{id}/` |
| DELETE | `/api/emergency-contacts/{id}/` |

### Trigger Word Management

| Method | Endpoint                |
| ------ | ----------------------- |
| GET    | `/api/v1/trigger-word/` |
| PUT    | `/api/v1/trigger-word/` |

### File Management

| Method | Endpoint               |
| ------ | ---------------------- |
| POST   | `/api/v1/upload-file/` |
| GET    | `/api/v1/file-url/`    |

### Voice Analysis

| Method | Endpoint                 |
| ------ | ------------------------ |
| POST   | `/api/v1/voice/analyze/` |

---

## Testing

### Postman

API endpoints have been tested using Postman collections and request examples.

### Swagger UI

Interactive API testing and documentation are available through Swagger UI.

### Published Documentation

```text
https://seira-elsa-biju-s-team.docs.buildwithfern.com/voice-distress-system-api/
```

---

## Screenshots

### Swagger UI

Add screenshot here:

```text
docs/images/swagger-ui.png
```

### Postman API Testing

Add screenshot here:

```text
docs/images/postman.png
```

### Django Admin Dashboard

Add screenshot here:

```text
docs/images/admin-dashboard.png
```

---

## Architecture Diagram

```mermaid
flowchart TD

    User[User]

    User --> API[Django REST API]

    API --> EC[Emergency Contact Module]
    API --> TW[Trigger Word Module]
    API --> FU[File Upload Module]
    API --> VA[Voice Analysis Module]

    EC --> DB[(PostgreSQL / Supabase)]

    TW --> SUPA[Supabase Database]

    FU --> STORAGE[Supabase Storage]

    VA --> AI[AI Analysis Service]

    AI --> RA[Risk Assessment]

    RA --> DB

    API --> SWAGGER[Swagger / OpenAPI Docs]

    SWAGGER --> User
```

---

## Future Improvements

* Real-time audio processing
* Acoustic voice analysis using pitch and tone features
* Emotion and stress detection from voice signals
* Panic detection without relying solely on trigger words
* Advanced AI-based distress detection
* SMS alert integration
* Live emergency notifications
* Location sharing and tracking
* Mobile application integration
* Multi-language distress analysis
* Emergency response automation

---

## Live Demo

### Deployment URL

```text
Coming Soon
```

---

## Contributors

* Seira Elsa Biju

---

## License

This project is developed for educational, research, and internship purposes.
## Test Coverage

All automated tests are passing successfully.

### Test Results

* 14/14 tests passing
* Pytest configured
* Supabase integration tests included
* RLS validation tests included

### Coverage Report

![Coverage Report](https://drive.google.com/file/d/1V-wJBmNli30KMmuLbfWzdrLChuDWSd8I/view?usp=sharing)
