const { AptosClient, AptosAccount, HexString } = require("aptos");
require('dotenv').config();

const NODE_URL = "https://fullnode.testnet.aptoslabs.com/v1";
const MODULE_ADDRESS = "0x092eb4358900e3f41b80d857de42963c19c8e46a6d46eaa34686cfeb14ae7f80";
const MODULE_NAME = "multisig";

async function initializeRegistry() {
    if (!process.env.VITE_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY) {
        console.error("VITE_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY not found in .env file");
        return;
    }

    const client = new AptosClient(NODE_URL);
    
    // Create deployer account from private key
    const privateKeyHex = process.env.VITE_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY;
    const deployerAccount = new AptosAccount(HexString.ensure(privateKeyHex).toUint8Array());
    
    console.log("Deployer address:", deployerAccount.address().hex());
    console.log("Initializing vault registry...");

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
        
        await client.waitForTransaction(transactionRes.hash);
        
        console.log("✅ Vault registry initialized successfully!");
        console.log("Transaction hash:", transactionRes.hash);
        
    } catch (error) {
        if (error.message.includes("RESOURCE_ALREADY_EXISTS")) {
            console.log("✅ Registry already initialized!");
        } else {
            console.error("❌ Error initializing registry:", error.message);
        }
    }
}

initializeRegistry().catch(console.error);