import accountIcon from "./assets/account.png";
import { useEffect, useState } from "react";
import { logUserAction } from "./utils/logger";
import './style/sidebar.css';

type PatientVitals = {
    [key: string]: string | number | null;
}

type Props = {
    selectedPatientId: string | null;
    setSelectedPatientId: (id: string | null) => void;
    showAIPrediction?: boolean;
};

export default function Sidebar({ selectedPatientId, setSelectedPatientId, showAIPrediction }: Props) {
    const [vitals, setVitals] = useState<PatientVitals | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [probability, setProbability] = useState<number | null>(null);
    const username = localStorage.getItem("username") || "unknown";
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return localStorage.getItem('isAuthenticated') === 'true';
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`http://127.0.0.1:8000/vitals/${selectedPatientId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error || !data.vitals) {
                    setError(data.error);
                    setVitals(null);
                } else {
                    setVitals({ ...data.vitals, id_patient: data.id_patient });
                    setError(null);
                }
            })
            .catch((err) => {
                setError("Error fetching patient data");
                console.error(err);
            });
    }, [selectedPatientId]);

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
                    setProbability(data.prediction_proba);
                }
            })
            .catch(err => {
                console.error("Error fetching prediction:", err);
                setProbability(null);
            });
    }, [selectedPatientId]);


    const renderValue = (val: any) =>
        val !== undefined && val !== null
            ? typeof val === 'number' ? Math.trunc(val) : val
            : <span className="loading-text">Loading...</span>;

    const handleLogout = () => {
        logUserAction("logout", { user: username });
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("isAuthenticated");
        setIsAuthenticated(false);
        window.location.reload();
    }

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="buttons">
                    <div className='column-50'>
                        <button className="return-button" onClick={() => {
                            logUserAction("return_to_patient_list", { from_patient_id: selectedPatientId });
                            setSelectedPatientId(null);
                        }}>
                            BACK
                        </button>
                    </div>
                    <div className='column-50'>
                        <button className="logout-button" title='Logout' onClick={handleLogout}>
                            LOG OUT
                        </button>
                    </div>
                </div>
            </div>

            <div className="sidebar-corp">
                <img src={accountIcon} alt="Account Icon" className="account-icon" />
                <table className="account-info">
                    <tr>
                        <th>Age:</th>
                        <td>{renderValue(vitals?.Age)}</td>
                    </tr>
                </table>
            </div>

            <div className="sidebar-diagnosis">
                <h2>Diagnosis</h2>
                <p>Metastatic Lung Cancer</p>
            </div>

            {showAIPrediction && (
                <div className="sidebar-info-box">
                    <h2>Predicted Risk of Death in the next 30 days</h2>
                    {probability !== null ? (
                        <p className={((1 - probability) * 100) < 45 ? 'green-text' : 'orange-text'}>
                            {Math.round((1 - probability) * 100)}%
                        </p>
                    ) : (
                        <p>Loading...</p>
                    )}
                </div>
            )}

            <div className="sidebar-footer">
                <table className="account-id">
                    <tr>
                        <td>ID:</td>
                        <td>{renderValue(vitals?.id_patient)}</td>
                    </tr>
                </table>
            </div>
        </div>
    )
}