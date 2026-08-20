# MedAssist+

AI-powered healthcare navigation and management platform. Streamlines patient triage, appointment booking, queue management, and medical report summarization through an intelligent multi-service architecture.

---

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Mobile App     │────▶│     Backend       │────▶│    AI Service     │
│   (Expo/RN)      │◀────│   (Express/TS)    │◀────│   (FastAPI/Py)    │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    MongoDB        │
                         │  (in-memory/Atlas)│
                         └──────────────────┘
```

| Service | Port | Tech |
|---------|------|------|
| `ai-service/` | `5001` | Python 3, FastAPI, Uvicorn, Pydantic |
| `backend/` | `4000` | Node.js 20+, Express 5, TypeScript, Mongoose |
| `mobile/` | Expo | React Native 0.86, Expo SDK 57, Expo Router |

---

## Features

- **Symptom Triage Chat** — Multi-turn AI conversation to assess symptoms and determine urgency (voice input + read-aloud supported)
- **AI Pre-Consultation Interview** — Collects patient basics and symptom follow-ups, then writes a structured summary for the doctor
- **AI Patient Summary** — Doctor consultation view with the AI summary, symptoms, urgency, and notes
- **AI Urgency Guidance** — Symptom Check assigns green / yellow / orange / red and applies it to booking
- **Smart Slot Recommendation** — Suggests times from doctor availability and estimated wait
- **Doctor Discovery** — Browse and search doctors by specialization
- **Appointment Management** — Book, view, and cancel appointments
- **Priority Queue** — Token, live position/ETA via WebSocket, doctor calling, and urgency-based priority
- **Medical Reports** — Upload reports and get AI-generated plain-language summaries
- **Report OCR Scan** — Photograph a paper report; tesseract.js extracts the text and the AI writes a plain-language summary
- **Prescriptions & Follow-ups** — Doctors write structured prescriptions after a consultation; patients get a digital copy
- **Health Timeline** — Every appointment, report, prescription, pre-consultation, and triage in one chronological journal
- **Family & Guardian Mode** — Link family accounts and view their health records
- **Notifications** — Appointment confirmation, reminder, queue position, and doctor availability (in-app inbox; Expo push optional)
- **Auth** — JWT-based registration, login, and role-based access (patient/doctor/admin)

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **Python** >= 3.10
- **npm** (comes with Node.js)

### 1. AI Service (Terminal 1)

Terminal 1:  cd ai-service && venv\Scripts\activate && python run.py
Terminal 2:  cd backend && npm run dev
Terminal 3:  cd mobile && npm start

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python run.py
```

Runs on `http://localhost:5001`. Works offline with rule-based triage by default. Set `LLM_API_KEY` in `.env` to enable LLM-powered responses.

### 2. Backend API (Terminal 2)

```bash
cd backend
npm install
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
npm run dev
```

Runs on `http://localhost:4000`. Uses in-memory MongoDB by default (auto-downloads on first run). Set `MONGODB_URI` in `.env` to use MongoDB Atlas.

### 3. Mobile App (Terminal 3)

```bash
cd mobile
npm install
npm start
```

Opens Expo dev tools. Press `w` for web, scan QR for mobile (Expo Go app).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | (required) | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `MONGODB_URI` | (empty) | MongoDB Atlas URI (empty = in-memory DB) |
| `DB_NAME` | `medassist` | Database name |
| `AI_SERVICE_URL` | `http://127.0.0.1:5001` | AI service base URL |
| `EXPO_ACCESS_TOKEN` | (empty) | Expo push notification token |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `BCRYPT_ROUNDS` | `10` | Password hashing rounds |

### AI Service (`ai-service/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_SERVICE_HOST` | `0.0.0.0` | Bind address |
| `AI_SERVICE_PORT` | `5001` | Service port |
| `LLM_API_URL` | (empty) | OpenAI-compatible API URL |
| `LLM_API_KEY` | (empty) | API key for LLM |
| `LLM_MODEL` | (empty) | Model name (e.g., `gpt-4o`) |

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| POST | `/api/auth/refresh` | Refresh JWT token |

### AI / Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/chat` | Send message, get AI response |
| POST | `/api/ai/triage` | One-shot symptom triage |

### Doctors
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/doctors` | List doctors (search, specialization filter) |
| GET | `/api/doctors/:id` | Get doctor details + availability |

### Appointments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/appointments` | List appointments (patient or doctor view) |
| POST | `/api/appointments` | Book an appointment |
| PATCH | `/api/appointments/:id` | Update appointment status |
| DELETE | `/api/appointments/:id` | Cancel appointment |

### Queue
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/queue/active` | Get current patient's active queue entry |
| POST | `/api/queue/join` | Join triage queue for an appointment |
| GET | `/api/queue/doctor/:id` | List doctor's queue |
| GET | `/api/queue/patient/:id` | List patient's queue |
| PATCH | `/api/queue/:id` | Update queue status (doctor/admin) |
| PATCH | `/api/queue/:id/override` | Override priority score (doctor/admin) |

Live updates: subscribe to Socket.IO room `queue:<queue_id>` (`queue:subscribe`/`queue:unsubscribe` events), receive `queue:update` events with position/ETA/status.

### Pre-consultation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/preconsult/start` | Start or resume the interview for an appointment |
| POST | `/api/preconsult/answer` | Submit the next answer |
| GET | `/api/preconsult/:appointmentId` | Fetch the stored interview / summary |

### Slots
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/slots/recommend` | Rank open slots by wait time and how soon they are |

### Doctor dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/doctor-dashboard/dashboard` | Upcoming appointments and queue snapshot |
| GET | `/api/doctor-dashboard/consultation/:appointmentId` | Patient details, AI summary, urgency, notes |
| POST | `/api/doctor-dashboard/notes` | Add a doctor note |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | In-app inbox for the current user |
| PATCH | `/api/notifications/:id/read` | Mark a notification as read |

### Prescriptions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/prescriptions` | Create prescription (doctor) |
| GET | `/api/prescriptions/me` | List own prescriptions |
| GET | `/api/prescriptions/patient/:patientId` | List a patient's prescriptions |
| GET | `/api/prescriptions/doctor` | List doctor's prescriptions |
| GET | `/api/prescriptions/:id` | Get prescription + doctor info |

### Health Timeline
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/timeline/me` | Own chronological health journal |
| GET | `/api/timeline/patient/:patientId` | Patient timeline (self, doctor, or linked guardian) |

### Family
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/family` | List linked family members |
| POST | `/api/family` | Link member by email (relation: parent/child/spouse/sibling/other) |
| DELETE | `/api/family/:userId` | Unlink family member |

### Report OCR Scan
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/scan` | Upload `image_base64`, get extracted text + AI summary |
| GET | `/api/scan/list` | List own scans |
| GET | `/api/scan/:id` | Get scan details |

### Medical Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports` | List user's reports |
| POST | `/api/reports` | Upload report + get AI summary |
| GET | `/api/reports/:id` | Get report details + summary |

### Patients
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/patients/me` | Get current patient profile |
| PATCH | `/api/patients/me` | Update patient profile |

---

## Project Structure

```
mediassist/
├── ai-service/           # Python FastAPI microservice
│   ├── app/
│   │   ├── agents/       # triage, preconsult, slot, report, appointment, queue agents
│   │   ├── config.py     # Environment config
│   │   └── main.py       # FastAPI app + route definitions
│   ├── tests/
│   ├── run.py            # Dev launcher
│   └── requirements.txt
├── backend/              # Node.js Express REST API
│   ├── src/
│   │   ├── config/       # Database, env, app config
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routers
│   │   ├── services/     # Business logic, AI client, notifications, realtime
│   │   ├── seed/         # Database seeder
│   │   └── utils/        # Helpers (idGen, logger, errors)
│   └── tests/
├── mobile/               # React Native / Expo mobile app
│   ├── app/
│   │   ├── (auth)/       # Login & register screens
│   │   ├── (tabs)/       # Home, AI chat, doctors, appointments, profile
│   │   ├── reports/      # Medical report detail + OCR scan screens
│   │   ├── prescriptions/ # Prescription list, detail, doctor write screen
│   │   ├── preconsult/   # AI pre-consultation interview
│   │   ├── doctor/       # Doctor profile + consultation view
│   │   ├── queue/        # Queue status screen (live WebSocket updates)
│   │   ├── notifications.tsx
│   │   ├── timeline.tsx  # Health timeline journal
│   │   └── family.tsx    # Family & guardian links
│   └── src/
│       ├── api/          # HTTP client, auth interceptors, socket.io client
│       ├── contexts/     # Auth provider
│       ├── services/     # Voice input (speech recognition + TTS)
│       └── types/        # TypeScript type definitions
└── README.md
```

---

## Scripts

### Backend
| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/server.ts` | Start with hot reload |
| `build` | `tsc` | Compile TypeScript |
| `start` | `node dist/server.js` | Run compiled build |
| `seed` | `tsx src/seed/seed.ts` | Seed database with sample data |
| `test` | `node --import tsx --test tests/*.test.ts` | Run tests |

### Mobile
| Script | Command | Description |
|--------|---------|-------------|
| `start` | `expo start` | Start Expo dev server |
| `web` | `expo start --web` | Start with web target |
| `android` | `expo start --android` | Start with Android emulator |
| `ios` | `expo start --ios` | Start with iOS simulator |

---

## License

MIT
