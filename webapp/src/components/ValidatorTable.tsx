import { useMemo } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Paper } from '@mui/material';
import { ValidatorData, ValidatorInfo } from '@/types/validator';

interface ValidatorTableProps {
  data: ValidatorData;
}

interface ValidatorRow extends ValidatorInfo {
  id: string;
  ip: string;
}

export function ValidatorTable({ data }: ValidatorTableProps) {
  const rows = useMemo(() => {
    return data.flatMap(ipData => 
      ipData.validators_info.map(validator => ({
        ...validator,
        id: `${ipData.ip}-${validator.identityPubkey}`,
        ip: ipData.ip
      }))
    );
  }, [data]);

  const columns: GridColDef[] = [
    { field: 'ip', headerName: 'IP Address', width: 150 },
    { field: 'identityPubkey', headerName: 'Identity', width: 320 },
    { field: 'voteAccountPubkey', headerName: 'Vote Account', width: 320 },
    { field: 'commission', headerName: 'Commission %', width: 130, type: 'number' },
    { 
      field: 'activatedStakeUI', 
      headerName: 'Stake (SOL)', 
      width: 150, 
      type: 'number',
      valueFormatter: (params) => params.value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },
    { field: 'version', headerName: 'Version', width: 120 },
    { field: 'skipRate', headerName: 'Skip Rate', width: 120, type: 'number',
      valueFormatter: (params) => {
        if (params.value === null) return 'N/A';
        return `${(params.value * 100).toFixed(2)}%`;
      }
    },
    { field: 'delinquent', headerName: 'Delinquent', width: 100, type: 'boolean' },
  ];

  return (
    <Paper elevation={2}>
      <Box height={600}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          density="compact"
          disableRowSelectionOnClick
        />
      </Box>
    </Paper>
  );
}