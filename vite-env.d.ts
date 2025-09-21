/// <reference types="vite/client" />

interface Window {
  aptos?: {
    isConnected(): Promise<boolean>;
    account(): Promise<{ address: string; publicKey: string }>;
    connect(): Promise<{ address: string; publicKey: string }>;
    disconnect(): Promise<void>;
    signAndSubmitTransaction(transaction: any): Promise<any>;
    signTransaction(transaction: any): Promise<any>;
  };
}
