import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const data = {
  labels: ['Reentrancy', 'Access', 'Oracle', 'Flash loan', 'Governance'],
  datasets: [
    { label: 'Static detections', data: [8, 12, 4, 0, 1], backgroundColor: '#687F97', borderRadius: 4 },
    { label: 'AI + simulation', data: [10, 14, 9, 7, 6], backgroundColor: '#986C67', borderRadius: 4 },
  ],
}

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#b0b0b0', boxWidth: 12, font: { size: 11 } } },
  },
  scales: {
    y: { ticks: { color: '#77746C', font: { size: 10 } }, grid: { color: '#1e1e1e' } },
    x: { ticks: { color: '#77746C', font: { size: 10 } }, grid: { color: 'transparent' } },
  },
}

export default function CoverageChart() {
  return (
    <div className="h-56 w-full min-w-0">
      <Bar data={data} options={options} />
    </div>
  )
}