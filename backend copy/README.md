# GRC Copilot — Backend System

Full-stack compliance assessment platform backend built with **Node.js (Express)** as the API gateway and **FastAPI (Python)** as the analysis engine.

---

## Architecture Overview

```
Client (React/PWA)
      │
      ▼
Node.js API Gateway (Port 3000)
  ├── Auth Service        → PostgreSQL
  ├── Organization Service → PostgreSQL
  ├── Questionnaire Service → MongoDB (question bank)
  ├── Response Service    → PostgreSQL + file uploads
  └── Dashboard Service   → MongoDB (reports)
      │  (internal HTTP)
      ▼
FastAPI Analysis Engine (Port 8000)
  ├── Scoring Engine      → compliance score
  ├── Risk Analysis       → risk register + matrix
  ├── Gap Analysis        → control gaps
  ├── Controls Mapping    → framework controls
  ├── Recommendations     → prioritized actions
  ├── Cost Estimation     → INR-based cost model
  ├── PDF Generator       → ReportLab
  └── DOCX Generator      → python-docx
      │
      ▼
Databases
  ├── PostgreSQL: users, orgs, assessments, responses, evidence, risk priorities
  └── MongoDB: question bank, full reports
```

---

## Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 16+
- MongoDB 7+
- Docker + Docker Compose (optional but recommended)

---

## Quick Start with Docker

```bash
# 1. Clone and enter the project
cd grc-backend

# 2. Start all services
docker-compose up -d

# 3. Check health
curl http://localhost:3000/health
curl http://localhost:8000/health
```

---

## Manual Setup

### Node.js Gateway

```bash
cd node-gateway

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# Create logs directory
mkdir -p logs uploads

# Start development server
npm run dev

# Start production server
npm start
```

### FastAPI Engine

```bash
cd fastapi-engine

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Create output directories
mkdir -p reports logs

# Start development server
uvicorn main:app --reload --port 8000

# Start production server
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/auth/profile` | JWT | Get current user profile |
| PUT | `/api/auth/change-password` | JWT | Change user password |

**Register:**
```json
POST /api/auth/register
{
  "email": "user@acme.com",
  "password": "SecurePass123!",
  "org_name": "Acme Corp"
}
```

**Login:**
```json
POST /api/auth/login
{
  "email": "user@acme.com",
  "password": "SecurePass123!"
}
// Returns: { "token": "eyJ...", "user_id": "...", "expires_in": 86400 }
```

---

### Organization

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/organization/setup` | JWT | Create/update org + start assessment |
| GET | `/api/organization/:id` | JWT | Get org with all assessments |
| GET | `/api/organization` | JWT | List user's organizations |
| PUT | `/api/organization/:id` | JWT | Update org details |

**Setup:**
```json
POST /api/organization/setup
Authorization: Bearer <token>
{
  "name": "Acme Corp",
  "industry": "Technology",
  "region": "Mumbai, India",
  "employee_range": "51-200",
  "contact_name": "Jane Smith",
  "frameworks": ["ISO 27001", "DPDP Act"],
  "analysis_depth": "intermediate"
}
// Returns: { "org_id": "...", "assessment_id": "..." }
```

---

### Questionnaire

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/questionnaire/generate?assessment_id=X` | JWT | Get filtered question set |
| GET | `/api/questionnaire/frameworks` | JWT | List all frameworks and depths |

---

### Responses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/responses/submit` | JWT | Submit answers (triggers analysis if `is_final: true`) |
| GET | `/api/responses/:assessmentId` | JWT | Get all responses for an assessment |
| POST | `/api/responses/:assessmentId/evidence/:questionId` | JWT | Upload evidence files |
| DELETE | `/api/responses/:assessmentId/evidence/:fileId` | JWT | Delete evidence file |

**Submit responses:**
```json
POST /api/responses/submit
Authorization: Bearer <token>
{
  "assessment_id": "uuid-here",
  "responses": [
    { "question_id": "iso-gov-001", "answer_index": 0, "category": "Governance" },
    { "question_id": "iso-acc-001", "answer_index": 2, "category": "Access Control" }
  ],
  "risk_priorities": {
    "r-001": "critical",
    "r-003": "high"
  },
  "is_final": true
}
```

### Dashboard & Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/:assessmentId` | JWT | Full dashboard metrics |
| GET | `/api/dashboard` | JWT | List all assessments |
| GET | `/api/reports/:reportId` | JWT | Full report document |
| GET | `/api/reports/:reportId/sections/:section` | JWT | Single report section |

---

### AI Compliance Agent

The AI Compliance Agent is a specialized tool that extracts security controls from policy documents and maps them to frameworks.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/agent/compliance/upload-policy` | JWT | Upload a policy document (PDF, DOCX, TXT) |
| POST | `/api/agent/compliance/run` | JWT | Run the full mapping agent on a document |
| GET | `/api/agent/compliance/report/:reportId` | JWT | Get a structured mapping report |

**Capabilities:**
- **Parsing:** Automated text extraction from PDF, DOCX, and TXT files.
- **Extraction:** Pattern-based and keyword-based identification of security controls.
- **Mapping:** Intelligence-driven mapping to ISO 27001, GDPR, and SOC 2.
- **Gap Analysis:** Identification of missing controls based on mapped data.
- **Risk Identification:** Conversion of gaps into potential business risks.
- **Remediation:** Actionable recommendations for closing gaps.

---

### FastAPI (Internal — called by Node.js)

- Compliance score + risk level
- Domain breakdown scores
- Control status (implemented/partial/missing)
- Cost metrics (total + critical)
- Top 3 recommendations
- Cyber insurance advisory
- Implementation timeline

---

### FastAPI (Internal — called by Node.js)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analysis/generate-report` | Full analysis pipeline |
| GET | `/analysis/report/:reportId` | Retrieve report |
| GET | `/analysis/report/assessment/:assessmentId` | Report by assessment |
| GET | `/analysis/report/:reportId/sections/:section` | Report section |

---

## Database Schema

### PostgreSQL Tables

- **users** — id, email, password_hash, role, is_active
- **organizations** — id, user_id, name, industry, region, employee_range, frameworks[], analysis_depth
- **assessments** — id, org_id, user_id, framework, depth, status, compliance_score, risk_level, report_id
- **responses** — id, assessment_id, question_id, answer_index, category
- **evidence_files** — id, response_id, assessment_id, question_id, original_name, file_path, file_size
- **risk_priorities** — id, assessment_id, risk_id, priority

### MongoDB Collections

- **questions** — question_id, framework, category, text, options, depth_levels, control_ids, weight
- **reports** — full analysis report documents (JSON)

---

## Scoring Logic

Answer indexes map to compliance scores:
- `0` = 100% (fully implemented)
- `1` = 65% (partially implemented)
- `2` = 30% (in draft/planning)
- `3` = 0%  (not implemented)

Risk levels:
- **Low**: score ≥ 75%
- **Medium**: score 50–74%
- **High**: score 25–49%
- **Critical**: score < 25%

---

## Supported Frameworks

| Category | Frameworks |
|----------|-----------|
| Data Protection & Privacy | GDPR, DPDP Act, CCPA, PDPA |
| Information Security Standards | ISO/IEC 27001, 27701, 27017, 27018 |
| Industry-Specific | HIPAA, PCI-DSS, SOC 2, RBI Guidelines |
| Cybersecurity Frameworks | NIST CSF, CIS Controls, NIST SP 800-53 |

---

## Future Integrations (Plug-in Points)

- **AI Analysis**: Replace `scoring_engine.py` functions with Anthropic API calls
- **Rule Engine**: Swap static templates for a Drools or Python rule engine
- **ML Risk Models**: Insert sklearn/PyTorch models in `build_risk_analysis()`
- **Real-time**: Add Socket.IO to Node.js for live analysis progress updates
- **External APIs**: Connect to NIST NVD, CVE databases for live control validation
- **Redis**: Add caching layer for questionnaire and dashboard queries

---

## Project Structure

```
grc-backend/
├── docker-compose.yml
├── node-gateway/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js              # Express app entry point
│       ├── config/
│       │   ├── postgres.js        # PG pool + migrations
│       │   ├── mongo.js           # Mongoose + schemas
│       │   └── logger.js          # Winston logger
│       ├── middleware/
│       │   ├── auth.js            # JWT middleware
│       │   └── errorHandler.js    # Error + 404 handlers
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── organization.routes.js
│       │   ├── questionnaire.routes.js
│       │   ├── response.routes.js
│       │   └── dashboard.routes.js
│       └── services/
│           └── analysis.service.js # FastAPI bridge
└── fastapi-engine/
    ├── Dockerfile
    ├── requirements.txt
    ├── .env.example
    ├── main.py                    # FastAPI app entry point
    └── app/
        ├── core/
        │   └── database.py        # asyncpg + motor connections
        ├── models/
        │   └── schemas.py         # Pydantic models
        ├── routers/
        │   ├── analysis.py        # Analysis pipeline router
        │   └── health.py
        └── services/
            ├── scoring_engine.py  # Core scoring + analysis logic
            ├── report_store.py    # MongoDB persistence
            ├── pdf_generator.py   # ReportLab PDF
            └── docx_generator.py  # python-docx DOCX
```
