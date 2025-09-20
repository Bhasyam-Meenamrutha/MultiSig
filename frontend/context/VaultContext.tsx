import React, { createContext, useContext, useState, useEffect } from 'react';
import { Vault, WithdrawalRequest, Transaction } from '@/types/vault';
import { toast } from '@/hooks/use-toast';

interface VaultContextType {
  vaults: Vault[];
  withdrawalRequests: WithdrawalRequest[];
  transactions: Transaction[];
  currentUser: string;
  availableAccounts: { address: string; name: string }[];
  setCurrentUser: (address: string) => void;
  createVault: (vault: Omit<Vault, 'id' | 'createdAt'>) => void;
  deposit: (vaultId: string, amount: number) => void;
  requestWithdrawal: (vaultId: string, amount: number, purpose: string) => void;
  approveRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
  getVaultById: (id: string) => Vault | undefined;
  getRequestsForVault: (vaultId: string) => WithdrawalRequest[];
  getTransactionsForVault: (vaultId: string) => Transaction[];
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};

// Mock data for demonstration
const mockVaults: Vault[] = [
  {
    id: 'vault-1',
    name: 'Emergency Fund',
    members: ['0x1234...5678', '0x9876...5432'],
    signaturesRequired: 2,
    balance: 5000,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'vault-2',
    name: 'Vacation Savings',
    members: ['0x1234...5678', '0x9876...5432', '0xabcd...efgh'],
    signaturesRequired: 2,
    balance: 2500,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

const availableAccounts = [
  { address: '0x1234...5678', name: 'Account 1' },
  { address: '0x9876...5432', name: 'Account 2' },
  { address: '0xabcd...efgh', name: 'Account 3' },
];

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vaults, setVaults] = useState<Vault[]>(mockVaults);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState('0x1234...5678'); // Mock current user

  // Check for expired requests
  useEffect(() => {
    const interval = setInterval(() => {
      setWithdrawalRequests(prev => 
        prev.map(request => {
          if (request.status === 'pending' && new Date() > request.expiresAt) {
            // Add expiration transaction
            const expiredTransaction: Transaction = {
              id: Date.now().toString(),
              vaultId: request.vaultId,
              type: 'rejection',
              withdrawalRequestId: request.id,
              from: 'system',
              timestamp: new Date(),
            };
            setTransactions(t => [...t, expiredTransaction]);
            
            return { ...request, status: 'expired' as const };
          }
          return request;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const createVault = (vaultData: Omit<Vault, 'id' | 'createdAt'>) => {
    const newVault: Vault = {
      ...vaultData,
      id: `vault-${Date.now()}`,
      createdAt: new Date(),
    };
    setVaults(prev => [...prev, newVault]);
    toast({
      title: "Vault Created",
      description: `${newVault.name} has been successfully created.`,
    });
  };

  const deposit = (vaultId: string, amount: number) => {
    setVaults(prev => 
      prev.map(vault => 
        vault.id === vaultId 
          ? { ...vault, balance: vault.balance + amount }
          : vault
      )
    );

    const transaction: Transaction = {
      id: Date.now().toString(),
      vaultId,
      type: 'deposit',
      amount,
      from: currentUser,
      timestamp: new Date(),
    };
    setTransactions(prev => [...prev, transaction]);

    toast({
      title: "Deposit Successful",
      description: `${amount} tokens deposited to vault.`,
    });
  };

  const requestWithdrawal = (vaultId: string, amount: number, purpose: string) => {
    const vault = vaults.find(v => v.id === vaultId);
    if (!vault) return;

    if (amount > vault.balance) {
      toast({
        title: "Insufficient Balance",
        description: "Not enough funds in vault for this withdrawal.",
        variant: "destructive",
      });
      return;
    }

    const request: WithdrawalRequest = {
      id: `request-${Date.now()}`,
      vaultId,
      requesterId: currentUser,
      amount,
      purpose,
      approvals: [currentUser], // Requester auto-approves
      rejections: [],
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    setWithdrawalRequests(prev => [...prev, request]);

    const transaction: Transaction = {
      id: Date.now().toString(),
      vaultId,
      type: 'withdrawal_request',
      amount,
      from: currentUser,
      purpose,
      withdrawalRequestId: request.id,
      timestamp: new Date(),
    };
    setTransactions(prev => [...prev, transaction]);

    toast({
      title: "Withdrawal Requested",
      description: `Request for ${amount} tokens has been submitted.`,
    });
  };

  const approveRequest = (requestId: string) => {
    setWithdrawalRequests(prev => 
      prev.map(request => {
        if (request.id === requestId && !request.approvals.includes(currentUser)) {
          const newApprovals = [...request.approvals, currentUser];
          const vault = vaults.find(v => v.id === request.vaultId);
          
          const transaction: Transaction = {
            id: Date.now().toString(),
            vaultId: request.vaultId,
            type: 'approval',
            from: currentUser,
            withdrawalRequestId: requestId,
            timestamp: new Date(),
          };
          setTransactions(t => [...t, transaction]);

          // Check if we have enough approvals
          if (vault && newApprovals.length >= vault.signaturesRequired) {
            // Execute withdrawal
            setVaults(v => 
              v.map(vault => 
                vault.id === request.vaultId 
                  ? { ...vault, balance: vault.balance - request.amount }
                  : vault
              )
            );

            const completeTransaction: Transaction = {
              id: (Date.now() + 1).toString(),
              vaultId: request.vaultId,
              type: 'withdrawal_complete',
              amount: request.amount,
              withdrawalRequestId: requestId,
              timestamp: new Date(),
            };
            setTransactions(t => [...t, completeTransaction]);

            toast({
              title: "Withdrawal Approved",
              description: `${request.amount} tokens have been withdrawn from the vault.`,
            });

            return { ...request, approvals: newApprovals, status: 'approved' as const };
          }

          toast({
            title: "Request Approved",
            description: `You have approved the withdrawal request.`,
          });

          return { ...request, approvals: newApprovals };
        }
        return request;
      })
    );
  };

  const rejectRequest = (requestId: string) => {
    setWithdrawalRequests(prev => 
      prev.map(request => {
        if (request.id === requestId && !request.rejections.includes(currentUser)) {
          const newRejections = [...request.rejections, currentUser];
          
          const transaction: Transaction = {
            id: Date.now().toString(),
            vaultId: request.vaultId,
            type: 'rejection',
            from: currentUser,
            withdrawalRequestId: requestId,
            timestamp: new Date(),
          };
          setTransactions(t => [...t, transaction]);

          toast({
            title: "Request Rejected",
            description: `You have rejected the withdrawal request.`,
            variant: "destructive",
          });

          return { 
            ...request, 
            rejections: newRejections, 
            status: 'rejected' as const 
          };
        }
        return request;
      })
    );
  };

  const getVaultById = (id: string) => vaults.find(vault => vault.id === id);
  
  const getRequestsForVault = (vaultId: string) => 
    withdrawalRequests.filter(request => request.vaultId === vaultId);
  
  const getTransactionsForVault = (vaultId: string) => 
    transactions.filter(transaction => transaction.vaultId === vaultId);

  return (
    <VaultContext.Provider value={{
      vaults,
      withdrawalRequests,
      transactions,
      currentUser,
      availableAccounts,
      setCurrentUser,
      createVault,
      deposit,
      requestWithdrawal,
      approveRequest,
      rejectRequest,
      getVaultById,
      getRequestsForVault,
      getTransactionsForVault,
    }}>
      {children}
    </VaultContext.Provider>
  );
};