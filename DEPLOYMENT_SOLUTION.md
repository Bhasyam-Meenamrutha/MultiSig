#!/bin/bash

echo "🚀 COMPLETE FRESH DEPLOYMENT GUIDE"
echo "================================="
echo ""
echo "📋 PROBLEM IDENTIFIED:"
echo "   ❌ Current transactions show: 'To: 0xb3be71d3...7f0f84' (vault owner)"
echo "   ❌ This means funds go to personal accounts (OLD system)"
echo "   ❌ Resource accounts not deployed yet (NEW system needed)"
echo ""
echo "✅ SOLUTION - Fresh Deployment Steps:"
echo ""

echo "📌 STEP 1: Create New Aptos Profile"
echo "   mkdir -p ~/.aptos/profiles/multisig_v2"
echo "   aptos init --profile multisig_v2 --network testnet"
echo ""

echo "📌 STEP 2: Get Testnet Funds"
echo "   aptos account fund-with-faucet --profile multisig_v2"
echo ""

echo "📌 STEP 3: Update Configuration"
echo "   # Get the new address from:"
echo "   aptos config show-profiles --profile multisig_v2"
echo "   # Update .env with new address"
echo ""

echo "📌 STEP 4: Deploy New Contract"
echo "   cd contract"
echo "   # Update Move.toml with new address"
echo "   aptos move publish --profile multisig_v2 --assume-yes"
echo ""

echo "📌 STEP 5: Initialize Registry"
echo "   cd ../scripts"
echo "   node init_registry.mjs --profile multisig_v2"
echo ""

echo "📌 STEP 6: Update Frontend Constants"
echo "   # Update frontend/constants.ts with new module address"
echo ""

echo "🔧 AUTOMATIC SCRIPT (Run this):"
cat << 'EOF'
# Save as deploy_new.sh and run: ./deploy_new.sh

#!/bin/bash
set -e

echo "🚀 Starting Fresh Deployment..."

# Step 1: Create new profile
aptos init --profile multisig_v2 --network testnet --skip-faucet

# Step 2: Get new address
NEW_ADDRESS=$(aptos config show-profiles --profile multisig_v2 | grep account | awk '{print $2}')
echo "📍 New Address: $NEW_ADDRESS"

# Step 3: Fund account
aptos account fund-with-faucet --profile multisig_v2 --amount 100000000

# Step 4: Update Move.toml
sed -i "s/meena_add = .*/meena_add = \"$NEW_ADDRESS\"/" contract/Move.toml

# Step 5: Deploy contract
cd contract
aptos move publish --profile multisig_v2 --assume-yes
cd ..

# Step 6: Update .env
sed -i "s/VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=.*/VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=${NEW_ADDRESS}/" .env

# Step 7: Initialize registry
cd scripts
# Update init script to use new profile
sed -i 's/aptos move run/aptos move run --profile multisig_v2/' init_registry.mjs
node init_registry.mjs
cd ..

echo "✅ Deployment Complete!"
echo "📍 New Module Address: $NEW_ADDRESS" 
echo "🔄 Restart frontend to see resource accounts!"

EOF

echo ""
echo "💡 WHAT WILL CHANGE AFTER DEPLOYMENT:"
echo "   ✅ New vaults will create resource accounts"
echo "   ✅ Deposits will show 'To: 0x[resource_account]' (not vault owner)"
echo "   ✅ Vault Pool Details will display actual resource account info"
echo "   ✅ Funds will be truly locked in dedicated pools"
echo ""
echo "📱 FRONTEND IS READY - shows:"
echo "   - Vault Pool Details section"
echo "   - Resource account addresses"
echo "   - Real-time pool balances"
echo "   - Enhanced transaction history"
echo ""
echo "🎯 TO TEST: Create the deploy_new.sh script above and run it!"