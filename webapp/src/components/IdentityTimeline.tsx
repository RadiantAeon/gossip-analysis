import { useMemo } from 'react';
import { Paper, Box } from '@mui/material';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { ValidatorData, ValidatorIdentity } from '@/types/validator';

interface IdentityTimelineProps {
  data: ValidatorData;
}

interface TimelinePoint {
  timestamp: number;
  ip: string;
  pubkey: string;
  isStaked: boolean;
}

export function IdentityTimeline({ data }: IdentityTimelineProps) {
  const timelineData = useMemo(() => {
    return data.flatMap(ipData => 
      ipData.identities.map(identity => ({
        timestamp: new Date(identity.timestamp.replace('_', 'T').replace('.json', '')).getTime(),
        ip: ipData.ip,
        pubkey: identity.pubkey,
        isStaked: identity.is_staked
      }))
    );
  }, [data]);

  const stakedData = timelineData.filter(point => point.isStaked);
  const unstakedData = timelineData.filter(point => !point.isStaked);

  return (
    <Paper elevation={2}>
      <Box p={3} height={400}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(timestamp) => {
                return new Date(timestamp).toLocaleDateString();
              }}
            />
            <YAxis dataKey="ip" type="category" />
            <Tooltip
              formatter={(value: any, name: string) => {
                if (name === 'timestamp') {
                  return new Date(value as number).toLocaleString();
                }
                return value;
              }}
            />
            <Legend />
            <Scatter
              name="Staked Identities"
              data={stakedData}
              fill="#00C49F"
              shape="circle"
            />
            <Scatter
              name="Unstaked Identities"
              data={unstakedData}
              fill="#FF8042"
              shape="triangle"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}