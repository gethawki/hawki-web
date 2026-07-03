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
      position: 'bottom',
      labels: { color: '#b0b0b0', boxWidth: 10, padding: 14, font: { size: 11 } },
    },
  },
}

export default function SeverityChart() {
  return (
    <div className="h-56 w-full min-w-0">
      <Doughnut data={data} options={options} />
    </div>
  )
}