import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import { logUserAction } from "./utils/logger";
import './style/index.css'
import Login from './Login'
import PatientList from './PatientList'
import Sidebar from './Sidebar'
import Patient from './Patient'
import Prediction from './Prediction'
import Slider from './components/Slider'
import Modal from './components/Modal'

export type PatientState = {
  step: number;
  decisionMade: boolean;
  decisionError: boolean;
  initialDecision: number | null;
  showAIPrediction: boolean;
  probability: number | null;
  finalDecision?: string;
}


function DashboardApp() {
  type PatientStateMap = Record<string, PatientState>;

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientsState, setPatientsState] = useState<PatientStateMap>({});
  const patientStatuses: Record<string, 'seen' | 'in_progress' | 'not_seen'> = {};

  const getOrInitPatientState = (id: string): PatientState => {
    return patientsState[id] || {
      step: 0,
      decisionMade: false,
      decisionError: false,
      initialDecision: null,
      showAIPrediction: false,
      probability: null,
    }
  }

  const updatePatientState = (id: string, newState: Partial<PatientState>) => {
    setPatientsState((prev) => ({
      ...prev,
      [id]: {
        ...getOrInitPatientState(id),
        ...newState,
      },
    }));
  };

  const currentPatientState = selectedPatientId ? getOrInitPatientState(selectedPatientId) : null;

  useEffect(() => {
    if (!selectedPatientId) return;

    const token = localStorage.getItem("token");

    fetch(`http://localhost:8000/predict/${selectedPatientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log("Prediction data received:", data);
        if (data.prediction_proba !== undefined) {
          updatePatientState(selectedPatientId!, { probability: data.prediction_proba });
        }
      })
      .catch(err => {
        console.error("Error fetching prediction:", err);
        updatePatientState(selectedPatientId!, { probability: null });
      });
  }, [selectedPatientId]);

  useEffect(() => {
    if (currentPatientState?.step === 1) {
      updatePatientState(selectedPatientId!, { decisionMade: false });
    }
  }, [currentPatientState?.step]);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  Object.entries(patientsState).forEach(([id, state]) => {
    if (state.finalDecision !== undefined) {
      patientStatuses[id] = 'seen';
    } else if (state.step > 0) {
      patientStatuses[id] = 'in_progress';
    } else {
      patientStatuses[id] = 'not_seen';
    }
  });

  if (!selectedPatientId) {
    return (
      <PatientList
        onSelectPatient={(id: string) => setSelectedPatientId(id)}
        patientStatuses={patientStatuses}
      />
    );
  }

  const handleNextStepWithValidation = () => {
    if (!currentPatientState?.decisionMade) {
      updatePatientState(selectedPatientId!, { decisionError: true });
    } else {
      const confirm = window.confirm(
        `Are you sure you want to submit your initial decision? You won't be able to change it later.\n\nYour initial decision: ${currentPatientState?.initialDecision !== null ? currentPatientState.initialDecision : 'N/A'}`
      );
      if (!confirm) return;
      logUserAction("initial_decision", {
        id_patient: selectedPatientId,
        decision: currentPatientState?.initialDecision,
      });
      updatePatientState(selectedPatientId!, {
        decisionError: false,
        step: (currentPatientState?.step ?? 0) + 1
      });
    }
  };

  return (
    <StrictMode>
      <div className="main-container">
        <Sidebar
          selectedPatientId={selectedPatientId}
          setSelectedPatientId={setSelectedPatientId}
          showAIPrediction={currentPatientState?.showAIPrediction}
        />
        <div className="dashboard">
          <div className="data-view">
            {currentPatientState?.step === 3 ? (
              <div className="final-decision-container">
                <div className='final-decision'>
                  <h2>Final Decision</h2>
                  <p>Your final decision is: <strong>{currentPatientState?.finalDecision}</strong></p>
                  <p className="info-message">
                    ✅ You have already reviewed this patient.<br />
                    👉 Please go back and select a new patient to continue.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Patient selectedPatientId={selectedPatientId} />

                {currentPatientState && currentPatientState.step >= 1 &&
                  <Prediction
                    selectedPatientId={selectedPatientId}
                    updatePatientState={updatePatientState}
                    currentPatientState={currentPatientState}
                  />
                }

                {currentPatientState?.step === 0 && (
                  <div className="step0">
                    <p>
                      Check the patient information below.
                      Take the time to fully understand the data.
                      You will need to predict the patient's risk of death within the next 30 days. <br />  <br />
                      Record your initial decision based on the patient data.
                      You will later compare it with the model’s prediction. <br />
                      Please estimate the <strong>risk of death within the next 30 days</strong> for this patient.
                    </p>
                    <Slider onDecisionMade={(value) => {
                      updatePatientState(selectedPatientId!, { initialDecision: value, decisionMade: true, decisionError: false });
                    }} />
                    <button className="button-step" onClick={handleNextStepWithValidation}>
                      Next step, you will see the AI prediction 🢂
                    </button>
                    {currentPatientState?.decisionError && (
                      <p className="error-message">
                        ⚠️ Please make a decision before proceeding.
                      </p>
                    )}
                  </div>
                )}

                {currentPatientState?.step === 1 && (
                  <div className="step2">
                    <Modal isOpen={true} onClose={() => {
                      updatePatientState(selectedPatientId!, {
                        showAIPrediction: true,
                        step: (currentPatientState?.step ?? 1) + 1,
                      });

                      logUserAction("view_ai_prediction", {
                        id_patient: selectedPatientId,
                      });
                    }}>
                      <h2>AI Prediction</h2>
                      <p>
                        The AI predicts a {currentPatientState?.probability !== null ? (
                          <span className={((1 - currentPatientState?.probability) * 100) < 45 ? 'green-text' : 'orange-text'}>
                            {Math.round((1 - currentPatientState?.probability) * 100)}%
                          </span>
                        ) : (
                          <span>Loading...</span>
                        )} risk of death within the next 30 days.
                      </p>
                    </Modal>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<DashboardApp />);
