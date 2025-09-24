#!/bin/bash
set -e

echo "🚀 Starting Fresh Deployment with Resource Accounts..."
echo "====================================================="

# Step 1: Create new profile
echo "📌 Step 1: Creating new Aptos profile 'multisig_v2'..."
aptos init --profile multisig_v2 --network testnet --skip-faucet

# Step 2: Get new address
NEW_ADDRESS=$(aptos config show-profiles --profile multisig_v2 | grep account | awk '{print $2}')
echo "📍 New Deployer Address: $NEW_ADDRESS"

# Step 3: Fund account
echo "📌 Step 2: Funding account with testnet APT..."
aptos account fund-with-faucet --profile multisig_v2 --amount 100000000

# Step 4: Update Move.toml
echo "📌 Step 3: Updating Move.toml with new address..."
sed -i "s/meena_add = .*/meena_add = \"$NEW_ADDRESS\"/" contract/Move.toml
echo "   ✅ Move.toml updated"

# Step 5: Deploy contract
echo "📌 Step 4: Deploying updated contract with resource accounts..."
cd contract
aptos move publish --profile multisig_v2 --assume-yes
cd ..
echo "   ✅ Contract deployed successfully!"

# Step 6: Update .env
echo "📌 Step 5: Updating .env file..."
# Remove 0x prefix if present, then add it back
CLEAN_ADDRESS=${NEW_ADDRESS#0x}
sed -i "s/VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=.*/VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=${CLEAN_ADDRESS}/" .env
echo "   ✅ .env updated"

# Step 7: Initialize registry
echo "📌 Step 6: Initializing vault registry..."
cd scripts
# Create a temporary init script for the new profile
cat > init_registry_v2.mjs << EOF
import { AptosAccount, AptosClient, HexString } from "aptos";
import dotenv from "dotenv";

dotenv.config();

const NODE_URL = "https://fullnode.testnet.aptoslabs.com/v1";
const client = new AptosClient(NODE_URL);

// Get private key from the new profile config
import { execSync } from 'child_process';
const privateKeyHex = execSync('aptos config show-profiles --profile multisig_v2 | grep private_key | awk "{print \\$2}"', { encoding: 'utf-8' }).trim();

const account = new AptosAccount(HexString.ensure(privateKeyHex).toUint8Array());

async function initializeRegistry() {
    try {
        console.log("🔧 Initializing vault registry...");
        
        const payload = {
            type: "entry_function_payload",
            function: "${NEW_ADDRESS}::multisig::initialize_vault_registry",
            type_arguments: [],
            arguments: [],
        };

        const txnRequest = await client.generateTransaction(account.address(), payload);
        const signedTxn = await client.signTransaction(account, txnRequest);
        const transactionRes = await client.submitTransaction(signedTxn);
        
        await client.waitForTransaction(transactionRes.hash);
        console.log("✅ Registry initialized successfully!");
        console.log("📋 Transaction hash:", transactionRes.hash);
        
    } catch (error) {
        console.error("❌ Error initializing registry:", error);
    }
}

initializeRegistry();
EOF

node init_registry_v2.mjs
cd ..

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo "📍 New Module Address: $NEW_ADDRESS"
echo "🔄 Frontend configuration updated"
echo "✅ Resource accounts enabled"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Restart your frontend (npm run dev)"
echo "2. Create a new vault"
echo "3. Make a deposit"
echo "4. Check transaction history - you'll see:"
echo "   ✅ 'To: 0x[resource_account_address]' (not vault owner)"
echo "   ✅ Vault Pool Details showing resource account"
echo "   ✅ Funds truly locked in dedicated pools"
echo ""
echo "💡 The resource account addresses will be unique for each vault!"
echo "   Example: 0x7c1644...2618 (Vault 0), 0x379292...7aeb (Vault 1), etc."