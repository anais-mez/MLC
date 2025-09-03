import "../style/divergingBarChart.css";
import { useEffect, useState } from "react";
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import Loader from "./Loader";
import InfoIcon from "../assets/information.png";
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

const ShapChart = ({ selectedPatientId }: Props) => {
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
    ? shapData.map((item) => ({
      label: item.feature,
      value: item.shap_value,
      meta: `${item.feature}: ${item.feature_value}`
    }))
    : [];

  const sortedFeatures = features.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const data = {
    labels: sortedFeatures.map((feature) => feature.label),
    datasets: [
      {
        label: 'SHAP Value',
        data: sortedFeatures.map((feature) => feature.value),
        backgroundColor: (context: any) => {
          const value = context.dataset.data[context.dataIndex];
          return value >= 0 ? '#38502b' : '#b4612A';
        },
      },
    ],
  }

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

  return (
    <div className="chart-container">
      <h2 className="bar-chart-title">Top features influencing this prediction</h2>

      <div className="bar-content">
        <div className="bar">
          <Bar data={data} options={options} />
        </div>
        <div className="custom-legend">
          <div><span style={{ backgroundColor: '#b4612A' }} className="legend-color"></span> Negative Contribution</div>
          <div><span style={{ backgroundColor: '#38502b' }} className="legend-color"></span> Positive Contribution</div>
        </div>
      </div>

      <div className="advertissment">
        <img src={InfoIcon} alt="Information Icon" className="info-icon" />
        <p>
          <strong>No causality:</strong> High impact ≠ the cause of the prediction <br />
          <strong>No diagnosis:</strong> It explains the model, not the patient <br />
          <strong>Not universal:</strong> It only applies to this individual case <br />
        </p>
      </div>

    </div>
  );
};

export default ShapChart;
