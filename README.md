# Voice Distress System

## Overview

Voice Distress System is a safety-focused backend application that analyzes distress-related voice inputs, manages emergency contacts, detects trigger words, stores uploaded audio files, and provides risk assessment data for emergency situations.

## Features

### Emergency Contact Management

* Create emergency contacts
* View all emergency contacts
* View contact by ID
* Update contact details
* Delete contacts

### Trigger Word Management

* Get current trigger word
* Update trigger word dynamically

### File Management

* Upload audio files
* Retrieve uploaded file URLs

### Voice Analysis

* Analyze distress-related transcripts
* Detect trigger phrases
* Calculate intensity score
* Calculate risk score

## Tech Stack

* Python
* Django
* Django REST Framework
* DRF Spectacular
* Swagger UI
* Postman
* SQLite

## Installation

### Clone Repository

git clone <repository-url>

cd voice-distress-system

### Create Virtual Environment

python -m venv venv

### Activate Environment

Windows:

venv\Scripts\activate

### Install Dependencies

pip install -r requirements.txt

### Run Migrations

python manage.py migrate

### Start Server

python manage.py runserver

## API Documentation

Swagger UI:

http://127.0.0.1:8000/api/schema/swagger-ui/

OpenAPI Schema:

http://127.0.0.1:8000/api/schema/

## API Endpoints

### Emergency Contacts

GET /api/emergency-contacts/

POST /api/emergency-contacts/

GET /api/emergency-contacts/{id}/

PUT /api/emergency-contacts/{id}/

DELETE /api/emergency-contacts/{id}/

### Trigger Word

GET /api/v1/trigger-word/

PUT /api/v1/trigger-word/

### File Management

POST /api/v1/upload-file/

GET /api/v1/file-url/

### Voice Analysis

POST /api/v1/voice/analyze/

## Testing

API testing performed using Postman.

Swagger documentation generated using DRF Spectacular.

## Future Improvements

* Real-time audio processing
* AI-based distress detection
* SMS alerts
* Location sharing
* Emergency notification system
