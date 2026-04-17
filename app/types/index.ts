export interface ProfileTypes {
  email: string;
}

export interface DashboardCardData {
  vault: string;
  status: string;
  dashboard: string;
  vault_owner: string;
  node_operator: string;
  node_operator_manager: string[];
  total_value: string;//Total ETH in the vault
  vault_balance: string;
  staking_apr: number;//Staking APR of the vault
  health_factor: string;
  liability_steth: string;//Total stETH in the vault  Repayable stETH
  remaining_minting_steth: string;//Remaining minting capacity in the vault   Mintable stETH
  total_minting_steth: string;
  withdrawable_value: string;//Withdrawable value in the vault
  locked: string;
  operator_fee_rate: number;
  undisbursed_operator_fee: string;
  infra_fee: number;
  liquidity_fee: number;
  unsettled_lido_fee: string;
  confirm_expiry: number;
  tier_id: number;
  created_time: string;
}
