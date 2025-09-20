import { Link, useLocation } from 'react-router-dom';
import { Vault, PlusCircle, Home, History, ChevronDown, Copy, Check, Wallet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Extend Window interface for Petra wallet
declare global {
  interface Window {
    aptos: {
      connect(): Promise<void>;
      isConnected(): Promise<boolean>;
      account(): Promise<{ address: string; publicKey: string }>;
      disconnect(): Promise<void>;
    };
  }
}

const Navbar = () => {
  const location = useLocation();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Create Vault', path: '/create', icon: PlusCircle },
    { name: 'History', path: '/history', icon: History },
  ];

  // Check for existing wallet connection on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (window.aptos) {
          const isConnected = await window.aptos.isConnected();
          if (isConnected) {
            const accountResponse = await window.aptos.account();
            setWalletAddress(accountResponse.address);
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.log("No existing wallet connection found");
      }
    };

    checkWalletConnection();
  }, []);

  const connectBtnFun = async () => {
    try {
      // Check if Petra wallet is installed
      if (!window.aptos) {
        alert("Petra wallet is not installed. Please install it from the Chrome Web Store.");
        window.open("https://chrome.google.com/webstore/detail/petra-aptos-wallet/ejjladinnckdgjemekebdpeokbikhfci", "_blank");
        return;
      }

      console.log("Attempting to connect to Petra wallet...");
      
      // Check if already connected
      const alreadyConnected = await window.aptos.isConnected();
      console.log("Already connected:", alreadyConnected);
      
      if (!alreadyConnected) {
        console.log("Requesting connection...");
        await window.aptos.connect();
      }
      
      // Get account information
      const accountResponse = await window.aptos.account();
      console.log("Account response:", accountResponse);
      
      setWalletAddress(accountResponse.address);
      setIsConnected(true);
      console.log("Wallet connected successfully!");
      
    } catch (error) {
      console.error("Error connecting wallet:", error);
      
      // Handle specific error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("User rejected")) {
        alert("Connection was rejected. Please try again and approve the connection.");
      } else if (errorMessage.includes("not installed")) {
        alert("Petra wallet is not installed. Please install it from the Chrome Web Store.");
        window.open("https://chrome.google.com/webstore/detail/petra-aptos-wallet/ejjladinnckdgjemekebdpeokbikhfci", "_blank");
      } else {
        alert("Failed to connect to Petra wallet. Please make sure it's installed and unlocked.");
      }
    }
  };

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <Vault className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Multi-Sig Vault
            </span>
          </Link>

          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground glow-primary' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-3">
            {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <div className="text-sm">
                      <span className="text-muted-foreground">Connected: </span>
                      <span className="text-primary font-mono">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem className="flex items-center justify-between p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">Petra Wallet</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {walletAddress}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(walletAddress);
                        setCopiedAddress(walletAddress);
                        setTimeout(() => setCopiedAddress(null), 2000);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      {copiedAddress === walletAddress ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={connectBtnFun}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </Button>
            )}
            <div className="w-3 h-3 bg-success rounded-full animate-pulse-glow"></div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;