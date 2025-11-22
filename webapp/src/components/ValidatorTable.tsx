import { useMemo } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Paper } from '@mui/material';
import { ValidatorData } from '@/types/validator';

interface ValidatorTableProps {
  data: ValidatorData;
}

export function ValidatorTable({ data }: ValidatorTableProps) {
  const rows = useMemo(() => {
    return data.flatMap(cluster =>
      cluster.validators_info.map(validator => {
        // normalize fields (prefer camelCase, fall back to snake_case)
        const identityPubkey = validator.identity_pubkey;
        const voteAccountPubkey = validator.vote_account_pubkey;
        const activatedStakeUI = validator.activated_stake_ui;
        const jito_stake_ui = validator.jito_stake_ui;
        const jito_stakepool = validator.jito_stakepool;
        const sfdp_participant = validator.sfdp_participant;
        const sfdp_status = validator.sfdp_status;

        return {
          // ensure unique id per cluster + validator
          id: `${cluster.ips.join('|')}-${identityPubkey}`,
          clusterId: cluster.ips.join('|'),
          ips: cluster.ips.join(', '),
          identityPubkey,
          voteAccountPubkey,
          activatedStakeUI,
          jito_stakepool,
          jito_stake_ui,
          sfdp_participant,
          sfdp_status,
        };
      })
    );
  }, [data]);

  const columns: GridColDef[] = [
    { field: 'ips', headerName: 'IPs', width: 200, sortable: false },
    { field: 'identityPubkey', headerName: 'Identity', width: 320 },
    { field: 'voteAccountPubkey', headerName: 'Vote Account', width: 320 },
    {
      field: 'activatedStakeUI',
      headerName: 'Stake (SOL)',
      width: 150,
      type: 'number',
      valueFormatter: (params) => {
        const v = params.value as number | null | undefined;
        if (v === null || v === undefined) return 'N/A';
        return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    },
    {
      field: 'jito_stakepool',
      headerName: 'Jito Pool',
      width: 110,
      type: 'boolean'
    },
    {
      field: 'jito_stake_ui',
      headerName: 'Jito Stake (SOL)',
      width: 150,
      type: 'number',
      valueFormatter: (params) => {
        const v = params.value as number | null | undefined;
        if (v === null || v === undefined || v === 0) return 'N/A';
        return (v as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    },
    {
      field: 'sfdp_participant',
      headerName: 'SFDP',
      width: 100,
      type: 'boolean'
    },
    {
      field: 'sfdp_status',
      headerName: 'SFDP Status',
      width: 120
    },
  ];

  return (
    <Paper elevation={2}>
      <Box height={600} sx={{ width: '100%' }}>
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
          sx={{
            '& .MuiDataGrid-main': {
              overflow: 'unset'
            },
            '& .MuiDataGrid-columnHeaders': {
              position: 'sticky',
              top: 0,
              zIndex: 1,
              backgroundColor: 'background.paper'
            },
            '& .MuiDataGrid-virtualScroller': {
              overflow: 'auto'
            }
          }}
        />
      </Box>
    </Paper>
  );
}