module meena_add::multisig {
    use std::string::String;
    use std::vector;
    use std::signer;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_std::table::{Self, Table};

    // ================================ STRUCTS ================================

    /// Main vault registry that stores all vault information
    struct VaultRegistry has key {
        vault_counter: u64,
        vaults: Table<address, VaultInfo>,  // owner_address -> VaultInfo
        user_vaults: Table<address, vector<address>>, // user_address -> vector of vault owner addresses
        vault_owners: vector<address>, // keep track of all vault owners
    }

    /// Information about a single vault
    struct VaultInfo has store {
        id: u64,
        name: String,
        owner: address,
        members: vector<address>,
        member_names: vector<String>,
        signatures_required: u8,
        balance: u64,
        created_at: u64,
    }

    // ================================ ERRORS ================================

    const E_REGISTRY_NOT_INITIALIZED: u64 = 1;
    const E_VAULT_NOT_FOUND: u64 = 2;
    const E_NOT_VAULT_MEMBER: u64 = 3;
    const E_INVALID_SIGNATURES_REQUIRED: u64 = 4;
    const E_VAULT_ALREADY_EXISTS: u64 = 5;
    const E_EMPTY_VAULT_NAME: u64 = 6;
    const E_NO_MEMBERS: u64 = 7;

    // ================================ INITIALIZATION ================================

    /// Initialize the vault registry (only called once by deployer)
    public entry fun initialize_vault_registry(deployer: &signer) {
        let deployer_address = signer::address_of(deployer);
        
        if (!exists<VaultRegistry>(deployer_address)) {
            move_to(deployer, VaultRegistry {
                vault_counter: 0,
                vaults: table::new(),
                user_vaults: table::new(),
                vault_owners: vector::empty<address>(),
            });
        };
    }

    // ================================ VAULT CREATION ================================

    /// Create a new vault
    public entry fun create_vault(
        creator: &signer,
        vault_name: String,
        member_addresses: vector<address>,
        member_names: vector<String>,
        signatures_required: u8
    ) acquires VaultRegistry {
        let creator_address = signer::address_of(creator);
        
    // Validate only minimal requirements
    assert!(!std::string::is_empty(&vault_name), E_EMPTY_VAULT_NAME);
    assert!(!vector::is_empty(&member_addresses), E_NO_MEMBERS);
    assert!(signatures_required > 0 && (signatures_required as u64) <= vector::length(&member_addresses), E_INVALID_SIGNATURES_REQUIRED);
    assert!(vector::length(&member_addresses) == vector::length(&member_names), E_INVALID_SIGNATURES_REQUIRED);
    // No address validation: any address is accepted as a member

        // Get registry
        let registry = borrow_global_mut<VaultRegistry>(@meena_add);
        
        // Check if vault already exists for this creator
        assert!(!table::contains(&registry.vaults, creator_address), E_VAULT_ALREADY_EXISTS);

        // Create vault info
        let vault_id = registry.vault_counter + 1;
        let vault_info = VaultInfo {
            id: vault_id,
            name: vault_name,
            owner: creator_address,
            members: member_addresses,
            member_names,
            signatures_required,
            balance: 0,
            created_at: aptos_framework::timestamp::now_seconds(),
        };

        // Store vault
        table::add(&mut registry.vaults, creator_address, vault_info);
        registry.vault_counter = vault_id;

        // Add creator to vault_owners if not already present
        let found = false;
        let len = vector::length(&registry.vault_owners);
        let i = 0;
        while (i < len) {
            if (*vector::borrow(&registry.vault_owners, i) == creator_address) {
                found = true;
                break;
            };
            i = i + 1;
        };
        if (!found) {
            vector::push_back(&mut registry.vault_owners, creator_address);
        };

        // Add vault to each member's vault list
        let i = 0;
        let members_len = vector::length(&member_addresses);
        while (i < members_len) {
            let member = *vector::borrow(&member_addresses, i);
            if (!table::contains(&registry.user_vaults, member)) {
                table::add(&mut registry.user_vaults, member, vector::empty<address>());
            };
            let member_vaults = table::borrow_mut(&mut registry.user_vaults, member);
            vector::push_back(member_vaults, creator_address);
            i = i + 1;
        };
    }

    // ================================ VIEW FUNCTIONS ================================

    /// Get all vault owners (returns addresses of vault creators)
    #[view]
    public fun get_all_vault_owners(): vector<address> acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), E_REGISTRY_NOT_INITIALIZED);
        let registry = borrow_global<VaultRegistry>(@meena_add);
        registry.vault_owners
    }

    /// Check if user is a member of a specific vault
    #[view]
    public fun is_user_vault_member(user_address: address, vault_owner: address): bool acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), E_REGISTRY_NOT_INITIALIZED);
        
        let registry = borrow_global<VaultRegistry>(@meena_add);
        
        if (!table::contains(&registry.vaults, vault_owner)) {
            return false
        };
        
        let vault_info = table::borrow(&registry.vaults, vault_owner);
        vector::contains(&vault_info.members, &user_address)
    }

    /// Get vault information
    #[view]
    public fun get_vault_info(vault_owner: address): (u64, String, address, u8, u64, u64) acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), E_REGISTRY_NOT_INITIALIZED);
        
        let registry = borrow_global<VaultRegistry>(@meena_add);
        assert!(table::contains(&registry.vaults, vault_owner), E_VAULT_NOT_FOUND);
        
        let vault_info = table::borrow(&registry.vaults, vault_owner);
        (
            vault_info.id,
            vault_info.name,
            vault_info.owner,
            vault_info.signatures_required,
            vault_info.balance,
            vault_info.created_at
        )
    }

    /// Get vault members and their names
    #[view]
    public fun get_vault_members(vault_owner: address): (vector<address>, vector<String>) acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), E_REGISTRY_NOT_INITIALIZED);
        
        let registry = borrow_global<VaultRegistry>(@meena_add);
        assert!(table::contains(&registry.vaults, vault_owner), E_VAULT_NOT_FOUND);
        
        let vault_info = table::borrow(&registry.vaults, vault_owner);
        (vault_info.members, vault_info.member_names)
    }

    /// Get all vaults where user is a member
    #[view]
    public fun get_user_vaults(user_address: address): vector<address> acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), E_REGISTRY_NOT_INITIALIZED);
        
        let registry = borrow_global<VaultRegistry>(@meena_add);
        
        if (!table::contains(&registry.user_vaults, user_address)) {
            return vector::empty<address>()
        };
        
        *table::borrow(&registry.user_vaults, user_address)
    }

    // ================================ DEPOSIT FUNCTIONS ================================

    /// Deposit APT to vault
    public entry fun deposit_to_vault(
        depositor: &signer,
        vault_owner: address,
        amount: u64
    ) acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), E_REGISTRY_NOT_INITIALIZED);
        
        let registry = borrow_global_mut<VaultRegistry>(@meena_add);
        assert!(table::contains(&registry.vaults, vault_owner), E_VAULT_NOT_FOUND);
        
        let depositor_address = signer::address_of(depositor);
        
        // Check if depositor is a vault member
        let vault_info = table::borrow(&registry.vaults, vault_owner);
        assert!(vector::contains(&vault_info.members, &depositor_address), E_NOT_VAULT_MEMBER);
        
        // Transfer coins from depositor to vault owner
        coin::transfer<AptosCoin>(depositor, vault_owner, amount);
        
        // Update vault balance
        let vault_info_mut = table::borrow_mut(&mut registry.vaults, vault_owner);
        vault_info_mut.balance = vault_info_mut.balance + amount;
    }

    /// Get vault balance
    #[view]
    public fun get_vault_balance(vault_owner: address): u64 acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), E_REGISTRY_NOT_INITIALIZED);
        
        let registry = borrow_global<VaultRegistry>(@meena_add);
        assert!(table::contains(&registry.vaults, vault_owner), E_VAULT_NOT_FOUND);
        
        let vault_info = table::borrow(&registry.vaults, vault_owner);
        vault_info.balance
    }

    // ================================ HELPER FUNCTIONS ================================

    /// Check if registry is initialized
    #[view]
    public fun is_registry_initialized(): bool {
        exists<VaultRegistry>(@meena_add)
    }

    /// Get total number of vaults
    #[view]
    public fun get_vault_count(): u64 acquires VaultRegistry {
        assert!(exists<VaultRegistry>(@meena_add), E_REGISTRY_NOT_INITIALIZED);
        
        let registry = borrow_global<VaultRegistry>(@meena_add);
        registry.vault_counter
    }
}
