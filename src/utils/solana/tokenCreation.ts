import { Connection, PublicKey, Keypair, Transaction, SystemProgram, 
  TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    TOKEN_2022_PROGRAM_ID,
    MINT_SIZE,
    getMinimumBalanceForRentExemptMint,
    getAssociatedTokenAddress,
    createMint,
    createAssociatedTokenAccountIdempotent
} from "@solana/spl-token";
import bs58 from 'bs58';
import { createCrossmintWallet, loadWalletFromEnv, walletSigner } from '../crossmint/walletCreation';
import * as nacl from 'tweetnacl';

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
                    transaction: serializedTransaction,
                    requiredSigners:
                        [mintWallet.publicKey.toString()] 
                    
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

/**
 * Generates approval signatures for a Crossmint transaction
 * @param pendingApprovals The list of pending approvals from the Crossmint API response
 * @param availableSigners Array of keypairs available for signing (typically wallet and mint keys)
 * @returns An array of approval objects with signer addresses and signatures
 */
export function generateTransactionApprovals(
    pendingApprovals: Array<{ message: string; signer: string }>,
    availableSigners: Keypair[]
): Array<{ signer: string; signature: string }> {
    // Map through each pending approval and generate the required signature
    return pendingApprovals.map((approval) => {
        // Find the keypair that matches the required signer
        const signer = availableSigners.find((keypair) => 
            approval.signer.includes(keypair.publicKey.toString())
        );
        
        // If no matching signer is found, throw an error
        if (!signer) {
            throw new Error(`No matching keypair found for required signer: ${approval.signer}`);
        }
        
        // Generate the signature by decoding the message, signing it, and encoding the result
        const signature = bs58.encode(
            nacl.sign.detached(
                bs58.decode(approval.message),
                signer.secretKey
            )
        );
        
        // Return the signer address and signature
        return {
            signer: approval.signer,
            signature: signature
        };
    });
}

/**
 * Approves a transaction that was sent to Crossmint
 * @param transactionId The ID of the transaction to approve
 * @param walletAddress The wallet address associated with the transaction
 * @param approvals Array of approval objects with signer addresses and signatures
 * @returns The response from the approval
 */
export async function approveTransaction(
    transactionId: string,
    walletAddress: string,
    approvals: Array<{ signer: string; signature: string }>
): Promise<any> {
    const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY;
    if (!CROSSMINT_API_KEY) {
        throw new Error('CROSSMINT_API_KEY not set in environment variables');
    }

    console.log("Sending approvals:", approvals);

    try {
        // Send approval to Crossmint
        const response = await fetch(
            `https://staging.crossmint.com/api/2022-06-09/wallets/${walletAddress}/transactions/${transactionId}/approvals`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': CROSSMINT_API_KEY
                },
                body: JSON.stringify({ approvals })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to approve transaction: ${response.statusText}. Details: ${errorText}`);
        }

        const data = await response.json();
        console.log('Transaction approved successfully');
        return data;
    } catch (error) {
        console.error('Error approving transaction:', error);
        throw error;
    }
}

export async function createTokenWith2022Program(): Promise<{
    transaction: string, 
    walletAddress: string,
    recipientTokenAccount: string
}> {
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

        // Create recipient token account
        const recipientAddress = new PublicKey('CeWAyjKYw2psEMfhyddXyeKJ2WiUcfbU5xbCNr2qzDiP');
        const recipientTokenAccount = await getAssociatedTokenAddress(
            mintWallet.publicKey,
            recipientAddress,
            true, // allowOwnerOffCurve
            TOKEN_2022_PROGRAM_ID
        );

        console.log('Recipient Token Account:', recipientTokenAccount.toString());

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
        
        // Create instruction to initialize the recipient's token account
        const createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
            smartWallet,  // payer
            recipientTokenAccount, // ata
            recipientAddress, // owner
            mintWallet.publicKey, // mint
            TOKEN_2022_PROGRAM_ID // program ID
        );
        
        // Use TransactionMessage and VersionedTransaction as shown in the example
        const message = new TransactionMessage({
            instructions: [
                createAccountInstruction,
                initMintInstruction,
                createTokenAccountInstruction // Added instruction to create token account
            ],
            recentBlockhash: blockhash,
            payerKey: smartWallet,
        }).compileToV0Message();
        
        // Create a VersionedTransaction
        const transaction = new VersionedTransaction(message);
        
        // Serialize the transaction
        const serializedTransaction = bs58.encode(transaction.serialize());

        console.log('\nPartially Signed Transaction (Base58):');
        console.log(serializedTransaction);
        console.log('\nKey Information:');
        console.log('Payer/Authority Address:', smartWallet.toString());
        console.log('Mint Address:', mintWallet.publicKey.toString());
        console.log('Recipient Token Account:', recipientTokenAccount.toString());

        return {
            transaction: serializedTransaction,
            walletAddress: smartWallet.toString(),
            recipientTokenAccount: recipientTokenAccount.toString()
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
} 