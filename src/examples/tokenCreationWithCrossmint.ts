#!/usr/bin/env ts-node
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file first
dotenvConfig();

import { 
    connection,
    createTokenWith2022Program,
    mintKeypair
} from '../utils/solana/tokenCreation';

/**
 * Standalone script demonstrating how to create a Solana token using a wallet
 */
async function main() {
    try {
        console.log('\x1b[36m%s\x1b[0m', '=== Solana Token Creation ===\n');
        
        // Step 1: Create the token
        console.log('\x1b[32m%s\x1b[0m', 'Step 1: Creating token transaction...');
        const serializedTransaction = await createTokenWith2022Program();
        
        // Step 2: Display transaction information
        console.log('\n\x1b[32m%s\x1b[0m', 'Step 2: Transaction ready');
        console.log('\x1b[36m%s\x1b[0m', 'Transaction created successfully!');
        console.log('Token Mint Address:', mintKeypair.toString());
        
        // Next steps
        console.log('\n\x1b[36m%s\x1b[0m', '=== Next Steps ===');
        console.log('1. Send the signed transaction to the Solana network:');
        console.log('   You can use the Solana CLI or web3.js to broadcast the transaction');
        console.log('2. Check the token on Solana Explorer:');
        console.log(`   https://explorer.solana.com/address/${mintKeypair.toString()}?cluster=devnet`);
        
        console.log('\n\x1b[36m%s\x1b[0m', '=== Token Creation Summary ===');
        console.log('• The payer wallet is the authority for the token');
        console.log('• The mintKeypair is the permanent identity of your token');
        console.log('• Token has 9 decimals');
        console.log('• Transaction is ready to be broadcast to the Solana network');
        
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