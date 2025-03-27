# Tirios Solana Token Creator

A standalone TypeScript script for creating Solana tokens using the SPL Token Program 2022 and Crossmint wallets.

## Overview

This project provides a command-line tool for creating custom tokens on the Solana blockchain. It leverages Solana's Token Program 2022 to create tokens with configurable properties such as decimals, supply, and authorities.

## Understanding Key Concepts

### The Two Key Components

In this token creation process, the two key components serve different purposes:

#### smartWallet

This is the user's wallet that:
- Pays for everything (covers transaction fees and funds new accounts)
- Has the authority to mint new tokens in the future
- Has the authority to freeze accounts if needed

**This can be created dynamically using the Crossmint API or loaded from a private key.**

#### mintWallet

This is a specially created account that:
- Becomes the permanent identity of your token
- Stores all the token's metadata (like decimals, supply, etc.)
- Acts as the permanent address for your token

**This is set to a fixed address in the code.**

Think of it this way:
- `smartWallet` is like you, the business owner
- `mintWallet` is like the business entity you're creating

### Token Accounts

In Solana, owners don't hold tokens directly in their wallet addresses. Instead, each wallet needs a separate token account for each type of token:

#### recipientTokenAccount

- A specialized account that can hold a specific token type (determined by the mint)
- Associated with a specific owner (wallet address)
- Created using the `getAssociatedTokenAddress` function
- Derived deterministically from the owner's address and the mint address
- The address where tokens are actually sent when "sending to a recipient"

Each recipient wallet needs its own token account for each type of token they want to hold. The script automatically:
1. Calculates the appropriate token account address for the recipient
2. Returns this address so tokens can be minted to it later

**Note:** Some recipient addresses may be Program Derived Addresses (PDAs) rather than standard ed25519 keypairs. The script handles this with the `allowOwnerOffCurve` flag to ensure token accounts can be created for these special types of addresses.

## Running the Script

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Either your own wallet private key OR a Crossmint API Key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   
   Create a `.env` file in the root directory with the following content:
   ```
   # Option 1: Use your own wallet (preferred)
   WALLET_SECRET_KEY=your_base58_encoded_private_key_here
   
   # Option 2: Use Crossmint API (only needed if not using your own wallet)
   CROSSMINT_API_KEY=your_crossmint_api_key_here

   # Solana network (devnet or mainnet-beta)
   SOLANA_NETWORK=https://api.devnet.solana.com
   ```
   
   **Important:** Replace `your_base58_encoded_private_key_here` with your actual wallet private key (base58 encoded). 
   If you don't want to use your own wallet, you can use a Crossmint wallet by providing a valid API key.

### Running the Script

After setting up your .env file, run the script with:
```bash
npm start
```

Alternatively, you can run the TypeScript file directly with ts-node:
```bash
npx ts-node src/examples/tokenCreationWithCrossmint.ts
```

## Wallet Loading Behavior

The script has two modes of operation:

1. **Private Key Mode (Recommended)**: If you provide a valid `WALLET_SECRET_KEY` in the .env file, the script will:
   - Load your wallet from the private key
   - Use it as the payer and authority for the token
   - Sign the transaction automatically
   - Allow you to broadcast the transaction directly

2. **Crossmint API Mode**: If no valid private key is provided, the script will:
   - Create a new Crossmint wallet
   - Use it as the payer and authority
   - Generate a transaction that needs to be signed via the Crossmint API

## Next Steps After Running the Script

After running the script, the next steps depend on which mode you used:

### If using your own wallet:

1. Send the signed transaction to the Solana network using the Solana CLI or web3.js
2. Check the token on Solana Explorer at the provided link

### If using Crossmint:

1. Send the transaction to Crossmint API for signing:
   ```
   POST https://staging.crossmint.com/api/2022-06-09/wallets/:wallet_id/transactions
   ```
   
2. Approve the transaction:
   ```
   POST https://staging.crossmint.com/api/2022-06-09/wallets/:wallet_id/transactions/:transaction_id/approve
   ```

## Technical Details

The project uses:
- TypeScript for type safety
- Solana Web3.js and SPL Token libraries for blockchain interactions
- bs58 for decoding private keys
- Crossmint API for wallet creation (optional)
- dotenv for environment variable management

## License

Private
