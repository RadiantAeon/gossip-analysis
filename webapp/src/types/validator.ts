export interface ValidatorIdentity {
  pubkey: string;
  is_staked: boolean;
  timestamp: string;
}

export interface ValidatorInfo {
  identityPubkey: string;
  voteAccountPubkey: string;
  commission: number;
  lastVote: number;
  rootSlot: number;
  credits: number;
  epochCredits: number;
  activatedStake: number;
  version: string;
  delinquent: boolean;
  skipRate: number | null;
  activatedStakeUI: number;
}

export interface IpData {
  ip: string;
  identities: ValidatorIdentity[];
  staked_identities: string[];
  validators_info: ValidatorInfo[];
  total_stakeUI: number;
}

export type ValidatorData = IpData[];