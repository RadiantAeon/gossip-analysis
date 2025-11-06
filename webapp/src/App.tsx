import { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import data from '../../sybil_analysis_output.json'
import { ValidatorTable } from './components/ValidatorTable';
import { ValidatorPieChart } from './components/ValidatorPieChart';
import { StakeDistribution } from './components/StakeDistribution';

export default function App() {
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [selectedValidator, setSelectedValidator] = useState<string | null>(null);

  const filteredData = selectedIp 
    ? data.filter(item => item.ip === selectedIp)
    : data;

  // Reset validator selection when IP changes
  useEffect(() => {
    setSelectedValidator(null);
  }, [selectedIp]);

  return (
    <Container maxWidth="xl">
      <Box py={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Validator Analysis Dashboard
        </Typography>
        
        <Box mb={4}>
          <StakeDistribution 
            data={data} 
            selectedIp={selectedIp}
            onIpSelect={setSelectedIp}
          />
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            {selectedIp ? `Validator Details for ${selectedIp}` : 'Validator Details'}
          </Typography>
          <Box display="flex" flexDirection="column" gap={4}>
            <ValidatorTable 
              data={filteredData.map(d => ({
                ...d,
                validators_info: d.validators_info.filter(v => 
                  !selectedValidator || v.identityPubkey === selectedValidator
                )
              }))} 
            />
            <ValidatorPieChart 
              data={filteredData}
              selectedValidator={selectedValidator}
              onValidatorSelect={setSelectedValidator}
            />
          </Box>
        </Box>
      </Box>
    </Container>
  );
}