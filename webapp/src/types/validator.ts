export interface ValidatorIdentity {
  pubkey: string;
  is_staked: boolean;
  timestamp: string;
}

export interface ValidatorInfo {
  identity_pubkey: string,
  vote_account_pubkey: string,
  activated_stake: number,
  activated_stake_ui: number,

  // jito fields injected
  jito_stakepool: boolean,
  jito_stake: number,
  jito_stake_ui: number,

  // sfdp fields injected
  sfdp_participant: boolean,
  sfdp_status?: string,
}

export interface ClusterData {
  ips: string[],
  identities: ValidatorIdentity[],
  staked_identities: String[],
  validators_info: ValidatorInfo[],
  total_stake_ui: number,
}

export type ValidatorData = ClusterData[];