# Tirios Solana Token Creation

A Next.js application for creating and managing Solana tokens using the SPL Token Program 2022.

![Solana Logo](https://solana.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogotype.e4df684f.svg&w=256&q=75)

## Overview

This project provides a streamlined interface for creating custom tokens on the Solana blockchain. It leverages Solana's Token Program 2022 to create tokens with configurable properties such as decimals, supply, and authorities.

## Key Concepts

### Understanding the Keypairs

The application uses two distinct keypairs that serve different purposes:

#### crossMintPayer

This is the user's wallet that:
- Pays for all transaction fees
- Funds the creation of new accounts
- Has the authority to mint new tokens in the future
- Has the authority to freeze accounts if needed

**This is typically YOUR existing wallet that you use to interact with Solana.**

#### mintKeypair

This is a brand new, specially created account that:
- Becomes the permanent identity of your token
- Stores all the token's metadata (like decimals, supply, etc.)
- Acts as the permanent address for your token (this is what people will refer to when they talk about your token)

**This is NOT a wallet you would use - it's more like a dedicated database entry for your token.**

Think of it this way:
- **crossMintPayer** is like you, the business owner
- **mintKeypair** is like the business entity you're creating

You (crossMintPayer) pay to register your business (mintKeypair), and you maintain authority over that business, but the business itself has its own distinct identity and address.

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) with your browser

## Creating a Token

The application handles the complex process of token creation:

1. Generates the necessary keypairs
2. Creates the token mint account
3. Initializes the token with your specified parameters
4. Manages the transaction signing process
5. Broadcasts the transaction to the Solana network

## Key Features

- **Modern UI**: Built with Next.js and React for a responsive user experience
- **Secure Key Management**: Proper handling of keypairs with secure storage options
- **Solana Token Program 2022**: Support for the latest token standard with advanced features
- **Transaction Preparation**: Formats transactions for signing by external wallets

## Technical Details

The project uses:
- Next.js 15.2.2
- Solana Web3.js and SPL Token libraries
- TypeScript for type safety
- Tailwind CSS for styling

## Security Considerations

- Keep your wallet private keys secure
- The application never exposes private keys in the browser
- Consider using hardware wallets for additional security when managing high-value tokens

## License

[MIT](LICENSE)

## Contributions

Contributions are welcome! Please feel free to submit a Pull Request.
