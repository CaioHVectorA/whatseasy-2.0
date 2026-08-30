import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface MessageData {
  date: string
  messages: number
}

interface MessageActivityChartProps {
  data: MessageData[]
}

export default function Overview({ data }: MessageActivityChartProps) {
  // Process and prepare the data
  const processedData = [...data]
    .reverse() // Reverse to show oldest to newest
    .map((item) => ({
      ...item,
      formattedDate: format(parseISO(item.date), "MMM dd", { locale: ptBR }),
    }))
  const messageValues = processedData.map((item) => item.messages)
  const maxValue = Math.max(...messageValues)
  const minValue = Math.min(...messageValues)

  // Calculate padding for Y-axis (10% of the range)
  const range = maxValue - minValue
  const padding = range * 0.1
  const yAxisMin = Math.floor(Math.max(0, minValue - padding)) // Don't go below 0
  const yAxisMax = Math.floor(maxValue + padding)
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={processedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="formattedDate"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          minTickGap={10}
        />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[yAxisMin, yAxisMax]} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const item = processedData.find((d) => d.formattedDate === label)
              const date = item ? format(parseISO(item.date), "MMMM d, yyyy", { locale: ptBR }) : label
              return (
                <div className="bg-background border border-border p-2 rounded-md shadow-md">
                  <p className="text-sm font-medium">{date}</p>
                  <p className="text-sm text-primary">
                    Messages: <span className="font-bold">{payload[0].value}</span>
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <Line
          type="monotone"
          dataKey="messages"
          stroke="#adfa1d"
          strokeWidth={2}
          dot={{
            fill: "#adfa1d",
            r: 4,
          }}
          activeDot={{
            r: 6,
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
