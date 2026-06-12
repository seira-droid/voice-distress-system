# AI-Based Adaptive Voice Distress Detection and Risk Scoring Emergency Alert System

## 📌 Project Overview
This project is an AI-powered voice safety system that analyzes user speech in real-time to detect distress conditions and generate smart emergency responses.

Instead of simple keyword-based alert systems, it uses a multi-layer AI decision pipeline that evaluates risk before triggering any action.

---

## 🚨 Problem Statement
In emergency situations, users such as elderly individuals, women in unsafe environments, or people experiencing panic attacks may not be able to manually trigger help.

Existing systems are limited because:
- They rely on manual SOS triggers
- They use simple keyword detection
- They generate false alerts or miss real emergencies

This system solves these issues using AI-driven risk analysis.

---

## 🧠 Core Idea
Voice Input → Feature Extraction → AI Analysis → Risk Scoring → Decision Engine → LLM Explanation → Alert Logging

---

## ⚙️ Key Features (MVP)

- Voice input processing and feature extraction  
- AI-based distress detection (emotion + wake words)  
- Risk scoring engine with weighted signals  
- LLM-generated explanation of risk decisions  
- Alert logging and event tracking system  

---

## 🧩 System Architecture

Client (Streamlit / Postman)
↓
Django REST API
↓
Voice Processing Module
↓
Risk Scoring Engine
↓
Supabase Database
↓
LLM AI Engine
↓
Response API (risk + explanation + action)

---

## 🛠️ Tech Stack

- Python
- Django REST Framework
- Supabase (Database + Auth + RLS)
- OpenAI / Claude API (AI reasoning layer)
- Librosa (Audio feature extraction)
- Streamlit (optional UI)
- Railway (Deployment)
- Swagger (API Documentation)

---

## 🗄️ Database Overview

- Users
- Voice Sessions
- Risk Analysis Records
- Alerts Log

---

## 🔑 Key Innovation

This system does NOT directly trigger alerts.

Instead it follows:
**Detect → Analyze → Score → Verify → Explain → Act**

This reduces false alerts and improves decision reliability.

---

## 📊 AI Integration (Mandatory Requirement)

- Classification: risk level detection  
- Text Analysis: emotion + distress interpretation  
- Content Generation: explanation of emergency decision  
- Function-like behavior: decides escalation level  

---

## 🚀 Project Status
MVP Phase – Backend Design + AI Pipeline Definition

---


## Feature 1 - Emergency Contact API

- Feature 1 API successfully implemented using Django REST Framework
- JWT authentication integrated
- Full CRUD operations (Create, Read, Update, Delete) completed via ViewSet
- API tested using Postman
- Postman collection exported and added to repository
- Code merged into main branch and pushed to GitHub
"# CI test trigger" 


## CI Status

![Django Pytest CI](https://github.com/seira-droid/voice-distress-system/actions/workflows/pytest-ci.yml/badge.svg)
