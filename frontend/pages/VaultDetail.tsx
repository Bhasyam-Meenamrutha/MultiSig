import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Download, Users, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
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
    getTransactionsForVault,
    deposit, 
    requestWithdrawal, 
    approveRequest, 
    rejectRequest,
    currentUser 
  } = useVault();

  const vault = getVaultById(id!);
  const requests = getRequestsForVault(id!);
  const transactions = getTransactionsForVault(id!);

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPurpose, setWithdrawPurpose] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

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

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (amount > 0) {
      deposit(vault.id, amount);
      setDepositAmount('');
      setShowDepositModal(false);
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
                      <Label htmlFor="depositAmount">Amount (USDC)</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
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
                      <Label htmlFor="withdrawAmount">Amount (USDC)</Label>
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
                        Available: {vault.balance.toLocaleString()} USDC
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

          {/* Recent Transactions */}
          <div className="vault-card">
            <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {transactions.slice(-5).reverse().map((tx) => (
                <div key={tx.id} className="flex items-center space-x-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    tx.type === 'deposit' ? 'bg-success' :
                    tx.type === 'withdrawal_complete' ? 'bg-warning' :
                    tx.type === 'approval' ? 'bg-primary' :
                    'bg-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <div className="capitalize">
                      {tx.type.replace('_', ' ')}
                      {tx.amount && ` - ${tx.amount.toLocaleString()} USDC`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tx.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No transactions yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultDetail;