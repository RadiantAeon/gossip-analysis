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
  onIpSelect: (ip: string | null) => void;
  selectedIp: string | null;
}

type SortOption = 'stake' | 'validators' | 'identities' | 'ip' | 'jito stakepool validators' | 'sfdp participants';

export function StakeDistribution({ data, onIpSelect, selectedIp }: StakeDistributionProps) {
  const [sortBy, setSortBy] = useState<SortOption>('stake');

  const listData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.total_stakeUI, 0);
    const items = data.map(item => {
      // Calculate Jito stats for this IP
      const jitoValidators = item.validators_info.filter(v => v.jito_stakepool);
      // Calculate SFDP stats for this IP
      const sfdpValidators = item.validators_info.filter(v => v.sfdp_status === 'Approved');
      
      return {
        ip: item.ip,
        stake: item.total_stakeUI,
        percentage: (item.total_stakeUI / total) * 100,
        validatorCount: item.validators_info.length,
        stakedIdentities: item.staked_identities.length,
        jitoValidatorCount: jitoValidators.length,
        sfdpValidatorCount: sfdpValidators.length,
        originalData: item
      };
    });

    // Sort based on selected option
    return items.sort((a, b) => {
      switch (sortBy) {
        case 'stake':
          return b.stake - a.stake;
        case 'validators':
          return b.validatorCount - a.validatorCount;
        case 'identities':
          return b.stakedIdentities - a.stakedIdentities;
        case 'jito stakepool validators':
          return b.jitoValidatorCount - a.jitoValidatorCount;
        case 'sfdp participants':
          return b.sfdpValidatorCount - a.sfdpValidatorCount;
        case 'ip':
          return a.ip.localeCompare(b.ip);
        default:
          return 0;
      }
    });
  }, [data, sortBy]);

  const totalStake = useMemo(() => 
    data.reduce((sum, item) => sum + item.total_stakeUI, 0), 
    [data]
  );

  return (
    <Paper elevation={2}>
      <Box p={3}>
        <Typography variant="h6" gutterBottom>
          Stake Distribution by IP
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
            <ToggleButton value="identities">Identities</ToggleButton>
            <ToggleButton value="jito stakepool validators">Jito stakepool validators</ToggleButton>
            <ToggleButton value="sfdp participants">SFDP Participants</ToggleButton>
            <ToggleButton value="ip">IP</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          <List>
            {listData.map((item) => (
            <ListItem 
              key={item.ip}
              disablePadding
              sx={{
                backgroundColor: selectedIp === item.ip ? 'action.selected' : 'transparent',
                borderLeft: selectedIp === item.ip ? '4px solid' : '4px solid transparent',
                borderColor: 'primary.main',
              }}
            >
              <ListItemButton onClick={() => onIpSelect(item.ip === selectedIp ? null : item.ip)}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body1" fontWeight="bold">
                        {item.ip}
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
                        SFDP: <strong>{item.sfdpValidatorCount}</strong> approved
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