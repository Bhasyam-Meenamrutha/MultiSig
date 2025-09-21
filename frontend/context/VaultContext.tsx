import React, { createContext, useContext, useState, useEffect } from 'react';
import { Vault, WithdrawalRequest, Transaction } from '@/types/vault';
import { toast } from '@/hooks/use-toast';
import { NETWORK, MODULE_ADDRESS } from '../constants';
import { AptosClient } from 'aptos';

interface VaultContextType {
  vaults: Vault[];
  withdrawalRequests: WithdrawalRequest[];
  transactions: Transaction[];
  currentUser: string;
  availableAccounts: { address: string; name: string }[];
  isLoading: boolean;
  setCurrentUser: (address: string) => void;
  createVault: (vault: Omit<Vault, 'id' | 'createdAt'>) => void;
  refreshVaults: () => void;
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

const NODE_URL = `https://fullnode.${NETWORK}.aptoslabs.com/v1`;
const MODULE_NAME = "multisig";
const client = new AptosClient(NODE_URL);

const availableAccounts = [
  { address: '0x1234...5678', name: 'Account 1' },
  { address: '0x9876...5432', name: 'Account 2' },
  { address: '0xabcd...efgh', name: 'Account 3' },
];

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get current user from wallet
  useEffect(() => {
    const getCurrentUser = async () => {
      if (window.aptos) {
        try {
          const isConnected = await window.aptos.isConnected();
          if (isConnected) {
            const account = await window.aptos.account();
            setCurrentUser(account.address);
          }
        } catch (error) {
          console.error('Error getting current user:', error);
        }
      }
    };
    getCurrentUser();
  }, []);

  // Fetch vaults from blockchain
    // Fetch all vaults from blockchain where current user is a member
  const fetchVaultsFromBlockchain = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      // Get all vault owners from registry
      const vaultOwnersResult = await client.view({
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_all_vault_owners`,
        type_arguments: [],
        arguments: [],
      });
      
      const vaultOwners = vaultOwnersResult[0] as string[] || [];
      const userVaults: Vault[] = [];
      
      // Check each vault to see if current user is a member or creator
      for (const owner of vaultOwners) {
        try {
          // Check if user is member of this vault
          const isMemberResult = await client.view({
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::is_user_vault_member`,
            type_arguments: [],
            arguments: [currentUser, owner],
          });
          
          if (isMemberResult[0] === true) {
            // Get vault info
            const vaultInfoResult = await client.view({
              function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_vault_info`,
              type_arguments: [],
              arguments: [owner],
            });
            
            const [id, name, , , requiredSignatures, balance, createdAt] = vaultInfoResult as [number, string, string, number, number, number, number];
            
            // Get members
            const membersResult = await client.view({
              function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_vault_members`,
              type_arguments: [],
              arguments: [owner],
            });
            
            const members = (membersResult[0] as any[] || []).map((member: any) => member.address);
            
            const vault: Vault = {
              id: id.toString(),
              name,
              members,
              signaturesRequired: requiredSignatures,
              balance: balance / 100000000, // Convert from octas to APT
              createdAt: new Date(createdAt * 1000), // Convert from seconds to milliseconds
            };
            
            userVaults.push(vault);
          }
        } catch (error) {
          console.error(`Error fetching vault ${owner}:`, error);
        }
      }
      
      setVaults(userVaults);
    } catch (error) {
      console.error('Error fetching vaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh vaults when current user changes
  useEffect(() => {
    if (currentUser) {
      fetchVaultsFromBlockchain();
    }
  }, [currentUser]);

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

  const refreshVaults = () => {
    fetchVaultsFromBlockchain();
  };

  const createVault = (_vaultData: Omit<Vault, 'id' | 'createdAt'>) => {
    // This is now called after successful blockchain transaction
    // Just refresh the vaults from blockchain
    fetchVaultsFromBlockchain();
    toast({
      title: "Vault Created",
      description: "Vault has been successfully created on blockchain.",
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
      isLoading,
      setCurrentUser,
      createVault,
      refreshVaults,
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