import { useMemo, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { ValidatorData } from '@/types/validator';

interface StakeDistributionProps {
  data: ValidatorData;
  onClusterSelect: (clusterId: string | null) => void;
  selectedClusterId: string | null;
}

type SortOption =
  | 'stake'
  | 'validators'
  | 'ip'
  | 'jito stakepool validators'
  | 'jito stake'
  | 'sfdp participants';

export function StakeDistribution({ data, onClusterSelect, selectedClusterId }: StakeDistributionProps) {
  const [sortBy, setSortBy] = useState<SortOption>('stake');

  const listData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.total_stake_ui, 0);
    const items = data.map(item => {
      const jitoValidators = item.validators_info.filter(v => v.jito_stakepool);
      const sfdpValidators = item.validators_info.filter(v => v.sfdp_participant);

      // cluster id: unique, stable string for selection
      const id = item.ips.join('|');

      // sum Jito stake; accept jito_stake_ui or jito_stake_ui numeric
      const jitoStake = item.validators_info.reduce((sum, v) => {
        const val = v.jito_stake_ui;
        return sum + (typeof val === 'number' ? val : 0);
      }, 0);

      return {
        id,
        ips: item.ips,
        stake: item.total_stake_ui,
        percentage: total > 0 ? (item.total_stake_ui / total) * 100 : 0,
        validatorCount: item.validators_info.length,
        stakedIdentities: item.staked_identities.length,
        jitoValidatorCount: jitoValidators.length,
        jitoStake,
        sfdpValidatorCount: sfdpValidators.length,
      };
    });

    return items.sort((a, b) => {
      switch (sortBy) {
        case 'stake':
          return b.stake - a.stake;
        case 'validators':
          return b.validatorCount - a.validatorCount;
        case 'jito stakepool validators':
          return b.jitoValidatorCount - a.jitoValidatorCount;
        case 'jito stake':
          return b.jitoStake - a.jitoStake;
        case 'sfdp participants':
          return b.sfdpValidatorCount - a.sfdpValidatorCount;
        case 'ip':
          // compare first ip lexicographically
          return a.ips[0].localeCompare(b.ips[0]);
        default:
          return 0;
      }
    });
  }, [data, sortBy]);

  const totalStake = useMemo(() => data.reduce((sum, item) => sum + item.total_stake_ui, 0), [data]);

  return (
    <Paper elevation={2}>
      <Box p={3}>
        <Typography variant="h6" gutterBottom>
          Stake Distribution by Cluster (IPs)
        </Typography>

        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="body2" color="text.secondary">
            Total Stake: {totalStake.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} SOL
          </Typography>

          <ToggleButtonGroup
            value={sortBy}
            exclusive
            onChange={(_, newSort) => newSort && setSortBy(newSort)}
            size="small"
          >
            <ToggleButton value="stake">Stake</ToggleButton>
            <ToggleButton value="validators">Validators</ToggleButton>
            <ToggleButton value="jito stakepool validators">Jito stakepool validators</ToggleButton>
            <ToggleButton value="jito stake">Jito stake</ToggleButton>
            <ToggleButton value="sfdp participants">SFDP Participants</ToggleButton>
            <ToggleButton value="ip">IP</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          <List>
            {listData.map((item) => (
              <ListItem
                key={item.id}
                disablePadding
                sx={{
                  backgroundColor: selectedClusterId === item.id ? 'action.selected' : 'transparent',
                  borderLeft: selectedClusterId === item.id ? '4px solid' : '4px solid transparent',
                  borderColor: 'primary.main',
                }}
              >
                <ListItemButton onClick={() => onClusterSelect(item.id === selectedClusterId ? null : item.id)}>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body1" fontWeight="bold">
                          {item.ips.length === 1 ? item.ips[0] : `${item.ips[0]} (+${item.ips.length - 1})`}
                        </Typography>
                        <Chip
                          label={`${item.percentage.toFixed(1)}%`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" spacing={3} mt={1}>
                        <Typography variant="body2" component="span">
                          Stake: <strong>{item.stake.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} SOL</strong>
                        </Typography>
                        <Typography variant="body2" component="span">
                          Validators: <strong>{item.validatorCount}</strong>
                        </Typography>
                        <Typography variant="body2" component="span">
                          Staked Identities: <strong>{item.stakedIdentities}</strong>
                        </Typography>
                        <Typography variant="body2" component="span">
                          Jito stakepool: <strong>{item.jitoValidatorCount}</strong> validators
                        </Typography>
                        <Typography variant="body2" component="span">
                          Jito Stake: <strong>{item.jitoStake.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} SOL</strong>
                        </Typography>
                        <Typography variant="body2" component="span">
                          SFDP: <strong>{item.sfdpValidatorCount}</strong> participants
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
    </Paper>
  );
}