from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import lru_cache
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import shap
import joblib
import json
import pandas as pd
import os
import socket
from sklearn.impute import SimpleImputer

app = FastAPI()

security = HTTPBearer()
API_TOKEN = "M58-L35-C62"

def authenticate(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing token",
        )

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the API"}

if __name__ == "__main__":
    import uvicorn
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"🌐 Access your API at http://{local_ip}:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# --------------------- LOGS -------------------------

ACTION_FILE = "data/user_actions.json"

def load_actions():
    if not os.path.exists(ACTION_FILE):
        return {}
    try:
        with open(ACTION_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return {}
    
def save_actions(data):
    with open(ACTION_FILE, "w") as f:
        json.dump(data, f, indent=2)

@app.post("/log_action")
def log_action(payload: dict, auth: HTTPAuthorizationCredentials = Depends(authenticate)):
    try:
        data = load_actions()

        username = payload.get("username")
        action = payload.get("action")
        timestamp = payload.get("timestamp")
        details = payload.get("details", {})

        if not username or not action or not timestamp:
            return {"error": "Missing username, action or timestamp"}

        if username not in data:
            data[username] = []

        data[username].append({
            "action": action,
            "timestamp": timestamp,
            "details": details
        })

        save_actions(data)

        return {"status": "ok"}

    except Exception as e:
        import traceback
        traceback.print_exc()  # ça va afficher l'erreur complète dans la console
        return {"error": str(e)}

# ---------------------- APP ----------------------------- 

df_full = pd.read_csv("data/echantillon_20.csv")
df_full['id_patient'] = df_full['id_patient'].astype(str)

df_fake = pd.read_csv("data/echantillon_20_false.csv")
df_fake['id_patient'] = df_fake['id_patient'].astype(str)

df_all_patients = pd.concat([df_full, df_fake], ignore_index=True).drop_duplicates(subset=['id_patient'])

model = joblib.load("scripts/model.joblib")

cols_to_drop = [
    'id_patient', 'days_from_diag', 'contact', 'bl_comorb_CVA', 'bl_comorb_connect',
    'bl_comorb_diabetes1', 'bl_comorb_infarct', 'bl_comorb_met', 'bl_comorb_ulcer', 'bl_comorb_vascular',
    'bl_diag_DC18', 'bl_diag_DC44', 'bl_diag_DC50', 'bl_diag_DC61', 'bl_diag_DC67',
    'bl_side_effect_anemia', 'bl_side_effect_bact_inf', 'bl_side_effect_constip', 'bl_side_effect_diarrhea',
    'drug_prn0_A02BC05_cumul', 'drug_prn0_A03FA01_cumul', 'drug_prn0_L01CB01_cumul', 'drug_prn0_R06AA04_cumul',
    'RT_BWGC1_30d', 'drug_prn0_A02BA02_30d'
]

X_train_for_imputer = df_full.drop(columns=cols_to_drop, errors='ignore')
X_train_for_imputer = X_train_for_imputer.apply(pd.to_numeric, errors='coerce')

imputer = SimpleImputer(strategy='median')
imputer.fit(X_train_for_imputer)

def load_column_mapping(filepath: str) -> dict:
    df = pd.read_csv(filepath)
    df.columns = df.columns.str.strip()
    col_code = df.columns[0]
    col_label = df.columns[1]
    return dict(zip(df[col_code], df[col_label]))

column_mapping = load_column_mapping("data/mapping.csv")

@lru_cache(maxsize=1)
def get_patient_table():
    display_columns = ["id_patient", "age"]
    for col in display_columns:
        if col not in df_all_patients.columns:
            df_all_patients[col] = None
    return df_all_patients[display_columns].fillna("").to_dict(orient="records")

@app.get("/patients")
def list_patients(
    skip: int = 0,
    limit: int = 50,
    id_patient: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    auth: HTTPAuthorizationCredentials = Depends(authenticate)
):
    try:
        df_filtered = df_all_patients[['id_patient', 'age']].copy()

        if id_patient:
            df_filtered = df_filtered[df_filtered['id_patient'].str.contains(id_patient, case=False, na=False)]
        if age_min is not None:
            df_filtered = df_filtered[df_filtered['age'].apply(lambda x: isinstance(x, (int, float)) and x >= age_min)]
        if age_max is not None:
            df_filtered = df_filtered[df_filtered['age'].apply(lambda x: isinstance(x, (int, float)) and x <= age_max)]

        df_filtered['id_patient'] = df_filtered['id_patient'].astype(int)
        df_filtered = df_filtered.sort_values(by='id_patient')
        df_filtered['id_patient'] = df_filtered['id_patient'].astype(str)

        total = len(df_filtered)
        paginated = df_filtered.iloc[skip: skip + limit]

        patients_list = paginated.fillna("").to_dict(orient="records")
        
        return {
            "patients": patients_list,
            "total": total
        }
    
    except Exception as e:
        return {"error": str(e)}

@app.get("/vitals/{id_patient}")
def get_values(id_patient: str, auth: HTTPAuthorizationCredentials = Depends(authenticate)):
    try:
        patient_rows = df_all_patients[df_all_patients['id_patient'] == id_patient]
        if patient_rows.empty:
            return {"error": "Patient not found"}

        vitals = patient_rows.iloc[0].to_dict()
        vitals = {k: (None if pd.isna(v) else v) for k, v in vitals.items()}
        
        vitals_mapped = {
            column_mapping.get(k, k): v 
            for k, v in vitals.items() if k in column_mapping
        }

        return {
            "id_patient": id_patient,
            "vitals": vitals_mapped
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/shap/{id_patient}")
def compute_shap(id_patient: str, auth: HTTPAuthorizationCredentials = Depends(authenticate)):
    try:
        id_patient = str(id_patient).strip()
        
        if id_patient in df_fake['id_patient'].values:
            row = df_fake[df_fake['id_patient'] == id_patient]
            if 'shap_data' in row.columns and pd.notna(row.iloc[0]['shap_data']):
                shap_data = json.loads(row.iloc[0]['shap_data'])
                return shap_data
            else:
                return {"error": "SHAP values not found"}
            
        elif id_patient in df_full['id_patient'].values:
            row = df_full[df_full['id_patient'] == id_patient]
            
            X_patient = row.drop(columns=cols_to_drop, errors='ignore')
            X_patient = X_patient.apply(pd.to_numeric, errors='coerce')

            # SHAP
            explainer = shap.Explainer(model)
            shap_values = explainer(X_patient)
            shap_values_patient = shap_values[0]            
            
            print("X_patient columns:", X_patient.columns)
            print("shap_values_patient:", shap_values_patient.values)

            shap_df = pd.DataFrame({
                'feature': X_patient.columns,
                'shap_value': shap_values_patient.values,
                'feature_value': X_patient.iloc[0].values
            })
            shap_df['abs_val'] = shap_df['shap_value'].abs()
            shap_df_sorted = shap_df.sort_values(by='abs_val', ascending=False).head(10)
            shap_df_sorted['label'] = shap_df_sorted.apply(
                lambda row: f"{row['feature']}: {row['feature_value']}", axis=1
            )

            shap_data = []
            for _, row in shap_df_sorted.iterrows():
                feature_name = column_mapping.get(row['feature'], row['feature'])
                shap_data.append({
                    'feature': feature_name,
                    'shap_value': float(row['shap_value']),
                    'feature_value': float(row['feature_value']),
                    'label_with_value': row['label']
                })

            return {
                "id_patient": id_patient,
                "shap_values": shap_data
            }
            
        else:
            return {"error": "Patient not found in either dataset."}

    except Exception as e:
        return {"error": str(e)}
    
@app.get("/predict/{id_patient}")
def predict_patient(id_patient: str, auth: HTTPAuthorizationCredentials = Depends(authenticate)):
    try:
        id_patient = str(id_patient).strip()
        
        if id_patient in df_fake['id_patient'].values:
            row = df_fake[df_fake['id_patient'] == id_patient]
            return {
                "id_patient": id_patient,
                "prediction_proba": float(row.iloc[0]["prediction_proba"]),
                "prediction_class": int(row.iloc[0]["prediction_class"]),
            }
            
        elif id_patient in df_full['id_patient'].values:
            row = df_full[df_full['id_patient'] == id_patient]

            X_patient = row.drop(columns=cols_to_drop, errors='ignore')
            X_patient = X_patient.apply(pd.to_numeric, errors='coerce')

            X_patient = X_patient.reindex(columns=X_train_for_imputer.columns)        
            X_patient_imputed = pd.DataFrame(imputer.transform(X_patient), columns=X_patient.columns)

            prediction_proba = model.predict_proba(X_patient_imputed)[0][1]
            prediction_class = model.predict(X_patient_imputed)[0]

            return {
                "id_patient": id_patient,
                "prediction_proba": round(float(prediction_proba), 3),
                "prediction_class": int(prediction_class),
            }
        else:
            return {"error": "Patient not found in either dataset."}

    except Exception as e:
        return {"error": str(e)}
