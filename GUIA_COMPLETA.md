# 📘 Guía Completa de Integración: Yellow Network Payment App

Esta guía documenta el estado actual del proyecto `yellow-app`, una aplicación de demostración para realizar pagos rápidos y económicos utilizando los **Canales de Estado** (State Channels) de Yellow Network sobre la red de prueba **Sepolia**.

---

## 🚀 1. Descripción del Proyecto

El objetivo es demostrar cómo mover activos (USDC) de la Blockchain (L1/L2) a un Canal de Estado (Off-Chain) para realizar transacciones instantáneas sin gas, y finalmente retirar los fondos de vuelta a la Blockchain.

### Funcionalidades Implementadas:
1.  **Conexión Web3**: Integración con MetaMask usando la librería `viem`.
2.  **Depósito On-Chain**: Bloqueo de fondos (USDC) en el contrato de Custodia de Yellow ("Deposit").
3.  **Apertura de Canal**: Creación de una sesión entre dos partes (Tú y un Partner) usando los fondos depositados.
4.  **Gestión de Conexión**: Manejo robusto de WebSocket con reconexión automática.
5.  **Retiro de Fondos**: Recuperación de fondos desde el contrato de Custodia hacia la wallet del usuario ("Withdraw").

---

## 🛠️ 2. Configuración Técnica

### Archivos Clave
*   **`index.html`**: La interfaz de usuario simple (botones y logs).
*   **`SimplePaymentApp.js`**: El cerebro de la aplicación. Contiene:
    *   Lógica Blockchain (`viem`): Approve, Deposit, Withdraw.
    *   Lógica Canales (`@erc7824/nitrolite`): Firmas off-chain, mensajería.
    *   Comunicación (`WebSocket`): Conexión con el nodo `clearnet-sandbox.yellow.com`.

### Contratos Utilizados (Sepolia)
| Contrato | Dirección | Descripción |
| :--- | :--- | :--- |
| **Custody** | `0x019B65A265EB3363822f2752141b3dF16131b262` | Contrato inteligente de Yellow donde se guardan los fondos. |
| **USDC (Test)** | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Token ERC-20 usado para las pruebas. |

---

## 👣 3. Flujo de Uso Paso a Paso

### Paso 1: Preparativos
Asegúrate de tener en tu MetaMask:
*   **Red**: Sepolia Test Network.
*   **ETH**: Para pagar el gas de las transacciones (puedes conseguirlo en [Sepolia Faucet](https://sepoliafaucet.com/)).
*   **USDC**: El token que vamos a transferir.

### Paso 2: Ejecutar la App
En la terminal, dentro de la carpeta `yellow-app`:
```bash
npm run dev
```
Abre el link que aparece (usualmente `http://localhost:5173/`).

### Paso 3: Conexión
Al cargar la página, se te pedirá conectar tu Wallet. Verás el mensaje:
> `🟢 Connected to Yellow Network!`
> `Conectado: 0xTuDireccion...`

### Paso 4: Depósito (On-Chain)
1.  Haz clic en el botón **"Deposit 1 USDC"**.
2.  **Transacción 1 (Approve)**: MetaMask te pedirá permiso para que el contrato de Custodia gaste tu USDC. Confírmala.
3.  **Transacción 2 (Deposit)**: Una vez aprobado, MetaMask te pedirá confirmar el depósito real.
4.  Espera a que aparezca: `✅ Depósito Exitoso`.
   *   *Estado*: Ahora tu dinero está en el contrato, listo para usarse en canales.

### Paso 5: Abrir Canal (Off-Chain)
1.  Haz clic en **"Open Channel"**.
2.  Te pedirá la dirección de tu contraparte (Partner). Por defecto hay una de prueba, puedes usar esa o una segunda cuenta tuya.
3.  El sistema verificará la conexión WebSocket (reconectando si es necesario) y enviará una propuesta de sesión firmada.
4.  Si todo sale bien, verás: `✅ Session ready: [ID de Sesión]`.

### Paso 6: Retiro (Recuperación)
Si deseas recuperar tus fondos a tu wallet:
1.  Haz clic en **"Withdraw Funds"**.
2.  Acepta la transacción en MetaMask.
3.  Espera la confirmación. Tus fondos volverán a tu saldo de USDC en MetaMask.

---

## 🐛 4. Solución de Problemas Comunes

### "WebSocket is already in CLOSING or CLOSED state"
**Causa**: La conexión con el servidor de Yellow se perdió por inactividad.
**Solución**: Ya está parchado en el código. La función `ensureConnection()` detecta esto y reconecta automáticamente antes de intentar cualquier operación.

### "Execution Reverted" o "Gas limit too high" al retirar
**Causa**: Intentar retirar fondos que no están disponibles (ej. ya están bloqueados en un canal abierto) o enviar parámetros incorrectos al contrato.
**Solución**: Se corrigió el código para enviar exactamente los parámetros que el contrato `withdraw` espera (`token`, `amount`). Asegúrate de no tener canales abiertos activos que estén usando esos fondos.

### "Allowance insuficiente"
**Causa**: El contrato de Custodia no tiene permiso para mover tus USDC.
**Solución**: El botón de depósito maneja esto automáticamente. Si falla, asegúrate de tener ETH para pagar el gas de la aprobación.

---

## 💻 5. Código Importante

El corazón de la corrección del retiro se encuentra en `SimplePaymentApp.js`:

```javascript
// La llamada correcta al contrato Withdraw
const withdrawHash = await this.walletClient.writeContract({
    address: CUSTODY_CONTRACT,
    abi: parseAbi(['function withdraw(address token, uint256 amount)']), // Solo 2 argumentos
    functionName: 'withdraw',
    args: [TOKEN_ADDRESS, amount],
    account: this.userAddress
});
```
