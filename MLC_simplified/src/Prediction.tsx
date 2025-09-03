import type { PatientState } from "./main"
import "./style/prediction.css"
import Decision from "./Decision";
import DivergingBarChart from "./components/DivergingBarChart";

type Props = {
  selectedPatientId: string;
  updatePatientState: (id: string, newState: Partial<any>) => void;
  currentPatientState: PatientState;
};

export default function Prediction({ selectedPatientId, updatePatientState, currentPatientState }: Props) {
  return (
    <div className="prediction-container">
      <div className="prediction-AI">
        <h1>SHAP Explanation</h1>
        {selectedPatientId && (
          <DivergingBarChart selectedPatientId={selectedPatientId} />
        )}
      </div>
      <Decision
        selectedPatientId={selectedPatientId}
        updatePatientState={updatePatientState}
        currentPatientState={currentPatientState}
      />
    </div>
  );
}
