import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Crossmint API configuration
const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY || "YOUR_API_KEY";
const WALLET_TYPE = "solana-smart-wallet"; // For Solana-based wallets
export const signer=loadWalletFromEnv();
export const ADMIN_SIGNER = {
    type: "solana-keypair",
    address: signer.publicKey.toString(),
};

// Interface representing the Crossmint wallet response
export interface CrossmintWalletResponse {
    type: string;
    config: {
        adminSigner: {
            type: string;
            address: string;
            locator: string;
        }
    };
    address: string;
    createdAt: string;
    id?: string; // May be included in some responses
    chain?: string; // May be included in some responses
    status?: string; // May be included in some responses
}

/**
 * Loads a wallet from the WALLET_SECRET_KEY environment variable
 * @returns A Solana Keypair
 * @throws Error if the wallet cannot be loaded
 */
export function loadWalletFromEnv(): Keypair {
    const secretKey = process.env.WALLET_SECRET_KEY;
    if (!secretKey || secretKey === 'your_wallet_private_key_here') {
        throw new Error('WALLET_SECRET_KEY not set in environment variables');
    }

    try {
        const decodedKey = bs58.decode(secretKey);
        const wallet = Keypair.fromSecretKey(decodedKey);
        console.log(`Loaded wallet from private key: ${wallet.publicKey.toString()}`);
        return wallet;
    } catch (error) {
        throw new Error(`Failed to load wallet from private key: ${error}`);
    }
}

/**
 * Creates a Crossmint smart wallet for Solana
 * @returns The wallet response with address and details
 */
export async function createCrossmintWallet(): Promise<CrossmintWalletResponse> {
    try {
        const response = await fetch("https://staging.crossmint.com/api/2022-06-09/wallets", {
            method: "POST",
            headers: {
                "X-API-KEY": CROSSMINT_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: WALLET_TYPE,
                config: {
                    adminSigner: ADMIN_SIGNER,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to create wallet: ${response.statusText}`);
        }

        const wallet = await response.json();
        console.log("Successfully created Crossmint wallet:", wallet);
        return wallet;
    } catch (error) {
        console.error("Error creating Crossmint wallet:", error);
        throw error;
    }
}

/**
 * Retrieves an existing Crossmint wallet by ID
 * @param walletId The ID of the wallet to retrieve
 * @returns The wallet response with address and details
 */
export async function getCrossmintWallet(walletId: string): Promise<CrossmintWalletResponse> {
    try {
        const response = await fetch(`https://staging.crossmint.com/api/2022-06-09/wallets/${walletId}`, {
            method: "GET",
            headers: {
                "X-API-KEY": CROSSMINT_API_KEY,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to retrieve wallet: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error retrieving Crossmint wallet:", error);
        throw error;
    }
}

