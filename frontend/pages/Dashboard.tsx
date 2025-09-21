import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Vault, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVault } from '@/context/VaultContext';
import VaultCard from '@/components/VaultCard';
import Hero from '@/components/Hero';
import Footer from '@/components/Footer';

const Dashboard = () => {
  const { vaults, withdrawalRequests, isLoading } = useVault();
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');

  const totalBalance = vaults.reduce((sum, vault) => sum + vault.balance, 0);
  const pendingRequests = withdrawalRequests.filter(r => r.status === 'pending').length;

  const filteredVaults = vaults.filter(vault => {
    if (filter === 'all') return true;
    if (filter === 'active') return vault.balance > 0;
    if (filter === 'pending') {
      const hasPending = withdrawalRequests.some(r => r.vaultId === vault.id && r.status === 'pending');
      return hasPending;
    }
    return true;
  });

  return (
    <div>
      {/* Hero Section - Only show when there are no vaults or user is new */}
      {vaults.length === 0 && <Hero />}
      
      <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Vault Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your multi-signature savings vaults with quantum security
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="vault-card">
          <div className="flex items-center space-x-3 mb-3">
            <Vault className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Vaults</p>
              <p className="text-2xl font-bold">{vaults.length}</p>
            </div>
          </div>
        </div>

        <div className="vault-card">
          <div className="flex items-center space-x-3 mb-3">
            <TrendingUp className="h-8 w-8 text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold">{totalBalance.toLocaleString()} APT</p>
            </div>
          </div>
        </div>

        <div className="vault-card">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${pendingRequests > 0 ? 'bg-warning' : 'bg-success'}`}>
              <span className="text-sm font-bold text-white">{pendingRequests}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-bold">{pendingRequests}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6">
        {[
          { key: 'all', label: 'All Vaults' },
          { key: 'active', label: 'Active' },
          { key: 'pending', label: 'Has Pending' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vaults Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your vaults from blockchain...</p>
        </div>
      ) : filteredVaults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVaults.map((vault) => (
            <VaultCard key={vault.id} vault={vault} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Vault className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No vaults found</h3>
          <p className="text-muted-foreground mb-6">
            {filter === 'all' 
              ? "Create your first multi-sig vault to get started" 
              : `No vaults match the ${filter} filter`
            }
          </p>
          {filter === 'all' && (
            <Link to="/create" className="btn-vault inline-flex items-center space-x-2">
              <PlusCircle className="h-4 w-4" />
              <span>Create Your First Vault</span>
            </Link>
          )}
        </div>
      )}

      {/* Quick Action
      {vaults.length > 0 && (
        <div className="fixed bottom-8 right-8">
          <Link
            to="/create"
            className="btn-vault rounded-full p-4 shadow-lg hover:shadow-xl"
          >
            <PlusCircle className="h-6 w-6" />
          </Link>
        </div>
      )} */}
      </div>
      
      <Footer />
    </div>
  );
};

export default Dashboard;