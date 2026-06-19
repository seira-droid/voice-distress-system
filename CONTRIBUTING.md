# Contributing to Voice Distress System

Thank you for your interest in contributing to the Voice Distress System.

## Getting Started

1. Fork the repository.
2. Clone your fork locally.

```bash
git clone <your-fork-url>
cd voice-distress-system
```

3. Create and activate a virtual environment.

```bash
python -m venv venv
venv\Scripts\activate
```

4. Install dependencies.

```bash
pip install -r requirements.txt
```

5. Apply migrations.

```bash
python manage.py migrate
```

6. Start the development server.

```bash
python manage.py runserver
```

---

## Development Guidelines

* Follow Python and Django best practices.
* Write clear and readable code.
* Add comments and docstrings where necessary.
* Keep API responses consistent.
* Test changes before submitting.

---

## Branch Naming

Use descriptive branch names:

```text
feature/add-contact-validation
fix/swagger-documentation
docs/update-readme
```

---

## Commit Message Format

Examples:

```text
feat: add emergency contact validation
fix: resolve trigger word update bug
docs: improve API documentation
refactor: clean voice analysis service
```

---

## Pull Request Process

1. Create a feature branch.
2. Make your changes.
3. Test thoroughly.
4. Commit your changes.
5. Push to GitHub.
6. Open a Pull Request with a clear description.

---

## Reporting Issues

When reporting bugs, include:

* Steps to reproduce
* Expected behavior
* Actual behavior
* Screenshots (if applicable)
* Environment details

---

## Code of Conduct

Be respectful and constructive when contributing to the project.
