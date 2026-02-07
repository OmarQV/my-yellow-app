# Guía: Usar Tokens de Sepolia en Yellow Network

Actualmente, tu aplicación utiliza "tokens simulados" en el entorno **Sandbox** de Yellow. Para usar tus tokens reales (USDC, ETH, etc.) de la red **Sepolia**, necesitamos conectar tu aplicación con la Blockchain real (Layer 1).

Esta guía te explicará los pasos técnicos para lograrlo.

---

## 🏗️ Requisitos Previos

1.  **Tokens en Sepolia**: Necesitas tener saldo de ETH (para gas) y del token que quieras usar (ej. Mock USDC en Sepolia) en tu MetaMask.
2.  **Dirección del Token**: Necesitas saber la dirección del contrato del token (ej. `0x1c7...`).
3.  **Dirección del Adjudicator**: Necesitas la dirección del contrato inteligente de Yellow (Adjudicator/Deposit) en Sepolia. *Esta dirección suele encontrarse en la documentación oficial de Yellow.*

---

## 🚀 Paso 1: Preparar la Lógica de Depósito ("Deposit")

En el código actual, el dinero aparece "mágicamente". En la red real, debes **bloquearlo** en un contrato inteligente.

Debemos agregar funciones para interactuar con la Blockchain usando `ethers.js` o `viem` (que ya viene con `@erc7824/nitrolite` o puedes usar `window.ethereum`).

### Código a Implementar (Ejemplo Conceptual)

Añadiríamos esto a tu clase `SimplePaymentApp`:

```javascript
async depositOnChain(tokenAddress, amount) {
    if (!this.userAddress) throw new Error("Conecta tu wallet primero");

    const amountWei = BigInt(amount); // Asegúrate de usar los decimales correctos (USDC suele usar 6)
    
    // 1. Aprobar que Yellow gaste tus tokens
    // Se requiere el ABI estándar de ERC20
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    const txApprove = await tokenContract.approve(YELLOW_ADJUDICATOR_ADDRESS, amountWei);
    await txApprove.wait();
    console.log("✅ Tokens aprobados");

    // 2. Depositar en el contrato de Yellow
    const adjudicatorContract = new ethers.Contract(YELLOW_ADJUDICATOR_ADDRESS, ADJUDICATOR_ABI, this.provider);
    const txDeposit = await adjudicatorContract.deposit(tokenAddress, amountWei); // La función exacta puede variar según el contrato real
    await txDeposit.wait();
    console.log("✅ Depósito confirmado On-Chain");
}
```

---

## 🔄 Paso 2: Modificar la Creación de Sesión

Una vez que los fondos están bloqueados en el contrato, Yellow Network detectará ese saldo. Ahora, cuando crees la sesión, debes usar la **dirección real del token** en lugar de simplemente `'usdc'`.

**En `SimplePaymentApp.js`:**

```javascript
// ANTES (Sandbox):
const allocations = [
    { participant: this.userAddress, asset: 'usdc', amount: '800000' },
    // ...
];

// DESPUÉS (Sepolia):
const SEPOLIA_USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Ejemplo

const allocations = [
    { 
      participant: this.userAddress, 
      asset: SEPOLIA_USDC_ADDRESS, // Usamos la dirección real como identificador
      amount: '1000000' // 1.00 USDC (si tiene 6 decimales)
    },
    // ...
];
```

---

## ⚠️ Advertencia Importante

Los canales de estado funcionan bajo el principio de **"Fondos Bloqueados"**:
1.  **Depositas** en L1 (Sepolia) -> El dinero sale de tu wallet y entra al contrato de Yellow.
2.  **Operas** en L2 (Yellow) -> Envías pagos instantáneos usando ese saldo bloqueado.
3.  **Retiras** a L1 -> Cierras el canal y el contrato te devuelve tu saldo restante a tu wallet.

**Si no realizas el Paso 1 (Depósito real), la creación de la sesión fallará en Sepolia** porque la red verificará y dirá: *"Este usuario dice que tiene 1 USDC, pero en el contrato no hay nada a su nombre"*.

---

## 📝 Resumen del Plan de Trabajo

1.  **Investigar**: Conseguir la dirección del `Adjudicator` de Yellow en Sepolia.
2.  **Programar**: Crear un botón "Depositar" en tu HTML.
3.  **Conectar**: Vincular ese botón con una función que lance la transacción de MetaMask.
4.  **Actualizar**: Cambiar `'usdc'` por la dirección del token real en tu código.
