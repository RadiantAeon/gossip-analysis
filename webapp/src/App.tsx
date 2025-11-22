import { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import rawData from '../../sybil_analysis_output.json';
import { ValidatorTable } from './components/ValidatorTable';
import { ValidatorPieChart } from './components/ValidatorPieChart';
import { StakeDistribution } from './components/StakeDistribution';
import { ValidatorData } from './types/validator';

export default function App() {
  // cluster id is ips joined with '|'
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedValidator, setSelectedValidator] = useState<string | null>(null);

  // rawData imported from JSON; cast to ValidatorData (clusters)
  const data = rawData as ValidatorData;

  // filter clusters by the selected cluster id
  const filteredData = selectedClusterId
    ? data.filter(item => item.ips.join('|') === selectedClusterId)
    : data;

  // Reset validator selection when cluster changes
  useEffect(() => {
    setSelectedValidator(null);
  }, [selectedClusterId]);

  // human-friendly label for header
  const headerLabel = selectedClusterId
    ? `Validator Details for ${selectedClusterId.split('|').join(', ')}`
    : 'Validator Details';

  return (
    <Container maxWidth="xl">
      <Box py={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Validator Analysis Dashboard
        </Typography>

        <Box mb={4}>
          <StakeDistribution
            data={data}
            selectedClusterId={selectedClusterId}
            onClusterSelect={setSelectedClusterId}
          />
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            {headerLabel}
          </Typography>
          <Box display="flex" flexDirection="column" gap={4}>
            <ValidatorTable
              data={filteredData.map(d => ({
                ...d,
                validators_info: d.validators_info.filter(v =>
                  !selectedValidator || v.identity_pubkey === selectedValidator
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