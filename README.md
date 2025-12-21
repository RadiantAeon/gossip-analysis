## About
This repository compiles Solana gossip data collected over the course of two months to detect sybils. This is done by checking if any nodes share an ip at any point in time.

## Data

- The actual gossip data is output from `solana gossip -um --output json > $(date +"%Y-%m-%d_%H-%M-%S").json`(run by a cron job every minute)
- `active_validators.json` is output from `solana validators -um --output json > active_validators.json`
- `validator_infos.json` is output from `solana validator-info get -um --output json > validator_infos.json`
- `jito_validators.json` is output from `curl -X POST https://kobe.mainnet.jito.network/api/v1/jitosol_validators -H 'Content-Type: application/json' | jq > jito_validators.json`
- `sfdp_participants.json` is output from `curl -X GET https://api.solana.org/api/community/v1/sfdp_participants -H 'Content-Type: application/json' | jq > sfdp_participants.json`