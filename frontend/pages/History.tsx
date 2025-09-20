import { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, Clock } from 'lucide-react';

const History = () => {
  const { transactions, vaults, withdrawalRequests } = useVault();
  const [selectedVault, setSelectedVault] = useState<string>('all');

  const filteredTransactions = transactions
    .filter(tx => selectedVault === 'all' || tx.vaultId === selectedVault)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getVaultName = (vaultId: string) => {
    const vault = vaults.find(v => v.id === vaultId);
    return vault?.name || 'Unknown Vault';
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-success" />;
      case 'withdrawal_request':
        return <ArrowUpRight className="h-4 w-4 text-warning" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'rejection':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'withdrawal_complete':
        return <ArrowUpRight className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge className="badge-approved">Deposit</Badge>;
      case 'withdrawal_request':
        return <Badge className="badge-pending">Request</Badge>;
      case 'approval':
        return <Badge className="badge-approved">Approved</Badge>;
      case 'rejection':
        return <Badge className="badge-rejected">Rejected</Badge>;
      case 'withdrawal_complete':
        return <Badge className="badge-approved">Completed</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getWithdrawalRequestDetails = (requestId?: string) => {
    if (!requestId) return null;
    return withdrawalRequests.find(r => r.id === requestId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Transaction History
        </h1>
        <p className="text-muted-foreground text-lg">
          Complete audit trail of all vault activities
        </p>
      </div>

      {/* Vault Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedVault('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedVault === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            All Vaults
          </button>
          {vaults.map((vault) => (
            <button
              key={vault.id}
              onClick={() => setSelectedVault(vault.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedVault === vault.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {vault.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions */}
      {filteredTransactions.length > 0 ? (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => {
            const withdrawalRequest = getWithdrawalRequestDetails(transaction.withdrawalRequestId);
            
            return (
              <Card key={transaction.id} className="vault-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="mt-1">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg capitalize">
                            {transaction.type.replace('_', ' ')}
                          </h3>
                          {getTransactionBadge(transaction.type)}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div>Vault: {getVaultName(transaction.vaultId)}</div>
                          {transaction.from && (
                            <div>From: {transaction.from === '0x1234...5678' ? 'You' : transaction.from}</div>
                          )}
                          {transaction.purpose && (
                            <div>Purpose: {transaction.purpose}</div>
                          )}
                          {withdrawalRequest && (
                            <div>
                              Request Status: 
                              <span className={`ml-1 font-medium ${
                                withdrawalRequest.status === 'approved' ? 'text-success' :
                                withdrawalRequest.status === 'rejected' ? 'text-destructive' :
                                withdrawalRequest.status === 'expired' ? 'text-muted-foreground' :
                                'text-warning'
                              }`}>
                                {withdrawalRequest.status}
                              </span>
                            </div>
                          )}
                          <div>
                            {transaction.timestamp.toLocaleDateString()} at {transaction.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {transaction.amount && (
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          transaction.type === 'deposit' ? 'text-success' : 
                          transaction.type === 'withdrawal_complete' ? 'text-warning' :
                          'text-foreground'
                        }`}>
                          {transaction.type === 'deposit' ? '+' : 
                           transaction.type === 'withdrawal_complete' ? '-' : ''}
                          {transaction.amount.toLocaleString()} USDC
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="vault-card">
          <CardContent className="p-12 text-center">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Transactions Found</h3>
            <p className="text-muted-foreground">
              {selectedVault === 'all' 
                ? "No transactions have been recorded yet."
                : `No transactions found for ${getVaultName(selectedVault)}.`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default History;