
# KnowPilot: A Human-Centered, Knowledge-Augmented Agent System for Private Domains

KnowPilot is an agent system designed for private domains, combining human-centered design with knowledge augmentation. It features a modern frontend, robust backend, and seamless AI integration for document management, knowledge retrieval, and collaborative writing.

---

## 🚀 Quick Start

### Prerequisites
- Install Docker
- Clone this repository:
```bash
git clone https://github.com/XeeKee/KnowPilot.git
```

### One-Click Startup

1. **Prepare Environment Variables**
   ```bash
   cd CollabThink-Re/CollabThink
   cp docker/env.example docker/.env
   # Edit docker/.env and fill in the following:
   # - SECRET_KEY (application secret, use a long random string)
   # - POSTGRES_PASSWORD (PostgreSQL database password)
   # - MODEL_API_KEY (Volcano Engine API key)
   # - SEARCH_API_KEY (Search API key, optional)
   ```

2. **Start Services**
   ```bash
   ./start.sh
   # Or start manually
   docker compose -f docker/docker-compose.yml up -d --build
   ```

3. **Access & Verification**
   - Frontend: `http://localhost`
   - Backend health check: `http://localhost:5000/api/health`
   - View logs (for troubleshooting):
     ```bash
     docker compose -f docker/docker-compose.yml logs -f backend
     docker compose -f docker/docker-compose.yml logs -f db
     docker compose -f docker/docker-compose.yml logs -f frontend
     ```

4. **Stop Services**
   ```bash
   ./stop.sh
   # Or stop manually
   docker compose -f docker/docker-compose.yml down
   ```

### 📁 Directory Structure & Key Configurations

- `docker/docker-compose.yml`
  - Uses named volume `postgres_data` for DB
  - Backend reads config from environment variables (not config files)
- `docker/config.docker.yaml`
  - Docker-specific config, uses environment variable placeholders
- `docker/.env`
  - Environment variable config file 
- `docker/env.example`
  - Example environment file, provides configuration guidance
- `front_end_re/`
  - Frontend static assets, mounted read-only in Nginx container
- `src_re/`
  - Flask backend and business logic

---

## 🔧 Development Environment

### Local Development (Non-Docker)
1. Create a Python virtual environment
2. Install dependencies: `pip install -r requirements.txt`
3. Set environment variables or edit `src_re/config.yaml`
4. Start: `python src_re/app.py`

### Environment Variables
| Variable         | Description                  | Required | Example                |
|------------------|-----------------------------|----------|------------------------|
| SECRET_KEY       | Flask app secret key        | Yes      | `your_secret_key_here` |
| POSTGRES_DB      | Database name               | Yes      | `KnowPilot`             |
| POSTGRES_USER    | Database username           | Yes      | `KnowPilot_user`        |
| POSTGRES_PASSWORD| Database password           | Yes      | `your_password`        |
| MODEL_API_KEY    | Volcano Engine API key      | Yes      | `your_api_key`         |
| SEARCH_API_KEY   | Search API key              | No       | `your_search_key`      |

---

## 🎯 Features

### Frontend
- **Chat Interface** (`chat.html`): Topic input, outline generation, article creation
- **Private Library Management** (`private_library.js`): Document upload, vector storage, knowledge retrieval
- **Article Generation** (`generate_article.js`): Section generation, editing, export
- **Outline Management** (`send_topic.js`): Outline generation, feedback, sorting

### Backend
- **AI Model Integration**: Supports Volcano Engine DeepSeek models
- **Vector Database**: ChromaDB integration for document vector storage
- **Search Enhancement**: External search engine integration for real-time information
- **Session Management**: User session state management, multi-user concurrency

---

## 📚 Tech Stack

- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Backend**: Flask + SQLAlchemy + PostgreSQL
- **AI/ML**: LangChain + Sentence Transformers + ChromaDB
- **Deployment**: Docker + Docker Compose + Nginx
- **Database**: PostgreSQL + ChromaDB vector storage

---

## 📄 License


This project is licensed under the MIT License. See the LICENSE file for details.
