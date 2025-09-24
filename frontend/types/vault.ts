export interface Vault {
  id: string;
  name: string;
  members: string[];
  signaturesRequired: number;
  balance: number;
  createdAt: Date;
  ownerAddress: string; // The actual vault owner address for blockchain operations
}

export interface WithdrawalRequest {
  id: string;
  vaultId: string;
  requesterId: string;
  amount: number;
  purpose: string;
  approvals: string[];
  rejections: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface Transaction {
  id: string;
  vaultId: string;
  type: 'deposit' | 'withdrawal_request' | 'approval' | 'rejection' | 'withdrawal_complete';
  amount?: number;
  from?: string;
  purpose?: string;
  withdrawalRequestId?: string;
  timestamp: Date;
}

export interface TransactionHistory {
  id: number;
  txType: 'deposit' | 'withdrawal' | 'transfer';
  from: string;
  to: string;
  amount: number;
  description: string;
  txHash: string;
  timestamp: number; // Unix timestamp from blockchain
  executedBy: string;
}

export interface VaultMember {
  address: string;
  name?: string;
}