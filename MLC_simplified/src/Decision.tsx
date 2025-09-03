import { logUserAction } from "./utils/logger"
import type { PatientState } from "./main"
import "./style/decision.css"

type Props = {
    selectedPatientId: string;
    updatePatientState: (id: string, newState: Partial<any>) => void;
    currentPatientState: PatientState;
}

export default function Decision({ selectedPatientId, updatePatientState, currentPatientState }: Props) {

    const handleClick = (choice: string) => {
        const confirmed = window.confirm(`Are you sure about your choice: ${choice} ?`);
        if (confirmed) {
            logUserAction("decision_made", {
                decision: choice
            });
            updatePatientState(selectedPatientId, {
                finalDecision: choice,
                step: 3
            });
        } else {
            // User canceled the action
        }
    }

    return (
        <div className="decision-container">
            <h3>Did you agreee with the AI prediction ?</h3>
            <div className="buttons">
                <button className="disagree-button" onClick={() => handleClick("Disagree")}>Disagree</button>
                <button className="dk-button" onClick={() => handleClick("Don't know")}>Don't know</button>
                <button className="agree-button" onClick={() => handleClick("Agree")}>Agree</button>
            </div>
        </div>
    )
}