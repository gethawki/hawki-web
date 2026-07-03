import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const data = {
  labels: ['Critical', 'High', 'Medium', 'Low'],
  datasets: [
    {
      data: [2, 7, 15, 23],
      backgroundColor: ['#986C67', '#a05242', '#687F97', '#77746C'],
      borderColor: '#151515',
      borderWidth: 2,
      hoverOffset: 6,
    },
  ],
}

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#b0b0b0', boxWidth: 12, padding: 16 },
    },
  },
}

export default function SeverityChart() {
  return (
    <div className="h-44">
      <Doughnut data={data} options={options} />
    </div>
  )
}
