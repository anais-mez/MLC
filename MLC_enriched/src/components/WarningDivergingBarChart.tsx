import "../style/warningDivergingBarChart.css";
import { useEffect, useState } from "react";
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Loader from "./Loader";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Title,
  type Align,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Title, ChartDataLabels);

type ShapFeature = {
  feature: string;
  feature_value: string | number;
  shap_value: number;
  abs_val: number;
};

type Props = {
  selectedPatientId: string;
};

const WarningShapChart = ({ selectedPatientId }: Props) => {
  const [activeTab, setActiveTab] = useState("chart1");
  const [shapData, setShapData] = useState<ShapFeature[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="error-message">
      <h3>No SHAP explanation available</h3>
      <p>{message}</p>
      <p>Please check if the prediction data is available for this patient.</p>
    </div>
  );

  useEffect(() => {
    setError(null);
    setShapData(null);
    setLoading(true);

    const token = localStorage.getItem("token");

    fetch(`http://127.0.0.1:8000/shap/${selectedPatientId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error API");
        return res.json();
      })
      .then((data) => {
        console.log("Données reçues :", data);
        setShapData(data.shap_values);
        setLoading(false);
      })
      .catch((err) => {
        setError(`Error fetching SHAP data: ${err}`);
        setLoading(false);
      });
  }, [selectedPatientId]);

  if (loading) return <Loader />;
  if (error || !shapData) return <ErrorMessage message={"The necessaries data are not available for the SHAP explanation."} />;

  const features = Array.isArray(shapData)
    ? shapData.map(item => ({
      label: item.feature,
      value: item.shap_value,
      meta: `${item.feature}: ${item.feature_value}`
    }))
    : [];

  const sortedFeatures = [...features].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value)
  );

  const data = {
    labels: sortedFeatures.map((f) => f.label),
    datasets: [
      {
        label: 'SHAP Impact',
        data: sortedFeatures.map((f) => f.value),
        backgroundColor: (context: any) => {
          const value = context.dataset.data[context.dataIndex];
          return value >= 0 ? '#38502b' : '#b4612A';
        },
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    scales: {
      x: {
        grace: '5%',
        title: {
          display: false,
        },
        ticks: {
          color: 'black',
        },
        grid: {
          color: (ctx: any) => (ctx.tick.value === 0 ? '#38502b' : '#939480'),
          lineWidth: (ctx: any) => (ctx.tick.value === 0 ? 2 : 1),
        },
      },
      y: {
        title: {
          display: false,
        },
        ticks: {
          color: (context: any) => {
            const label = context.tick.label;
            return label === 'Body Temperature' ? '#b4612A' : 'black';
          },
          font: (ctx: any) => {
            const label = ctx.tick.label;
            return {
              weight: label === 'Body Temperature' ? 'bold' as const : 'normal' as const,
            };
          },
        }
      },
    },
    elements: {
      bar: {
        hoverBackgroundColor: '#222',
        hoverBorderColor: '#000',
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: 'black',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          boxWidth: 20,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: '🔍 SHAP Values – Feature Impact on Prediction',
        color: '#222',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          top: 20,
          bottom: 20,
        },
      },
      datalabels: {
        color: '#d9d9d3',
        clamp: true,
        formatter: (value: number) => {
          if (Math.abs(value) < 0.08) return '';
          return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
        },
        anchor: 'center' as Align,
        align: 'center' as Align,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const feature = sortedFeatures[index];
            const val = context.parsed.x;

            // Add a special note for a feature
            const extra =
              feature.label === 'Body Temperature'
                ? '\n⚠️ Indicator not to be taken into account'
                : '';

            return [
              `Feature: ${feature.label}`,
              `SHAP Value: ${val >= 0 ? '+' : ''}${val.toFixed(2)}`,
              `Info: ${feature.meta}`,
              extra
            ];
          },
        },
      },
    },
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "chart1":
        return (
          <div className="tab-1-content">
            <h3>🧠 What is a SHAP plot?</h3>
            <p>
              It explains which variables most influenced the model's prediction for this specific case.
            </p>

            <h3>🔍 How to read it</h3>
            <ul className="no-dot">
              <li>📊 <strong>Each bar</strong> represents one feature of the individual</li>
              <li>➡️ <strong>Bar to the right</strong> = <strong>increases the risk</strong> (harmful effect)</li>
              <li>⬅️ <strong>Bar to the left</strong> = <strong>reduces the risk</strong> (protective effect)</li>
              <li>🟩 <strong>Green</strong> = contributes to lowering the predicted risk</li>
              <li>🟧 <strong>Orange</strong> = contributes to increasing the predicted risk</li>
            </ul>

            <p className="info-note">
              📉 The longer the bar, the stronger the impact of the feature on the model’s prediction.
            </p>

            <h3>⚠️ Keep in mind</h3>
            <ul>
              <li>This is not causality</li>
              <li>This is not a clinical diagnosis</li>
              <li>This only explains one individual case</li>
              <li>This chart is adapted for readability. Directions and colors are chosen to reflect medical risk interpretation — not the raw SHAP convention.</li>
            </ul>
          </div>
        );
      case "chart2":
        return (
          <div className="tab-2-content">
            <div className="bar">
              <Bar data={data} options={options} />
            </div>
            <div className="custom-legend">
              <div><span style={{ backgroundColor: '#b4612A' }} className="legend-color"></span> Negative Contribution</div>
              <div><span style={{ backgroundColor: '#38502b' }} className="legend-color"></span> Positive Contribution</div>
            </div>
          </div>
        );
      case "chart3":
        return (
          <div className="tab-3-content">
            <h3>⚠️ Important Reminder</h3>
            <p>
              SHAP helps explain the model — it doesn’t diagnose the patient or prove causality.
            </p>

            <h4>🚫 What SHAP doesn’t tell you:</h4>
            <ul>
              <li><strong>No causality:</strong> High impact ≠ the cause of the prediction</li>
              <li><strong>No diagnosis:</strong> It explains the model, not the patient</li>
              <li><strong>Not universal:</strong> It only applies to this individual case</li>
            </ul>

            <h4>✅ Good Practices</h4>
            <ul>
              <li>🔍 Cross-check with clinical info</li>
              <li>⚖️ Be aware of model biases</li>
              <li>❓ Investigate surprising results</li>
              <li>📝 Use explanations to support—not replace—your reasoning</li>
            </ul>

            <p className="post-note">
              🧠 SHAP is a tool, not a decision-maker. Always apply clinical judgement.
            </p>

            <p className="download-note">
              📥 Want more details? ‎ <a href="../../public/Understanding_SHAP_Values.pdf" download>Download the SHAP interpretation guide (PDF)</a>
            </p>
          </div>
        );
    }
  }


  return (
    <div className="warning-chart-container">
      <h2 className="warning-bar-chart-title">Top features influencing this prediction</h2>

      <div className="tabs">
        <button
          className={activeTab === "chart1" ? "tab-active" : "tab"}
          onClick={() => setActiveTab("chart1")}
        >
          Instructions
        </button>
        <button
          className={activeTab === "chart2" ? "tab-active" : "tab"}
          onClick={() => setActiveTab("chart2")}
        >
          Chart
        </button>
        <button
          className={activeTab === "chart3" ? "tab-active" : "tab"}
          onClick={() => setActiveTab("chart3")}
        >
          More Info
        </button>
      </div>

      <div className="tab-content">
        {renderTabContent()}
      </div>

    </div>
  );
};

export default WarningShapChart;
