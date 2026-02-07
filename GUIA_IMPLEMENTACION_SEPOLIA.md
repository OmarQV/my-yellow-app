# Guía de Implementación: Migración a Sepolia (Real Tokens)

Esta guía detalla los cambios necesarios en tu código para pasar del modo "Sandbox Simulado" al modo "Sepolia Real", donde usarás tus tokens verdaderos.

## 1. Información Necesaria

Antes de tocar el código, necesitamos confirmar estas direcciones. Según lo investigado, Yellow utiliza direcciones deterministas (las mismas en varias redes), por lo que usaremos estas:

*   **Custody Contract (Donde se deposita):** `0x019B65A265EB3363822f2752141b3dF16131b262`
*   **Adjudicator Contract (Arbitro):** `0x7c7ccbc98469190849BCC6c926307794fDfB11F2`
*   **Token Address (USDC Mock):** *Pendiente de obtener por el usuario*. Se requiere la dirección del contrato ERC20 en Sepolia.

## 2. Pasos de Construcción

### Paso 1: Dependencias
Utilizaremos `viem`, que ya está instalada como dependencia de `@erc7824/nitrolite`, por lo que no requerimos instalaciones adicionales. Esto mantiene el proyecto ligero y consistente.

### Paso 2: Actualizar la Interfaz (index.html)
Necesitamos un botón para que el usuario pueda depositar fondos antes de intentar abrir el canal.

**Cambios en `index.html`:**
*   Agregar un botón `<button id="btn-deposit">Depositar 10 USDC</button>`
*   Agregar un indicador de estatus `<div>Estado: <span id="status">Desconectado</span></div>`

### Paso 3: Actualizar la Lógica (SimplePaymentApp.js)

Realizaremos modificaciones mayores en tu clase principal:

1.  **Importar `viem`**: Usaremos `createWalletClient`, `custom`, `parseAbi` y `sepolia`.
2.  **Definir Constantes**: Guardar las direcciones de los contratos.
3.  **Agregar Función `deposit()`**:
    *   **Approve**: Pedir permiso al contrato del Token para gastar tu dinero usando `writeContract` de viem.
    *   **Deposit**: Llamar a la función `deposit` del contrato Custody usando `writeContract` de viem.
4.  **Actualizar `createSession()`**:
    *   Cambiar `'usdc'` (string simple) por la variable `TOKEN_ADDRESS` (dirección real).
    *   Asegurarse de que los montos coincidan con lo depositado.

## 3. Código de Referencia

Aquí tienes un adelanto de cómo se verán las nuevas funciones On-Chain usando `viem`:

```javascript
import { createWalletClient, custom, parseAbi } from 'viem';
import { sepolia } from 'viem/chains';

// ... dentro de tu clase ...

async depositFunds(amount) {
    const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum)
    });
    const [address] = await walletClient.getAddresses();

    // 1. Aprobar
    await walletClient.writeContract({
        address: TOKEN_ADDRESS,
        abi: parseAbi(['function approve(address spender, uint256 amount) returns (bool)']),
        functionName: 'approve',
        args: [CUSTODY_ADDRESS, amount],
        account: address
    });

    // 2. Depositar
    await walletClient.writeContract({
        address: CUSTODY_ADDRESS,
        abi: parseAbi(['function deposit(address account, address token, uint256 amount) payable']),
        functionName: 'deposit',
        args: [address, TOKEN_ADDRESS, amount],
        account: address
    });
}
```

## ¿Listo para empezar?
Si estás de acuerdo con este plan, dame la orden y empezaré a aplicar los cambios paso a paso.
