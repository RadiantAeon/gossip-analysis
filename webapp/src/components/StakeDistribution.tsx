import { useMemo } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { ValidatorData } from '@/types/validator';

interface StakeDistributionProps {
  data: ValidatorData;
  onIpSelect: (ip: string | null) => void;
  selectedIp: string | null;
}

interface ChartData {
  ip: string;
  value: number;
  percentage: number;
  originalData: ValidatorData[0];
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1'
];

const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, value, percentage
  } = props;

  const validatorCount = payload.originalData.validators_info.length;
  const stakedIdentities = payload.originalData.staked_identities.length;

  return (
    <g>
      <text x={cx} y={cy - 20} dy={8} textAnchor="middle" fill={fill}>
        {payload.ip}
      </text>
      <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="#999">
        {`${value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })} SOL`}
      </text>
      <text x={cx} y={cy + 30} dy={8} textAnchor="middle" fill="#999">
        {`${validatorCount} Validators`}
      </text>
      <text x={cx} y={cy + 50} dy={8} textAnchor="middle" fill="#999">
        {`${stakedIdentities} Staked Identities`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  );
};

export function StakeDistribution({ data, onIpSelect, selectedIp }: StakeDistributionProps) {
  const chartData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.total_stakeUI, 0);
    return data
      .map(item => ({
        ip: item.ip,
        value: item.total_stakeUI,
        percentage: (item.total_stakeUI / total) * 100,
        originalData: item
      }))
      .sort((a, b) => b.value - a.value); // Sort by stake amount descending
  }, [data]);

  return (
    <Paper elevation={2}>
      <Box p={3}>
        <Typography variant="h6" gutterBottom>
          Stake Distribution by IP
        </Typography>
        <Box height={400}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="ip"
                cx="50%"
                cy="50%"
                outerRadius={150}
                label={({ ip, percentage }) => `${ip} (${percentage.toFixed(1)}%)`}
                onClick={(data) => onIpSelect(data.ip === selectedIp ? null : data.ip)}
                activeIndex={chartData.findIndex(item => item.ip === selectedIp)}
                activeShape={renderActiveShape}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={entry.ip} 
                    fill={COLORS[index % COLORS.length]}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} SOL`}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Paper>
  );
}