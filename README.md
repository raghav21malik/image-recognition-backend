# Image Recognition Monorepo

This repository contains both services for the image recognition project in one place.

## Structure

```
image-recognition/
├── backend/   # Flask API (Python)
└── frontend/  # Static web client (HTML/CSS/JS)
```

## Backend (`/backend`)

- Framework: Flask
- Entrypoint: `backend/app.py`
- Dependencies: `backend/requirements.txt`

### Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python app.py
```

API runs at `http://localhost:5000` by default.

## Frontend (`/frontend`)

- Static HTML/CSS/JS app
- Main page: `frontend/index.html`

### Run locally

Open `frontend/index.html` in your browser, or serve it with a local static server.

## Deploying together

- Deploy backend from `/backend` using `backend/render.yaml`.
- Deploy frontend from `/frontend` using any static hosting provider.
- Keep API base URL in frontend configuration aligned with deployed backend URL.

## History preservation

- Backend history is preserved through `git mv` into `/backend`.
- Frontend history is preserved by importing `raghav21malik/image-recognition-frontend` with `git subtree` into `/frontend`.
