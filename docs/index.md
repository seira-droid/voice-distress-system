# Voice Distress System

## Overview

The Voice Distress System is a Django REST API that helps identify emergency situations from voice-related inputs. The system manages emergency contacts, trigger words, file uploads, and distress analysis.

## Features

### Emergency Contact Management

* Create emergency contacts
* Retrieve all contacts
* Retrieve contact by ID
* Update contact information
* Delete contacts

### Trigger Word Management

* Retrieve current trigger word
* Update trigger word

### File Management

* Upload audio files
* Generate file URLs

### Voice Analysis

* Analyze distress-related transcripts
* Detect trigger phrases
* Calculate intensity score
* Calculate risk score

## API Documentation

Swagger UI:

`http://127.0.0.1:8000/api/schema/swagger-ui/`

## Technology Stack

* Python
* Django
* Django REST Framework
* DRF Spectacular
* MkDocs
* Postman
* SQLite

## Project Status

Current Version: 1.0

Documentation and API testing completed.
