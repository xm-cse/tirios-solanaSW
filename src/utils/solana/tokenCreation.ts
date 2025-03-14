import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
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
export const mintKeypair = new PublicKey('5BUhqfUT3JcL2iZ5PSMA3E1EDU6uxmgYAAumQkmRX91z');


export async function createTokenWith2022Program(): Promise<string> {
    try {
        console.log('Creating token using Solana Token Program 2022');

        const crossMintPayer = new PublicKey((await createCrossmintWallet()).address);
        console.log(crossMintPayer.toString());
        // Get the minimum lamports for rent exemption
        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        
        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        
        const transaction = new Transaction().add(
            // Create account instruction
            SystemProgram.createAccount({
                fromPubkey: crossMintPayer,
                newAccountPubkey: mintKeypair,
                space: MINT_SIZE,
                lamports,
                programId: TOKEN_2022_PROGRAM_ID,
            }),
            // Init mint instruction
            createInitializeMintInstruction(
                mintKeypair,
                9,
                crossMintPayer,  // Using payer as mint authority
                crossMintPayer,  // Using payer as freeze authority
                TOKEN_2022_PROGRAM_ID
            )
        );

        // Set recent blockhash and fee payer
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = crossMintPayer;

        // Serialize the transaction
        const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
        const base58Transaction = bs58.encode(serializedTransaction);

        console.log('\nPartially Signed Transaction (Base58):');
        console.log(base58Transaction);
        console.log('\nKey Information:');
        console.log('Payer/Authority Address:', crossMintPayer.toString());
        console.log('Mint Address:', mintKeypair.toString());

        return base58Transaction;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
} 