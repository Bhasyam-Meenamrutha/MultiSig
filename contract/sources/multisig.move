module meena_add::multisig{
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_std::table::{Self, Table};
    use aptos_framework::timestamp;

    // Error codes
    const EVAULT_NOT_FOUND: u64 = 1001;
    const ENOT_VAULT_CREATOR: u64 = 1002;
    const ENOT_VAULT_MEMBER: u64 = 1003;
    const EINSUFFICIENT_SIGNATURES: u64 = 1004;
    const EALREADY_SIGNED: u64 = 1005;
    const ETRANSACTION_NOT_FOUND: u64 = 1006;
    const EINSUFFICIENT_BALANCE: u64 = 1007;
    const EINVALID_MEMBER_COUNT: u64 = 1008;
    const EINVALID_SIGNATURE_THRESHOLD: u64 = 1009;
    const EVAULT_NAME_EMPTY: u64 = 1010;

    // Struct to represent a vault member
    struct VaultMember has copy, drop, store {
        address: address,
        name: String,
    }

    // Struct to represent a pending transaction
    struct PendingTransaction has copy, drop, store {
        id: u64,
        to: address,
        amount: u64,
        description: String,
        signatures: vector<address>,
        created_by: address,
        created_at: u64,
        executed: bool,
    }

    // Main vault structure
    struct Vault has key, store {
        id: u64,
        name: String,
        creator: address,
        members: vector<VaultMember>,
        required_signatures: u64,
        balance: coin::Coin<AptosCoin>,
        pending_transactions: vector<PendingTransaction>,
        transaction_counter: u64,
        created_at: u64,
    }

    // User profile to store user details
    struct UserProfile has key, drop {
        name: String,
        email: String,
        created_vaults: vector<u64>,
        member_of_vaults: vector<u64>,
    }

    // Global vault registry to track all vaults and assign IDs
    struct VaultRegistry has key {
        vault_counter: u64,
        vault_owners: Table<u64, address>, // vault_id -> creator_address
        all_vaults: Table<address, vector<u64>>, // user_address -> vault_ids_they_created
    }

    // Initialize the vault registry - should be called by module deployer
    public entry fun initialize_vault_registry(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        // Only allow the module deployer to initialize
        assert!(deployer_addr == @meena_add, 1000);
        
        if (!exists<VaultRegistry>(@meena_add)) {
            let vault_owners = table::new();
            let all_vaults = table::new();
            move_to(deployer, VaultRegistry { 
                vault_counter: 0,
                vault_owners,
                all_vaults,
            });
        };
    }

    // Store or update user profile
    public entry fun store_user_profile(
        user: &signer,
        name: String,
        email: String,
    ) acquires UserProfile {
        let user_addr = signer::address_of(user);

        if (!exists<UserProfile>(user_addr)) {
            move_to(user, UserProfile {
                name,
                email,
                created_vaults: vector::empty<u64>(),
                member_of_vaults: vector::empty<u64>(),
            });
        } else {
            let profile = borrow_global_mut<UserProfile>(user_addr);
            profile.name = name;
            profile.email = email;
        }
    }

    // Create a new vault
    public entry fun create_vault(
        creator: &signer,
        vault_name: String,
        member_addresses: vector<address>,
        member_names: vector<String>,
        required_signatures: u64,
    ) acquires VaultRegistry, UserProfile {
        let creator_addr = signer::address_of(creator);
        
        // Validate inputs
        assert!(!string::is_empty(&vault_name), EVAULT_NAME_EMPTY);
        let member_count = vector::length(&member_addresses);
        assert!(member_count > 0, EINVALID_MEMBER_COUNT);
        assert!(vector::length(&member_names) == member_count, EINVALID_MEMBER_COUNT);
        assert!(required_signatures > 0 && required_signatures <= member_count + 1, EINVALID_SIGNATURE_THRESHOLD);

        // Ensure registry exists
        assert!(exists<VaultRegistry>(@meena_add), 1000);

        // Get next vault ID from registry
        let registry = borrow_global_mut<VaultRegistry>(@meena_add);
        let vault_id = registry.vault_counter;
        registry.vault_counter = registry.vault_counter + 1;

        // Create vault members vector
        let members = vector::empty<VaultMember>();
        let i = 0;
        while (i < member_count) {
            let member_addr = *vector::borrow(&member_addresses, i);
            let member_name = *vector::borrow(&member_names, i);
            let member = VaultMember {
                address: member_addr,
                name: member_name,
            };
            vector::push_back(&mut members, member);
            
            // Update member's profile to include this vault
            if (exists<UserProfile>(member_addr)) {
                let member_profile = borrow_global_mut<UserProfile>(member_addr);
                vector::push_back(&mut member_profile.member_of_vaults, vault_id);
            };
            
            i = i + 1;
        };

        // Create the vault
        let vault = Vault {
            id: vault_id,
            name: vault_name,
            creator: creator_addr,
            members,
            required_signatures,
            balance: coin::zero<AptosCoin>(),
            pending_transactions: vector::empty<PendingTransaction>(),
            transaction_counter: 0,
            created_at: timestamp::now_seconds(),
        };

        // Store vault ownership in registry
        table::add(&mut registry.vault_owners, vault_id, creator_addr);
        
        // Add to creator's vault list in registry
        if (table::contains(&registry.all_vaults, creator_addr)) {
            let creator_vaults = table::borrow_mut(&mut registry.all_vaults, creator_addr);
            vector::push_back(creator_vaults, vault_id);
        } else {
            let creator_vaults = vector::singleton(vault_id);
            table::add(&mut registry.all_vaults, creator_addr, creator_vaults);
        };

        // Update creator's profile
        if (exists<UserProfile>(creator_addr)) {
            let creator_profile = borrow_global_mut<UserProfile>(creator_addr);
            vector::push_back(&mut creator_profile.created_vaults, vault_id);
        };

        // Move vault to creator's account with unique resource address
        move_to(creator, vault);
    }

    // Deposit funds into a vault
    public entry fun deposit_to_vault(
        user: &signer,
        vault_owner: address,
        amount: u64,
    ) acquires Vault {
        let user_addr = signer::address_of(user);
        
        // Check if user has sufficient balance
        let user_balance = coin::balance<AptosCoin>(user_addr);
        assert!(user_balance >= amount, EINSUFFICIENT_BALANCE);

        // Check if vault exists
        assert!(exists<Vault>(vault_owner), EVAULT_NOT_FOUND);
        
        let vault = borrow_global_mut<Vault>(vault_owner);
        
        // Verify user is a member or creator of the vault
        let is_member = vault.creator == user_addr || is_vault_member(user_addr, &vault.members);
        assert!(is_member, ENOT_VAULT_MEMBER);

        // Withdraw from user and deposit to vault
        let coins = coin::withdraw<AptosCoin>(user, amount);
        coin::merge(&mut vault.balance, coins);
    }

    // Create a pending transaction (withdrawal request)
    public entry fun create_transaction(
        user: &signer,
        vault_owner: address,
        to: address,
        amount: u64,
        description: String,
    ) acquires Vault {
        let user_addr = signer::address_of(user);
        
        assert!(exists<Vault>(vault_owner), EVAULT_NOT_FOUND);
        let vault = borrow_global_mut<Vault>(vault_owner);
        
        // Verify user is a member or creator of the vault
        let is_member = vault.creator == user_addr || is_vault_member(user_addr, &vault.members);
        assert!(is_member, ENOT_VAULT_MEMBER);

        // Check if vault has sufficient balance
        let vault_balance = coin::value(&vault.balance);
        assert!(vault_balance >= amount, EINSUFFICIENT_BALANCE);

        // Create pending transaction
        let transaction_id = vault.transaction_counter;
        vault.transaction_counter = vault.transaction_counter + 1;

        let pending_tx = PendingTransaction {
            id: transaction_id,
            to,
            amount,
            description,
            signatures: vector::singleton(user_addr), // Creator automatically signs
            created_by: user_addr,
            created_at: timestamp::now_seconds(),
            executed: false,
        };

        vector::push_back(&mut vault.pending_transactions, pending_tx);
    }

    // Sign a pending transaction
    public entry fun sign_transaction(
        user: &signer,
        vault_owner: address,
        transaction_id: u64,
    ) acquires Vault {
        let user_addr = signer::address_of(user);
        
        assert!(exists<Vault>(vault_owner), EVAULT_NOT_FOUND);
        let vault = borrow_global_mut<Vault>(vault_owner);
        
        // Verify user is a member or creator of the vault
        let is_member = vault.creator == user_addr || is_vault_member(user_addr, &vault.members);
        assert!(is_member, ENOT_VAULT_MEMBER);

        // Find the transaction
        let tx_index = find_transaction_index(&vault.pending_transactions, transaction_id);
        assert!(tx_index < vector::length(&vault.pending_transactions), ETRANSACTION_NOT_FOUND);
        
        let transaction = vector::borrow_mut(&mut vault.pending_transactions, tx_index);
        assert!(!transaction.executed, ETRANSACTION_NOT_FOUND);

        // Check if user already signed
        assert!(!vector::contains(&transaction.signatures, &user_addr), EALREADY_SIGNED);

        // Add signature
        vector::push_back(&mut transaction.signatures, user_addr);

        // Check if we have enough signatures to execute
        let signature_count = vector::length(&transaction.signatures);
        if (signature_count >= vault.required_signatures) {
            execute_transaction(vault, tx_index);
        };
    }

    // Execute a transaction (internal function)
    fun execute_transaction(vault: &mut Vault, tx_index: u64) {
        let transaction = vector::borrow_mut(&mut vault.pending_transactions, tx_index);
        
        // Extract coins from vault
        let coins = coin::extract(&mut vault.balance, transaction.amount);
        
        // Deposit to recipient
        coin::deposit(transaction.to, coins);
        
        // Mark as executed
        transaction.executed = true;
    }

    // Helper function to check if an address is a vault member
    fun is_vault_member(addr: address, members: &vector<VaultMember>): bool {
        let len = vector::length(members);
        let i = 0;
        while (i < len) {
            let member = vector::borrow(members, i);
            if (member.address == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    // Helper function to find transaction index
    fun find_transaction_index(transactions: &vector<PendingTransaction>, transaction_id: u64): u64 {
        let len = vector::length(transactions);
        let i = 0;
        while (i < len) {
            let tx = vector::borrow(transactions, i);
            if (tx.id == transaction_id) {
                return i
            };
            i = i + 1;
        };
        len // Return length if not found (invalid index)
    }

    // View functions

    #[view]
    public fun get_vault_info(vault_owner: address): (u64, String, address, u64, u64, u64, u64) acquires Vault {
        assert!(exists<Vault>(vault_owner), EVAULT_NOT_FOUND);
        let vault = borrow_global<Vault>(vault_owner);
        (
            vault.id,
            vault.name,
            vault.creator,
            vector::length(&vault.members),
            vault.required_signatures,
            coin::value(&vault.balance),
            vault.created_at
        )
    }

    #[view]
    public fun get_vault_members(vault_owner: address): vector<VaultMember> acquires Vault {
        assert!(exists<Vault>(vault_owner), EVAULT_NOT_FOUND);
        let vault = borrow_global<Vault>(vault_owner);
        vault.members
    }

    #[view]
    public fun get_pending_transactions(vault_owner: address): vector<PendingTransaction> acquires Vault {
        assert!(exists<Vault>(vault_owner), EVAULT_NOT_FOUND);
        let vault = borrow_global<Vault>(vault_owner);
        vault.pending_transactions
    }

    #[view]
    public fun get_user_profile(user_addr: address): (String, String, vector<u64>, vector<u64>) acquires UserProfile {
        assert!(exists<UserProfile>(user_addr), 2001);
        let profile = borrow_global<UserProfile>(user_addr);
        (
            profile.name,
            profile.email,
            profile.created_vaults,
            profile.member_of_vaults
        )
    }

    #[view]
    public fun get_vault_balance(vault_owner: address): u64 acquires Vault {
        assert!(exists<Vault>(vault_owner), EVAULT_NOT_FOUND);
        let vault = borrow_global<Vault>(vault_owner);
        coin::value(&vault.balance)
    }

    #[view]
    public fun get_next_vault_id(): u64 acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), 1000);
        let registry = borrow_global<VaultRegistry>(@meena_add);
        registry.vault_counter
    }

    #[view]
    public fun get_user_created_vaults(user_addr: address): vector<u64> acquires VaultRegistry {
        if (!exists<VaultRegistry>(@meena_add)) {
            return vector::empty<u64>()
        };
        
        let registry = borrow_global<VaultRegistry>(@meena_add);
        if (table::contains(&registry.all_vaults, user_addr)) {
            *table::borrow(&registry.all_vaults, user_addr)
        } else {
            vector::empty<u64>()
        }
    }

    #[view]
    public fun is_user_vault_member(user_addr: address, vault_owner: address): bool acquires Vault {
        if (!exists<Vault>(vault_owner)) {
            return false
        };
        
        let vault = borrow_global<Vault>(vault_owner);
        vault.creator == user_addr || is_vault_member(user_addr, &vault.members)
    }

    #[view]
    public fun get_all_vault_owners(): vector<address> acquires VaultRegistry {
        if (!exists<VaultRegistry>(@meena_add)) {
            return vector::empty<address>()
        };
        
        let registry = borrow_global<VaultRegistry>(@meena_add);
        let vault_owners = vector::empty<address>();
        let i = 0;
        while (i < registry.vault_counter) {
            if (table::contains(&registry.vault_owners, i)) {
                let owner = *table::borrow(&registry.vault_owners, i);
                vector::push_back(&mut vault_owners, owner);
            };
            i = i + 1;
        };
        vault_owners
    }
}