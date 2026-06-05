📌 Project Spec Document
1. Problem Statement

People in emergency or distress situations (elderly individuals, women in unsafe environments, and individuals experiencing panic attacks) may be unable to manually trigger help using phones or apps. Existing systems rely on manual SOS buttons or simple keyword detection, which often leads to missed emergencies or false alerts.

This project aims to solve this by building an AI-based voice analysis system that detects distress signals and triggers smart, context-aware emergency responses.

2. Target Users
Elderly people living alone
Women in unsafe or emergency-prone environments
Individuals with anxiety or panic conditions
Caregivers and family members
3. MVP Features (Minimum Viable Product)
Voice Input Processing System
Captures voice input and converts it into analyzable audio features.
AI Distress Detection Module
Detects wake words, emotional tone (fear/panic), and stress indicators.
Risk Scoring Engine
Computes a risk score based on multiple signals like voice intensity, emotion, and keywords.
AI-Based Decision & Explanation System
Classifies risk level and generates human-readable explanation using LLM.
Alert Logging System (Simulated Notifications)
Stores emergency events and simulates alert triggering (Telegram/SMS-ready design).
4. Tech Stack
Backend: Python, Django REST Framework
AI/ML: OpenAI API / Claude API, Librosa, NumPy
Database: Supabase (PostgreSQL + Auth + RLS)
Frontend (optional): Streamlit / Postman testing
Deployment: Railway
Documentation: Swagger (drf-spectacular)
5. Data Model Sketch
Users Table
id (UUID)
name
email
created_at
Voice Sessions Table
id
user_id (FK → Users)
audio_features (JSON)
timestamp
Risk Analysis Table
id
session_id (FK)
risk_score
detected_emotions
wake_word_detected (boolean)
context_data (JSON)
Alerts Table
id
user_id
risk_level
message
status (sent/pending)
created_at
6. Core System Flow

Voice Input
→ Feature Extraction
→ AI Analysis
→ Risk Scoring Engine
→ Decision Engine
→ LLM Explanation
→ Alert Logging

7. Key Innovation

Instead of direct alert triggering, the system uses a multi-layer AI decision pipeline:

Detection → Analysis → Scoring → Verification → Explanation → Action


Important Note (evaluation clarity)

This is not just a voice detection tool — it is a decision-making AI system for emergency risk evaluation and response generation.