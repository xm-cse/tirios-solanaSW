import { Connection, PublicKey, Keypair, Transaction, SystemProgram, 
  TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    TOKEN_2022_PROGRAM_ID,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddress,
    createMint
} from "@solana/spl-token";
import bs58 from 'bs58';
import { createCrossmintWallet, loadWalletFromEnv } from '../crossmint/walletCreation';

// Use specified network from environment variable or default to devnet
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'https://api.devnet.solana.com';
export const connection = new Connection(SOLANA_NETWORK, 'confirmed');

// Load wallet from environment variables

// Mint pubkey for the token - using the original address
export const mintWallet = Keypair.generate();

/**
 * Sends a transaction to Crossmint API for signing
 * @param walletAddress The address of the Crossmint wallet
 * @param serializedTransaction The base58 encoded transaction
 * @returns The response from the Crossmint API
 */
export async function sendTransactionToCrossmint(walletAddress: string, serializedTransaction: string): Promise<any> {
    const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY;
    if (!CROSSMINT_API_KEY) {
        throw new Error('CROSSMINT_API_KEY not set in environment variables');
    }

    try {
        console.log(`Sending transaction to Crossmint for wallet: ${walletAddress}`);
        const response = await fetch(`https://staging.crossmint.com/api/2022-06-09/wallets/${walletAddress}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': CROSSMINT_API_KEY
            },
            body: JSON.stringify({
                params: {
                    transaction: serializedTransaction
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to send transaction to Crossmint: ${response.statusText}. Details: ${errorText}`);
        }

        const data = await response.json();
        console.log('Transaction sent to Crossmint successfully');
        return data;
    } catch (error) {
        console.error('Error sending transaction to Crossmint:', error);
        throw error;
    }
}

export async function createTokenWith2022Program(): Promise<{transaction: string, walletAddress: string}> {
    try {
        console.log('Creating token using Solana Token Program 2022');

        // Create a Crossmint wallet
        const crossmintWalletResponse = await createCrossmintWallet();
        const smartWallet = new PublicKey(crossmintWalletResponse.address);
        
        console.log('Using Crossmint wallet:', smartWallet.toString());
        
        // Get the minimum lamports for rent exemption
        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        
        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        
        // Create instructions
        const createAccountInstruction = SystemProgram.createAccount({
            fromPubkey: smartWallet,
            newAccountPubkey: mintWallet.publicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_2022_PROGRAM_ID,
        });
        
        const initMintInstruction = createInitializeMintInstruction(
            mintWallet.publicKey,
            9,
            smartWallet,  // Using payer as mint authority
            smartWallet,  // Using payer as freeze authority
            TOKEN_2022_PROGRAM_ID
        );
        
        // Use TransactionMessage and VersionedTransaction as shown in the example
        const message = new TransactionMessage({
            instructions: [
                createAccountInstruction,
                initMintInstruction
            ],
            recentBlockhash: blockhash,
            payerKey: smartWallet,
        }).compileToV0Message();
        
        // Create a VersionedTransaction
        const transaction = new VersionedTransaction(message);
        
        // Sign the transaction with the mint keypair
        transaction.sign([mintWallet]);
        
        // Serialize the transaction
        const serializedTransaction = bs58.encode(transaction.serialize());

        console.log('\nPartially Signed Transaction (Base58):');
        console.log(serializedTransaction);
        console.log('\nKey Information:');
        console.log('Payer/Authority Address:', smartWallet.toString());
        console.log('Mint Address:', mintWallet.publicKey.toString());

        return {
            transaction: serializedTransaction,
            walletAddress: smartWallet.toString()
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
} 