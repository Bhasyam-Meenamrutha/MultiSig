import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Download, Users, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { TransactionHistory } from '@/types/vault';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const VaultDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getVaultById, 
    getRequestsForVault,
    getTransactionHistory,
    deposit, 
    requestWithdrawal, 
    approveRequest, 
    rejectRequest,
    currentUser 
  } = useVault();

  const vault = getVaultById(id!);
  const requests = getRequestsForVault(id!);

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPurpose, setWithdrawPurpose] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [blockchainHistory, setBlockchainHistory] = useState<TransactionHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  if (!vault) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Vault Not Found</h1>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

  // Fetch transaction history from blockchain
  useEffect(() => {
    const fetchHistory = async () => {
      if (!vault?.ownerAddress) return;
      setLoadingHistory(true);
      try {
        const history = await getTransactionHistory(vault.ownerAddress);
        setBlockchainHistory(history);
      } catch (error) {
        console.error('Failed to fetch transaction history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [vault?.ownerAddress, getTransactionHistory]); // Only depend on ownerAddress, not the entire vault object

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (amount > 0) {
      const success = await deposit(vault.ownerAddress, amount);
      if (success) {
        setDepositAmount('');
        setShowDepositModal(false);
        // Refresh transaction history
        try {
          const history = await getTransactionHistory(vault.ownerAddress);
          setBlockchainHistory(history);
        } catch (error) {
          console.error('Failed to refresh transaction history:', error);
        }
      }
    }
  };

  const handleWithdrawRequest = () => {
    const amount = parseFloat(withdrawAmount);
    if (amount > 0 && withdrawPurpose.trim()) {
      requestWithdrawal(vault.id, amount, withdrawPurpose.trim());
      setWithdrawAmount('');
      setWithdrawPurpose('');
      setShowWithdrawModal(false);
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{vault.name}</h1>
            <div className="flex items-center space-x-4 text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{vault.members.length} members</span>
              </div>
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4" />
                <span>{vault.signaturesRequired}/{vault.members.length} signatures required</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">
              {vault.balance.toLocaleString()} USDC
            </div>
            <div className="text-sm text-muted-foreground">Current Balance</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="vault-card">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
                <DialogTrigger asChild>
                  <Button className="btn-vault h-auto py-4 flex-col space-y-2">
                    <Plus className="h-6 w-6" />
                    <span>Deposit Funds</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Deposit to {vault.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="depositAmount">Amount (APT)</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Minimum: 0.01 APT. Make sure you have enough APT in your wallet.
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setShowDepositModal(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleDeposit} disabled={!depositAmount || parseFloat(depositAmount) <= 0} className="flex-1">
                        Deposit
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-auto py-4 flex-col space-y-2">
                    <Download className="h-6 w-6" />
                    <span>Request Withdrawal</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Withdrawal from {vault.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="withdrawAmount">Amount (APT)</Label>
                      <Input
                        id="withdrawAmount"
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        max={vault.balance}
                        step="0.01"
                      />
                      <div className="text-sm text-muted-foreground mt-1">
                        Available: {vault.balance.toLocaleString()} APT
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="withdrawPurpose">Purpose</Label>
                      <Textarea
                        id="withdrawPurpose"
                        value={withdrawPurpose}
                        onChange={(e) => setWithdrawPurpose(e.target.value)}
                        placeholder="Describe the purpose of this withdrawal..."
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setShowWithdrawModal(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleWithdrawRequest} 
                        disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || !withdrawPurpose.trim()}
                        className="flex-1"
                      >
                        Request Withdrawal
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="vault-card">
              <h2 className="text-xl font-bold mb-4">Pending Withdrawal Requests</h2>
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="border border-border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-lg">{request.amount.toLocaleString()} USDC</div>
                        <div className="text-sm text-muted-foreground">
                          Requested by {request.requesterId === currentUser ? 'You' : request.requesterId}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-warning">
                        <Clock className="h-4 w-4" />
                        <span>{getTimeRemaining(request.expiresAt)}</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-1">Purpose:</div>
                      <div className="text-sm text-muted-foreground">{request.purpose}</div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Approvals</span>
                        <span className="text-sm text-muted-foreground">
                          {request.approvals.length} / {vault.signaturesRequired}
                        </span>
                      </div>
                      <div className="progress-multisig">
                        <div 
                          className="progress-fill"
                          style={{ width: `${(request.approvals.length / vault.signaturesRequired) * 100}%` }}
                        />
                      </div>
                    </div>

                    {request.requesterId !== currentUser && 
                     !request.approvals.includes(currentUser) && 
                     !request.rejections.includes(currentUser) && (
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => approveRequest(request.id)}
                          size="sm"
                          className="btn-success flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => rejectRequest(request.id)}
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {(request.approvals.includes(currentUser) || request.rejections.includes(currentUser)) && (
                      <div className="text-sm text-center text-muted-foreground">
                        You have {request.approvals.includes(currentUser) ? 'approved' : 'rejected'} this request
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Members */}
          <div className="vault-card">
            <h3 className="text-lg font-bold mb-4">Vault Members</h3>
            <div className="space-y-3">
              {vault.members.map((member, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-sm">{member}</div>
                    {member === currentUser && (
                      <div className="text-xs text-primary">You</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain Transaction History */}
          <div className="vault-card">
            <h3 className="text-lg font-bold mb-4">Transaction History</h3>
            {loadingHistory ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading transactions...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {blockchainHistory.slice().reverse().map((tx) => (
                  <div key={tx.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="flex items-start space-x-3 text-sm">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        tx.txType === 'deposit' ? 'bg-success' :
                        tx.txType === 'withdrawal' ? 'bg-warning' :
                        'bg-primary'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize">
                            {tx.txType}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {tx.amount.toLocaleString()} APT
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>{tx.description}</div>
                          <div>From: {tx.from.slice(0, 10)}...{tx.from.slice(-6)}</div>
                          <div>To: {tx.to.slice(0, 10)}...{tx.to.slice(-6)}</div>
                          <div>{new Date(tx.timestamp * 1000).toLocaleString()}</div>
                          {tx.txHash && (
                            <div className="mt-1">
                              <a
                                href={`https://explorer.aptoslabs.com/txn/${tx.txHash}?network=testnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 font-mono"
                              >
                                Tx: {tx.txHash.slice(0, 8)}...
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {blockchainHistory.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No transactions yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultDetail;