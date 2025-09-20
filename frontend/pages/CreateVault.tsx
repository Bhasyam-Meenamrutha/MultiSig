import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Shield, Users, ArrowLeft } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CreateVault = () => {
  const navigate = useNavigate();
  const { createVault } = useVault();
  
  const [vaultName, setVaultName] = useState('');
  const [members, setMembers] = useState(['0x1234...5678']); // Current user
  const [signaturesRequired, setSignaturesRequired] = useState(1);
  const [newMemberAddress, setNewMemberAddress] = useState('');

  const addMember = () => {
    if (newMemberAddress && !members.includes(newMemberAddress)) {
      setMembers([...members, newMemberAddress]);
      setNewMemberAddress('');
    }
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      const newMembers = members.filter((_, i) => i !== index);
      setMembers(newMembers);
      // Adjust signatures required if necessary
      if (signaturesRequired > newMembers.length) {
        setSignaturesRequired(newMembers.length);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vaultName.trim()) return;
    if (members.length < 1) return;
    if (signaturesRequired < 1 || signaturesRequired > members.length) return;

    createVault({
      name: vaultName.trim(),
      members,
      signaturesRequired,
      balance: 0,
    });

    navigate('/');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Create New Vault
        </h1>
        <p className="text-muted-foreground text-lg">
          Set up a multi-signature savings vault for your team
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vault Name */}
        <Card className="vault-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Vault Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="vaultName">Vault Name</Label>
              <Input
                id="vaultName"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="e.g., Emergency Fund, Vacation Savings"
                className="mt-1"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="vault-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Members ({members.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Members */}
            <div className="space-y-2">
              {members.map((member, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <span className="font-mono text-sm">{member}</span>
                    {index === 0 && (
                      <span className="ml-2 text-xs text-primary">(You)</span>
                    )}
                  </div>
                  {members.length > 1 && index > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMember(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Member */}
            <div className="flex space-x-2">
              <Input
                value={newMemberAddress}
                onChange={(e) => setNewMemberAddress(e.target.value)}
                placeholder="0x... wallet address"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addMember}
                disabled={!newMemberAddress}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Signature Requirements */}
        <Card className="vault-card">
          <CardHeader>
            <CardTitle>Multi-Signature Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="signatures">Signatures Required for Withdrawals</Label>
              <div className="flex items-center space-x-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSignaturesRequired(Math.max(1, signaturesRequired - 1))}
                  disabled={signaturesRequired <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {signaturesRequired} / {members.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    signatures required
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSignaturesRequired(Math.min(members.length, signaturesRequired + 1))}
                  disabled={signaturesRequired >= members.length}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Security Level Indicator */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Security Level</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  signaturesRequired === 1 ? 'bg-warning text-warning-foreground' :
                  signaturesRequired === members.length ? 'bg-success text-success-foreground' :
                  'bg-primary text-primary-foreground'
                }`}>
                  {signaturesRequired === 1 ? 'Low' :
                   signaturesRequired === members.length ? 'Maximum' : 'Medium'}
                </span>
              </div>
              <div className="progress-multisig">
                <div 
                  className="progress-fill"
                  style={{ width: `${(signaturesRequired / members.length) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {signaturesRequired === 1 && "Any single member can withdraw funds"}
                {signaturesRequired > 1 && signaturesRequired < members.length && 
                  `${signaturesRequired} out of ${members.length} members must approve withdrawals`}
                {signaturesRequired === members.length && "All members must approve withdrawals"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 btn-vault"
            disabled={!vaultName.trim() || members.length < 1}
          >
            Create Vault
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateVault;
