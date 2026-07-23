import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

// risk palette (mirrors index.css tokens): copper = high/critical, steel = medium, grey = low.
// copper-light (#a05242) is the sanctioned 4th tint separating Critical from High.
const data = {
  labels: ['Critical', 'High', 'Medium', 'Low'],
  datasets: [
    {
      data: [2, 7, 15, 23],
      backgroundColor: ['#986c67', '#a05242', '#687f97', '#77746c'],
      borderColor: '#111',
      borderWidth: 2,
      hoverOffset: 6,
    },
  ],
}

const options = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
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
