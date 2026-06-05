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

5.Data Model Sketch (Tables + Relationships)

i. users

Stores registered users.

id (UUID, Primary Key)
name (string)
phone (string)
email (string)
created_at (timestamp)
ii. audio_sessions

Stores each recorded voice input session.

id (UUID, Primary Key)
user_id (Foreign Key → users.id)
audio_path (string)
duration (float)
created_at (timestamp)
iii. audio_features

Stores extracted audio characteristics using Librosa.

id (UUID, Primary Key)
session_id (Foreign Key → audio_sessions.id)
pitch (float)
energy (float)
tremor (float)
speech_rate (float)
iv. risk_scores

Stores computed risk analysis results.

id (UUID, Primary Key)
session_id (Foreign Key → audio_sessions.id)
score (integer, 0–100)
level (safe / monitor / emergency)
explanation (text)
created_at (timestamp)
v. alerts

Stores emergency alert logs sent via Telegram or other channels.

id (UUID, Primary Key)
user_id (Foreign Key → users.id)
session_id (Foreign Key → audio_sessions.id)
alert_type (telegram / sms / call)
message (text)
status (sent / failed)
created_at (timestamp)
vi. ai_responses

Stores AI-generated explanations and recommendations.

id (UUID, Primary Key)
session_id (Foreign Key → audio_sessions.id)
summary (text)
recommendation (text)
model_used (string)
created_at (timestamp)
🔗 Relationship Flow

users → audio_sessions → audio_features → risk_scores → alerts → ai_responses



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