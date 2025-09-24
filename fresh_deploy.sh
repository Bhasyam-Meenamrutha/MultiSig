#!/bin/bash

echo "🏗️  Setting up Fresh Multisig Vault Deployment"
echo "=============================================="

# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI not found. Please install it first:"
    echo "   curl -fsSL https://aptos.dev/scripts/install_cli.py | python3"
    exit 1
fi

echo "📋 Step 1: Creating new deployer account..."
echo "   This will create a new .aptos/config.yaml"
echo "   Current config will be backed up as .aptos/config.yaml.backup"

# Backup existing config if it exists
if [ -f ".aptos/config.yaml" ]; then
    cp .aptos/config.yaml .aptos/config.yaml.backup
    echo "   ✅ Existing config backed up"
fi

# Initialize new account
echo "   🔑 Initializing new account on testnet..."
aptos init --network testnet --skip-faucet

# Get the new address
NEW_ADDRESS=$(aptos config show-profiles --profile default | grep account | awk '{print $2}')
echo "   📍 New deployer address: $NEW_ADDRESS"

echo ""
echo "💰 Step 2: Funding account..."
echo "   Getting testnet APT..."
aptos account fund-with-faucet --account $NEW_ADDRESS

echo ""
echo "📝 Step 3: Updating configuration files..."

# Update .env file
if [ -f ".env" ]; then
    cp .env .env.backup
    sed -i "s/VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=.*/VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=$NEW_ADDRESS/" .env
    echo "   ✅ Updated .env file"
else
    echo "   ⚠️  .env file not found. Please create it with:"
    echo "      VITE_MODULE_PUBLISHER_ACCOUNT_ADDRESS=$NEW_ADDRESS"
fi

# Update Move.toml
if [ -f "contract/Move.toml" ]; then
    cp contract/Move.toml contract/Move.toml.backup
    sed -i "s/meena_add = \".*\"/meena_add = \"$NEW_ADDRESS\"/" contract/Move.toml
    echo "   ✅ Updated contract/Move.toml"
else
    echo "   ⚠️  contract/Move.toml not found"
fi

echo ""
echo "🏗️  Step 4: Compiling contract..."
cd contract
aptos move compile
if [ $? -eq 0 ]; then
    echo "   ✅ Compilation successful"
else
    echo "   ❌ Compilation failed"
    exit 1
fi

echo ""
echo "🚀 Step 5: Publishing contract..."
aptos move publish --assume-yes
if [ $? -eq 0 ]; then
    echo "   ✅ Contract published successfully"
else
    echo "   ❌ Contract publication failed"
    exit 1
fi

cd ..

echo ""
echo "🔧 Step 6: Initializing registry..."
cd scripts
if [ -f "init_registry.mjs" ]; then
    node init_registry.mjs
    if [ $? -eq 0 ]; then
        echo "   ✅ Registry initialized"
    else
        echo "   ❌ Registry initialization failed"
    fi
else
    echo "   ⚠️  init_registry.mjs not found"
fi
cd ..

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "   📍 Contract Address: $NEW_ADDRESS"
echo "   🔗 View on Explorer: https://explorer.aptoslabs.com/account/$NEW_ADDRESS?network=testnet"
echo ""
echo "📋 Next Steps:"
echo "   1. Start your frontend: npm run dev"
echo "   2. Create a test vault"
echo "   3. Test deposits and see the new resource account system!"
echo ""
echo "📄 Check RESOURCE_ACCOUNT_UPDATE.md for detailed information about changes"