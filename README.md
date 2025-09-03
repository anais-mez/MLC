# MLC

This project provides an interactive visual interface to help clinicians understand **SHAP  (SHapley Additive exPlanations)** values and their influence on machine learning predictions.
It  was developed as part of a research study to evaluate **wheter presentign SHAP explanations in a tailored interface could improve clinicians' understanding of model decisions and reduce overtrust** in AI systems.

## 📚 Project Overview

- 🔬 **Goal**: Support interpretability and critical thinking when using AI in clinical decision-making
- 📊 **Frontend**: Interactive SHAP charts with custom guidance
- 🧠 **Backend**: API delivering model predictions and SHAP explanations
- 🔐 **Authentication**: JWT-based user login and logging

---

## 🧪 Project Purpose

The core research questions are:

- **Does visualizing SHAP values improve interpretability** for medical professionals?
- **Can proper explanations reduce the risk of overtrust** in AI predictions?

To explore these questions, this tool presents SHAP values through interactive charts, textual guidance, and contextual warnings to support critical thinking and reflection.

---

##  🏗 Project Structure

```
project-root/
├── API/ # FastAPI backend
│ ├── main.py # API routes
│ ├── scripts/ # Model & SHAP logic (model.joblib, etc.)
│ ├── data/ # Dataset, Mapping & Logs
│ └── requirements.txt # Python dependencies
│
├── MLC_enriched/ # React frontend, App with explanations (Vite)
│ ├── src/
│ ├── public/
│ └── package.json # JS dependencies
│
├── MLC_simplified/ # React frontend, App with just SHAP (Vite)
│ ├── src/
│ ├── public/
│ └── package.json # JS dependencies
│
└── README.md # You're here :)
```

---

## ⚙️ Installation Instructions

### 🔧 1. Clone the repository

```bash
git clone https://github.com/anais-mez/MLC.git
cd MLC
```

### 🧪 2. Backend Setup (FastAPI + SHAP)

```bash
cd API
pip install -r requirements.txt

# Run the API
uvicorn main:app --reload
```

By default, the API runs at:
http://127.0.0.1:8000

✅ Make sure your scripts/model.joblib file exists, or retrain and save the model.

### 🖥️ 3. Frontend Setup (React + Vite)

```bash
cd ../MLC_enriched
npm install
npm run dev
```

This starts the frontend at:
http://127.0.0.1:4000

For the MLC_simplified, do the same things and this starts the frontend at:
http://127.0.0.1:5173

### 🔐 Authentication

This application uses **JWT (JSON Web Token)** for authenticating API requests via the `Authorization` header using the **Bearer** scheme.

To function correctly, the frontend expects the following values to be present in the browser's `localStorage`:

- `token`: the JWT used to authenticate API requests
- `username`: the username of the logged-in user

These values are used to:

- ✅ Add the header `Authorization: Bearer <token>` to all API requests
- 📝 Log user interactions (e.g., tab switches) via authenticated calls to the logging endpoint

---

## ❗ Disclaimer

This tool is for **research and educational purposes only**. It does **not provide clinical advice**, and its predictions or explanations should not be used to make real-world decisions.

Always apply professional and clinical judgment.