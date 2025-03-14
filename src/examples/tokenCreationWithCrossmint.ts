#!/usr/bin/env ts-node
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file first
dotenvConfig();

import { 
    connection,
    createTokenWith2022Program,
    mintWallet,
    sendTransactionToCrossmint
} from '../utils/solana/tokenCreation';
import { walletSigner } from '../utils/crossmint/walletCreation';
import bs58 from 'bs58';
// @ts-ignore
import nacl from 'tweetnacl';

/**
 * Signs and approves a Crossmint transaction
 * @param transactionId The ID of the transaction to approve
 * @param walletAddress The address of the Crossmint wallet
 * @param message The message to sign
 * @returns The response from the approval
 */
async function approveTransaction(transactionId: string, walletAddress: string, message: string): Promise<any> {
    const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY;
    if (!CROSSMINT_API_KEY) {
        throw new Error('CROSSMINT_API_KEY not set in environment variables');
    }

    try {
        // Convert message to Uint8Array
        const messageBytes = bs58.decode(message);
        
        // Sign the message with our wallet signer
        const signature = bs58.encode(nacl.sign.detached(messageBytes, walletSigner.secretKey));
        console.log("Generated signature:", signature);
        
        // Send approval to Crossmint
        const response = await fetch(`https://staging.crossmint.com/api/2022-06-09/wallets/${walletAddress}/transactions/${transactionId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': CROSSMINT_API_KEY
            },
            body: JSON.stringify({
                signatures: [
                    {
                        address: walletSigner.publicKey.toString(),
                        signature: signature
                    }
                ]
            })
        });

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

/**
 * Standalone script demonstrating how to create a Solana token using a wallet
 */
async function main() {
    try {
        console.log('\x1b[36m%s\x1b[0m', '=== Solana Token Creation ===\n');
        
        // Step 1: Create the token
        console.log('\x1b[32m%s\x1b[0m', 'Step 1: Creating token transaction...');
        const { transaction, walletAddress } = await createTokenWith2022Program();
        
        // Step 2: Display transaction information
        console.log('\n\x1b[32m%s\x1b[0m', 'Step 2: Transaction ready');
        console.log('\x1b[36m%s\x1b[0m', 'Transaction created successfully!');
        console.log('Payer Wallet:', walletAddress);
        console.log('Token Mint Address:', mintWallet.publicKey.toString());
        
        // Step 3: Send transaction to Crossmint API
        console.log('\n\x1b[32m%s\x1b[0m', 'Step 3: Sending transaction to Crossmint API...');
        const crossmintResponse = await sendTransactionToCrossmint(walletAddress, transaction);
        console.log('\nCrossmint API Response:', JSON.stringify(crossmintResponse, null, 2));
        
        // Step 4: Approve the transaction if we have a pending message
        if (crossmintResponse && crossmintResponse.approvals && 
            crossmintResponse.approvals.pending && 
            crossmintResponse.approvals.pending.length > 0) {
            
            console.log('\n\x1b[32m%s\x1b[0m', 'Step 4: Approving transaction...');
            const pendingApproval = crossmintResponse.approvals.pending[0];
            const approvalResponse = await approveTransaction(
                crossmintResponse.id, 
                walletAddress, 
                pendingApproval.message
            );
            console.log('\nApproval Response:', JSON.stringify(approvalResponse, null, 2));
            
            console.log('\n\x1b[36m%s\x1b[0m', '=== Transaction Successfully Approved ===');
            console.log('The token has been created on the Solana blockchain!');
            console.log('Check the token on Solana Explorer:');
            console.log(`https://explorer.solana.com/address/${mintWallet.publicKey.toString()}?cluster=devnet`);
        } else {
            // Just show next steps if auto-approval didn't work
            console.log('\n\x1b[36m%s\x1b[0m', '=== Next Steps ===');
            console.log('1. Approve the transaction using the transaction ID from the response:');
            console.log(`POST https://staging.crossmint.com/api/2022-06-09/wallets/${walletAddress}/transactions/${crossmintResponse.id}/approve`);
            console.log('2. Check the token on Solana Explorer:');
            console.log(`https://explorer.solana.com/address/${mintWallet.publicKey.toString()}?cluster=devnet`);
        }
        
        console.log('\n\x1b[36m%s\x1b[0m', '=== Token Creation Summary ===');
        console.log('• The Crossmint wallet is the authority for the token');
        console.log('• The mintWallet is the permanent identity of your token');
        console.log('• Token has 9 decimals');
        console.log('• Transaction has been sent to Crossmint API');
        
    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Error in token creation process:');
        console.error(error);
        process.exit(1);
    }
}

// Run the script
main().then(() => {
    console.log('\n\x1b[32m%s\x1b[0m', 'Script completed successfully!');
    process.exit(0);
}); 