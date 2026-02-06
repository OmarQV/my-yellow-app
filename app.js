import { createAppSessionMessage, parseRPCResponse } from '@erc7824/nitrolite';

// Connect to Yellow Network (using sandbox for testing)
const ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');

ws.onopen = () => {
    console.log('✅ Connected to Yellow Network!');
};

ws.onmessage = (event) => {
    const message = parseRPCResponse(event.data);
    console.log('📨 Received:', message);
};

ws.onerror = (error) => {
    console.error('Connection error:', error);
};

console.log('Connecting to Yellow Network...');

// Set up message signer for your wallet
async function setupMessageSigner() {
    if (!window.ethereum) {
        throw new Error('Please install MetaMask');
    }

    // Request wallet connection
    const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
    });
    
    const userAddress = accounts[0];
    
    // Create message signer function
    const messageSigner = async (message) => {
        return await window.ethereum.request({
        method: 'personal_sign',
        params: [message, userAddress]
        });
    };

    console.log('✅ Wallet connected:', userAddress);
    return { userAddress, messageSigner };
}

async function createPaymentSession(messageSigner, userAddress, partnerAddress) {
    // Define your payment application
    const appDefinition = {
        protocol: 'payment-app-v1',
        participants: [userAddress, partnerAddress],
        weights: [50, 50], // Equal participation
        quorum: 100, // Both participants must agree
        challenge: 0,
        nonce: Date.now()
    };

    // Initial balances (1 USDC = 1,000,000 units with 6 decimals)
    const allocations = [
        { participant: userAddress, asset: 'usdc', amount: '800000' }, // 0.8 USDC
        { participant: partnerAddress, asset: 'usdc', amount: '200000' } // 0.2 USDC
    ];

    // Create signed session message
    const sessionMessage = await createAppSessionMessage(
        messageSigner,
        [{ definition: appDefinition, allocations }]
    );

    // Send to ClearNode
    ws.send(sessionMessage);
    console.log('✅ Payment session created!');
    
    return { appDefinition, allocations };
}

async function sendPayment(ws, messageSigner, amount, recipient) {
    // Create payment message
    const paymentData = {
        type: 'payment',
        amount: amount.toString(),
        recipient,
        timestamp: Date.now()
    };

    // Sign the payment
    const signature = await messageSigner(JSON.stringify(paymentData));
    
    const signedPayment = {
        ...paymentData,
        signature,
        sender: await getCurrentUserAddress()
    };

    // Send instantly through ClearNode
    ws.send(JSON.stringify(signedPayment));
    console.log('💸 Payment sent instantly!');
}

// Usage
await sendPayment(ws, messageSigner, 100000n, partnerAddress); // Send 0.1 USDC


// Enhanced message handling
ws.onmessage = (event) => {
    const message = parseRPCResponse(event.data);
    
    switch (message.type) {
        case 'session_created':
        console.log('✅ Session confirmed:', message.sessionId);
        break;
        
        case 'payment':
        console.log('💰 Payment received:', message.amount);
        // Update your app's UI
        updateBalance(message.amount, message.sender);
        break;
        
        case 'session_message':
        console.log('📨 App message:', message.data);
        handleAppMessage(message);
        break;
        
        case 'error':
        console.error('❌ Error:', message.error);
        break;
    }
};

function updateBalance(amount, sender) {
    console.log(`Received ${amount} from ${sender}`);
    // Update your application state
}