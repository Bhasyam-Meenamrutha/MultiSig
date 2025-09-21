import { AptosClient, AptosAccount, HexString } from "aptos";
import { readFileSync } from "fs";

// Read .env file
const envContent = readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
  if (line.includes('=')) {
    const [key, value] = line.split('=');
    env[key.trim()] = value.trim();
  }
});

const NODE_URL = "https://fullnode.testnet.aptoslabs.com/v1";
const MODULE_ADDRESS = "0x092eb4358900e3f41b80d857de42963c19c8e46a6d46eaa34686cfeb14ae7f80";
const MODULE_NAME = "multisig";

async function initializeRegistry() {
    console.log("🚀 Initializing Vault Registry...");
    
    const client = new AptosClient(NODE_URL);
    
    // Create deployer account from private key
    const privateKeyHex = env.VITE_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;
    if (!privateKeyHex) {
        console.error("❌ Private key not found in .env");
        return;
    }
    
    const deployerAccount = new AptosAccount(HexString.ensure(privateKeyHex).toUint8Array());
    
    console.log("👤 Deployer address:", deployerAccount.address().hex());

    try {
        const payload = {
            type: "entry_function_payload",
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::initialize_vault_registry`,
            type_arguments: [],
            arguments: [],
        };

        const txnRequest = await client.generateTransaction(deployerAccount.address(), payload);
        const signedTxn = await client.signTransaction(deployerAccount, txnRequest);
        const transactionRes = await client.submitTransaction(signedTxn);
        
        console.log("⏳ Waiting for transaction confirmation...");
        await client.waitForTransaction(transactionRes.hash);
        
        console.log("✅ Vault registry initialized successfully!");
        console.log("📝 Transaction hash:", transactionRes.hash);
        console.log("🔗 Explorer:", `https://explorer.aptoslabs.com/txn/${transactionRes.hash}?network=testnet`);
        
    } catch (error) {
        if (error.message.includes("RESOURCE_ALREADY_EXISTS")) {
            console.log("✅ Registry already initialized!");
        } else {
            console.error("❌ Error:", error.message);
        }
    }
}

initializeRegistry().catch(console.error);