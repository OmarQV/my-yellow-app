import { createAppSessionMessage, parseAnyRPCResponse } from '@erc7824/nitrolite';
import { createWalletClient, createPublicClient, http, custom, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';

// --- CONFIGURACIÓN SEPOLIA ---
const CUSTODY_CONTRACT = '0x019B65A265EB3363822f2752141b3dF16131b262'; // Custody Yellow Sepolia
const TOKEN_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // <--- Sepolia USDC (Faucet oficial). CAMBIA ESTO si usas otro token.

class SimplePaymentApp {
    constructor() {
        this.ws = null;
        this.messageSigner = null;
        this.userAddress = null;
        this.sessionId = null;
        this.walletClient = null;
        
        // Setup UI
        this.statusElement = document.getElementById('status');
        document.getElementById('btn-deposit').addEventListener('click', () => this.depositFunds(1000000n)); // 1 USDC
        
        const btnChannel = document.getElementById('btn-channel');
        if (btnChannel) {
            btnChannel.addEventListener('click', () => {
                const partner = prompt('Ingresa dirección del partner (tu otra cuenta o amigo):', '0xD1601c886D80f8865C2a85B7Feeb03246646B156');
                if(partner) this.createSession(partner);
            });
        }

        const btnWithdraw = document.getElementById('btn-withdraw');
        if (btnWithdraw) {
            btnWithdraw.addEventListener('click', () => {
                if(confirm('¿Quieres retirar 10 USDC del contrato?')) {
                    this.withdrawFunds(10000000n);
                }
            });
        }
    }

    async init() {
        // Step 1: Set up wallet
        const { userAddress, messageSigner, walletClient } = await this.setupWallet();
        this.userAddress = userAddress;
        this.messageSigner = messageSigner;
        this.walletClient = walletClient;

        this.statusElement.textContent = `Conectado: ${userAddress.slice(0,6)}...`;
        
        // Step 2: Connect to ClearNode (sandbox for testing)
        this.ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');
        
        this.ws.onopen = () => {
        console.log('🟢 Connected to Yellow Network!');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = parseAnyRPCResponse(event.data);
                // Map 'method' to 'type' for compatibility
                message.type = message.method;
                console.log('📨 Received:', message);
                this.handleMessage(message);
            } catch (err) {
                console.warn('Could not parse message:', event.data, err);
            }
        };
        
        return userAddress;
    }

    async setupWallet() {
        const walletClient = createWalletClient({
            chain: sepolia,
            transport: custom(window.ethereum)
        });

        // Request accounts
        const [userAddress] = await walletClient.requestAddresses();
        
        const messageSigner = async (message) => {
            const msgParams = typeof message === 'string' ? message : JSON.stringify(message);
            return await walletClient.signMessage({ 
                account: userAddress,
                message: msgParams 
            });
        };

        return { userAddress, messageSigner, walletClient };
    }

    async depositFunds(amount) {
        if (!this.walletClient) return alert('Conecta tu wallet primero');
        
        // Crear cliente público para esperar confirmaciones
        const publicClient = createPublicClient({ 
            chain: sepolia,
            transport: http()
        });

        try {
            console.log('⏳ Iniciando aprobación On-Chain...');
            this.statusElement.textContent = '⏳ Acepta la transacción de Aprobación...';

            // 1. Verificar si ya tenemos Aprobación (Para ahorrar Gas)
            console.log('⏳ Verificando allowance actual...');
            let allowance = 0n;
            try {
                allowance = await publicClient.readContract({
                    address: TOKEN_ADDRESS,
                    abi: parseAbi(['function allowance(address owner, address spender) view returns (uint256)']),
                    functionName: 'allowance',
                    args: [this.userAddress, CUSTODY_CONTRACT]
                });
            } catch (allowanceError) {
                console.warn('⚠️ No se pudo leer el allowance. Posiblemente la dirección del token es incorrecta o no es un contrato.', allowanceError);
                // Si falla, asumimos que es 0 y dejamos que el intento de aprobación falle o funcione para dar mejor feedback
                allowance = 0n;
            }

            if (allowance < amount) {
                console.log(`⚠️ Allowance insuficiente (${allowance}), solicitando aprobación...`);
                this.statusElement.textContent = '⏳ Acepta la transacción de Aprobación...';

                const approveHash = await this.walletClient.writeContract({
                    address: TOKEN_ADDRESS,
                    abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
                    functionName: 'approve',
                    args: [CUSTODY_CONTRACT, amount],
                    account: this.userAddress
                });
                console.log('✅ Tx Aprobar enviada:', approveHash);
                this.statusElement.textContent = '⏳ Esperando confirmación en bloque (Approve)...';
                
                await publicClient.waitForTransactionReceipt({ hash: approveHash });
                console.log('✅ Aprobación confirmada en bloque');
            } else {
                console.log('✅ Ya tienes aprobación suficiente. Saltando paso 1.');
            }

            // 2. Depositar
            console.log('⏳ Iniciando depósito On-Chain...');
            this.statusElement.textContent = '⏳ Acepta la transacción de Depósito...';

            const depositHash = await this.walletClient.writeContract({
                address: CUSTODY_CONTRACT,
                abi: parseAbi(['function deposit(address account, address token, uint256 amount) payable']),
                functionName: 'deposit',
                args: [this.userAddress, TOKEN_ADDRESS, amount],
                account: this.userAddress
            });
            console.log('✅ Tx Depósito enviada:', depositHash);
            this.statusElement.textContent = '⏳ Esperando confirmación de Depósito...';
            
            await publicClient.waitForTransactionReceipt({ hash: depositHash });
            
            alert('¡Depósito COMPLETADO! Ya puedes abrir canales.');
            this.statusElement.textContent = '✅ Depósito Exitoso';
            
        } catch (err) {
            console.error('Error en depósito:', err);
            alert('Error al depositar: ' + err.message);
            this.statusElement.textContent = '❌ Error en depósito';
        }
    }

    async ensureConnection() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
        
        console.log('🔄 Reconectando WebSocket...');
        this.statusElement.textContent = '🔄 Reconectando WebSocket...';
        
        this.ws = new WebSocket('wss://clearnet-sandbox.yellow.com/ws');
        
        return new Promise((resolve, reject) => {
            this.ws.onopen = () => {
                console.log('🟢 Reconnected to Yellow Network!');
                this.statusElement.textContent = `Conectado: ${this.userAddress.slice(0,6)}...`;
                resolve();
            };
            this.ws.onerror = (err) => {
                 console.error('WebSocket Error:', err);
                 // Don't reject immediately to allow retries or timeout, 
                 // but for now let's just log. 
                 // If it fails to open, the promise might hang, so maybe a timeout is good.
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = parseAnyRPCResponse(event.data);
                    // Map 'method' to 'type' for compatibility
                    message.type = message.method;
                    console.log('📨 Received:', message);
                    this.handleMessage(message);
                } catch (err) {
                    console.warn('Could not parse message:', event.data, err);
                }
            };
        });
    }

    async withdrawFunds(amount) {
        if (!this.walletClient) return alert('Conecta tu wallet primero');

        try {
            console.log('⏳ Iniciando retiro On-Chain (Withdraw)...');
            this.statusElement.textContent = '⏳ Acepta la transacción de Retiro...';

            const withdrawHash = await this.walletClient.writeContract({
                address: CUSTODY_CONTRACT,
                // Función de retiro CORREGIDA: withdraw(address token, uint256 amount)
                abi: parseAbi(['function withdraw(address token, uint256 amount)']),
                functionName: 'withdraw',
                args: [TOKEN_ADDRESS, amount],
                account: this.userAddress
            });

            console.log('✅ Tx Retiro enviada:', withdrawHash);
            this.statusElement.textContent = '⏳ Esperando confirmación de Retiro...';
            
            // Crear cliente para esperar confirmación
            const publicClient = createPublicClient({ chain: sepolia, transport: http() });
            await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

            alert('¡Retiro exitoso! Revisa tu MetaMask.');
            this.statusElement.textContent = '✅ Retiro Exitoso';

        } catch (err) {
            console.error('Error en retiro:', err);
            alert('Error al retirar: ' + err.message);
        }
    }

    async createSession(partnerAddress) {
        console.log('⏳ Creando sesión de canal...');
        
        // Verificar conexión del WebSocket antes de enviar
        await this.ensureConnection();

        const appDefinition = {
            protocol: 'payment-app-v1',
            participants: [this.userAddress, partnerAddress],
            weights: [50, 50],
            quorum: 100,
            challenge: 0,
            nonce: Date.now()
        };

        // CONFIGURACIÓN DE APERTURA: 1.0 USDC (6 decimales = 1000000)
        // Esto usa los fondos que YA depositaste en el contrato.
        const amountToLock = '1000000'; 
        console.log(`🔒 Bloqueando ${amountToLock} unidades (1 USDC) en el canal...`);

        const allocations = [
            { participant: this.userAddress, asset: TOKEN_ADDRESS, amount: amountToLock }, 
            { participant: partnerAddress, asset: TOKEN_ADDRESS, amount: '0' }
        ];

        try {
            const sessionMessage = await createAppSessionMessage(
                this.messageSigner,
                [{ definition: appDefinition, allocations }]
            );

            this.ws.send(sessionMessage);
            console.log('📨 Solicitud de sesión enviada. Esperando respuesta del servidor...');
        } catch (error) {
            console.error('❌ Error al firmar o crear mensaje de sesión:', error);
            alert('Error creando sesión: ' + error.message);
        }
    }

    async sendPayment(amount, recipient) {
        const paymentData = {
        type: 'payment',
        amount: amount.toString(),
        recipient,
        timestamp: Date.now()
    };

    const signature = await this.messageSigner(JSON.stringify(paymentData));
    
    this.ws.send(JSON.stringify({
        ...paymentData,
        signature,
        sender: this.userAddress
    }));
    
    console.log(`💸 Sent ${amount} instantly!`);
    }

    handleMessage(message) {
        switch (message.type) {
        case 'session_created':
            this.sessionId = message.sessionId;
            console.log('✅ Session ready:', this.sessionId);
            break;
        case 'payment':
            console.log('💰 Payment received:', message.amount);
            break;
        }
    }
}

// Usage
const app = new SimplePaymentApp();
// Asegúrate de cambiar esta dirección por la de tu compañero o tu segunda cuenta
const partnerAddress = '0xD1601c886D80f8865C2a85B7Feeb03246646B156'; 

await app.init();
// Comentado para que no se ejecute automáticamente, primero debes depositar
// await app.createSession(partnerAddress);
// await app.sendPayment('100000', partnerAddress); // Send 0.1 USDC