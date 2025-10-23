import { useMemo } from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts';
import { ValidatorData, ValidatorInfo } from '@/types/validator';

interface ValidatorPieChartProps {
  data: ValidatorData;
  onValidatorSelect: (pubkey: string | null) => void;
  selectedValidator: string | null;
}

const COLORS = [
  '#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1'
];

const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload
  } = props;

  const value = payload.activatedStakeUI;
  const formattedStake = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <g>
      <text x={cx} y={cy - 30} dy={8} textAnchor="middle" fill={fill} fontSize={12}>
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#999" fontSize={12}>
        {`${formattedStake} SOL`}
      </text>
      <text x={cx} y={cy + 20} dy={8} textAnchor="middle" fill="#999" fontSize={12}>
        {`Commission: ${payload.commission}%`}
      </text>
      <text x={cx} y={cy + 40} dy={8} textAnchor="middle" fill="#999" fontSize={12}>
        {`Version: ${payload.version}`}
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

export function ValidatorPieChart({ data, onValidatorSelect, selectedValidator }: ValidatorPieChartProps) {
  const chartData = useMemo(() => {
    const validators = data.flatMap(ipData => 
      ipData.validators_info.map(validator => ({
        ...validator,
        name: validator.identityPubkey.slice(0, 8) + '...',
        value: validator.activatedStakeUI,
        fullName: validator.identityPubkey,
        ip: ipData.ip
      }))
    ).sort((a, b) => b.value - a.value);

    return validators;
  }, [data]);

  return (
    <Paper elevation={2}>
      <Box p={3}>
        <Typography variant="h6" gutterBottom align="center">
          Validator Stake Distribution
        </Typography>
        <Box height={400}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={140}
                label={({ name, value }) => 
                  `${name} (${value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} SOL)`
                }
                onClick={(data) => 
                  onValidatorSelect(data.fullName === selectedValidator ? null : data.fullName)
                }
                activeIndex={chartData.findIndex(item => item.fullName === selectedValidator)}
                activeShape={renderActiveShape}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={entry.fullName} 
                    fill={COLORS[index % COLORS.length]}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => value.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }) + ' SOL'}
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Paper>
  );
}