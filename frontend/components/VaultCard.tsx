import { Link } from 'react-router-dom';
import { Users, Shield, Coins, ArrowRight } from 'lucide-react';
import { Vault } from '@/types/vault';
import { useVault } from '@/context/VaultContext';

interface VaultCardProps {
  vault: Vault;
}

const VaultCard = ({ vault }: VaultCardProps) => {
  const { getRequestsForVault } = useVault();
  const pendingRequests = getRequestsForVault(vault.id).filter(r => r.status === 'pending').length;

  return (
    <div className="vault-card group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">{vault.name}</h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{vault.members.length} members</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4" />
              <span>{vault.signaturesRequired}/{vault.members.length} required</span>
            </div>
          </div>
        </div>
        
        {pendingRequests > 0 && (
          <div className="badge-pending">
            {pendingRequests} pending
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold text-foreground">
            {vault.balance.toLocaleString()} <span className="text-lg text-muted-foreground">USDC</span>
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Created {vault.createdAt.toLocaleDateString()}
        </div>
      </div>

      <Link
        to={`/vault/${vault.id}`}
        className="flex items-center justify-between w-full btn-vault group-hover:scale-105"
      >
        <span>Manage Vault</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
};

export default VaultCard;