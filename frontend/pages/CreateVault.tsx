import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Shield, Users, ArrowLeft, User } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { NETWORK, MODULE_ADDRESS } from "../constants";
import { AptosClient } from 'aptos';
interface Member {
  address: string;
  name: string;
}

  const NODE_URL = `https://fullnode.${NETWORK}.aptoslabs.com/v1`;
  const MODULE_NAME = "multisig"; // Updated to match your smart contract module name
  const client = new AptosClient(NODE_URL);

const CreateVault = () => {
  const navigate = useNavigate();
  const { createVault } = useVault();
  
  const [vaultName, setVaultName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [members, setMembers] = useState<Member[]>([]); // Will be populated after wallet connection
  const [signaturesRequired, setSignaturesRequired] = useState(1);
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // Get connected wallet address on component mount
  useEffect(() => {
    const getWalletAddress = async () => {
      if (window.aptos) {
        try {
          const isConnected = await window.aptos.isConnected();
          if (isConnected) {
            const accountResponse = await window.aptos.account();
            setWalletAddress(accountResponse.address);
            setIsWalletConnected(true);
            
            // Initialize members array with connected user as creator
            setMembers([
              { address: accountResponse.address, name: 'You (Creator)' }
            ]);
          } else {
            setIsWalletConnected(false);
            // Fallback to mock address for development
            const fallbackAddress = '0x1234...5678';
            setWalletAddress(fallbackAddress);
            setMembers([
              { address: fallbackAddress, name: 'You (Creator) - Mock' }
            ]);
          }
        } catch (error) {
          console.error('Error getting wallet address:', error);
          // Fallback to mock address
          const fallbackAddress = '0x1234...5678';
          setWalletAddress(fallbackAddress);
          setMembers([
            { address: fallbackAddress, name: 'You (Creator) - Mock' }
          ]);
        }
      } else {
        console.warn('Aptos wallet not detected');
        // Fallback to mock address
        const fallbackAddress = '0x1234...5678';
        setWalletAddress(fallbackAddress);
        setMembers([
          { address: fallbackAddress, name: 'You (Creator) - Mock' }
        ]);
      }
    };

    getWalletAddress();
  }, []);

  // Function to initialize vault registry (only deployer can do this)
  const initializeVaultRegistry = async () => {
    // Check if current wallet is the deployer
    const deployerAddress = "0x092eb4358900e3f41b80d857de42963c19c8e46a6d46eaa34686cfeb14ae7f80";
    if (walletAddress.toLowerCase() !== deployerAddress.toLowerCase()) {
      toast({ 
        title: "Permission Denied", 
        description: "Only the contract deployer can initialize the registry",
        variant: "destructive" 
      });
      return false;
    }

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${MODULE_ADDRESS}::${MODULE_NAME}::initialize_vault_registry`,
        type_arguments: [],
        arguments: [],
      };

      console.log('Initializing Vault Registry...');
      const response = await window.aptos?.signAndSubmitTransaction(payload);
      if (!response?.hash) throw new Error("Transaction failed");
      await client.waitForTransaction(response.hash);
      console.log('Vault Registry initialized successfully!');
      return true;
    } catch (error: any) {
      console.log('Registry initialization failed:', error?.message);
      toast({ 
        title: "Initialization Failed", 
        description: error?.message || "Failed to initialize registry",
        variant: "destructive" 
      });
      return false;
    }
  };

  const addMember = () => {
    if (newMemberAddress && newMemberName && !members.some(member => member.address === newMemberAddress)) {
      setMembers([...members, { address: newMemberAddress, name: newMemberName }]);
      setNewMemberAddress('');
      setNewMemberName('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName.trim()) return;
    if (members.length < 1) return;
    if (signaturesRequired < 1 || signaturesRequired > members.length) return;

    const memberAddresses = members.map(m => m.address);
    const memberNames = members.map(m => m.name);

    if (!window.aptos) {
      toast({ title: "Wallet Error", description: "Aptos wallet not connected", variant: "destructive" });
      return;
    }
    if (!MODULE_ADDRESS) {
      toast({ title: "Config Error", description: "Contract address not configured", variant: "destructive" });
      return;
    }

    // Prepare vault creation payload
    const payload = {
      type: "entry_function_payload",
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_vault`,
      type_arguments: [],
      arguments: [
        vaultName.trim(),
        memberAddresses,
        memberNames,
        Number(signaturesRequired)
      ],
    };

    try {
      const response = await window.aptos?.signAndSubmitTransaction(payload);
      if (!response?.hash) throw new Error("Transaction failed");
      await client.waitForTransaction(response.hash);
      toast({ title: "Vault Created!", description: `Tx: ${response.hash.slice(0, 10)}...` });
      createVault({
        name: vaultName.trim(),
        members: memberAddresses,
        signaturesRequired,
        balance: 0,
      });
      navigate('/');
    } catch (err: any) {
      let errorMsg = err?.message || "Failed to create vault";
      
      // Check if it's the registry initialization error  
      if (err?.message?.includes("0x3e8") || err?.message?.includes("1000")) {
        errorMsg = "Registry not initialized. Click 'Initialize Registry' button above if you are the deployer, or contact the deployer.";
      }
      
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
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
        {/* Wallet Connection Status */}
        <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 ${
          isWalletConnected ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isWalletConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm font-medium">
            {isWalletConnected 
              ? `✓ Wallet Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : '⚠ Using Mock Address (Connect your wallet for real transactions)'
            }
          </span>
        </div>
        {/* Debug Section - Initialize Registry */}
        {isWalletConnected && (
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Smart Contract Setup</p>
                <p className="text-xs text-blue-600">Initialize the vault registry if this is the first time</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const success = await initializeVaultRegistry();
                  if (success) {
                    toast({ title: "Registry Initialized", description: "Vault registry is ready!" });
                  } else {
                    toast({ title: "Registry Status", description: "Registry already initialized or initialization failed" });
                  }
                }}
                className="text-blue-800 border-blue-300 hover:bg-blue-100"
              >
                Initialize Registry
              </Button>
            </div>
          </div>
        )}
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
                  <div className="flex items-center space-x-2 flex-1">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{member.address}</div>
                    </div>
                    {index === 0 && (
                      <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Creator</span>
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
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <Input
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Member name (e.g., John Doe)"
                  className="w-full"
                />
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
                    disabled={!newMemberAddress || !newMemberName}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {(!newMemberName || !newMemberAddress) && (newMemberName || newMemberAddress) && (
                <p className="text-xs text-muted-foreground">
                  Please provide both member name and wallet address
                </p>
              )}
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
}

export default CreateVault;
