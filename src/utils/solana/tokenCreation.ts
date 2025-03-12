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
import fs from 'fs';

// Types
interface KeyData {
    pubkey: string;
    privkey: string;
}

// Use devnet for testing
export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Function to create and save keypair
export function createAndSaveKeypair(name: string): Keypair {
    const keypair = Keypair.generate();
    const keyData: KeyData = {
        pubkey: keypair.publicKey.toString(),
        privkey: bs58.encode(keypair.secretKey)
    };
    
    if (!fs.existsSync('./keys')) {
        fs.mkdirSync('./keys');
    }
    
    fs.writeFileSync(`./keys/${name}.json`, JSON.stringify(keyData, null, 2));
    return keypair;
}

// Function to load existing keypair
export function loadKeypair(name: string): Keypair {
    try {
        const keyData: KeyData = JSON.parse(fs.readFileSync(`./keys/${name}.json`, 'utf-8'));
        return Keypair.fromSecretKey(bs58.decode(keyData.privkey));
    } catch (error) {
        console.log(`No existing keypair found for ${name}, generating new one...`);
        return createAndSaveKeypair(name);
    }
}

// Create directory for keys if it doesn't exist
if (!fs.existsSync('./keys')) {
    fs.mkdirSync('./keys');
}

// Load wallet public key
export const crossMintPayer = new PublicKey('Csowvp2cvhN6VCVgn6eks1Y1EevQ5aAfUuQs7mtdx1La');
export const mintKeypair = new PublicKey('5BUhqfUT3JcL2iZ5PSMA3E1EDU6uxmgYAAumQkmRX91z');

// these CrossMintPayer needs to be a Solana SW wallet considering this will be paying for the fees and account creation

export async function createTokenWith2022Program(): Promise<string> {
    try {
        console.log('Creating token using Solana Token Program 2022');
        
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
        transaction.feePayer = mintKeypair; // this needs to be the crossMintPayer

        // Serialize the transaction
        const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
        const base58Transaction = bs58.encode(serializedTransaction);

        // now the serialized transdacion is created and you nedd to call our endpoint to create the transaction https://docs.crossmint.com/api-reference/wallets/create-transaction?playground=open
        // once you receive the message you need to sign it with your admin signer logic
        //the result of this needs to be sent to https://docs.crossmint.com/api-reference/wallets/approve-transaction?playground=open

        console.log('\nPartially Signed Transaction (Base58):');
        console.log(base58Transaction);
        console.log('\nPlease sign this transaction with your wallet');
        console.log('\nKey Information:');
        console.log('Payer/Authority Address:', crossMintPayer.toString());
        console.log('Mint Address:', mintKeypair.toString());

        return base58Transaction;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
} 