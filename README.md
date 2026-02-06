# Yellow Network - Simple Payment App

## 1. ¿Cuál es la finalidad de este proyecto con Yellow?
Yellow Network es una red que permite hacer **intercambios y pagos instantáneos** sin tener que esperar los tiempos de confirmación de la Blockchain (como Ethereum o Bitcoin) y sin pagar gas por cada transacción pequeña.

Este proyecto ("SimplePaymentApp") es una demostración técnica de **Canales de Estado (State Channels)**.

*   **Imagina esto:** Tú y tu socio quieren jugar al póker apostando dinero.
*   **En la Blockchain normal:** Cada vez que uno sube la apuesta, tendrían que enviar una transacción a la red, pagar comisión y esperar 15 segundos. Sería lento y caro.
*   **Con Yellow (Channels):** Ambos ponen el dinero en una caja fuerte común (el "Canal") al principio. Luego, juegan y anotan en un papel quién va ganando (firmando cada jugada criptográficamente). Al final, solo van a la Blockchain una vez para repartir el dinero según la última nota del papel.

Tu aplicación hace exactamente esto: Abre un canal directo con otra persona para enviarse dinero "virtual" (USDC de prueba) instantáneamente.

## 2. ¿Qué pasos seguimos para lograrlo?
Tuvimos que adaptar el código de la guía porque le faltaban piezas para funcionar en un navegador real:

1.  **Instalación (Setup):** Creamos la carpeta del proyecto e instalamos `@erc7824/nitrolite`, que es la librería (SDK) de Yellow que hace la magia de conectar con su red.
2.  **Preparación del entorno Web (Vite):** El código original era solo JavaScript suelto. Tuvimos que crear un `index.html` e instalar `vite` para que el navegador pudiera entender las importaciones y mostrar la aplicación.
3.  **Corrección de Errores:**
    *   **Función incorrecta:** La guía usaba un nombre viejo (`parseRPCResponse`), lo cambiamos por el nuevo (`parseAnyRPCResponse`) para poder leer los mensajes del servidor.
    *   **Formato de firma:** MetaMask es estricto. El SDK intentaba firmar un "objeto" directo, y tuvimos que convertirlo a "texto" (`JSON.stringify`) para que MetaMask aceptara firmarlo.
    *   **Dirección real:** Cambiamos la dirección falsa `0xPartnerAddress` por una dirección válida para que la transacción no fallara al validarse.

## 3. Explicación del Código (Paso a Paso)
Tu archivo `SimplePaymentApp.js` es el cerebro. Aquí te explico qué hace cada bloque:

### A. Conexión Inicial (`init`)
Esto abre la línea telefónica con la red Yellow. Es como conectarse a internet.

### B. Preparar la Billetera (`setupWallet`)
Aquí obtenemos tu identidad digital (tu dirección `0x...`) y la "pluma" para firmar documentos digitales (tu clave privada a través de MetaMask).

### C. Crear la Sesión (`createSession`)
*   **Concepto clave:** Aquí es donde "abres la caja fuerte" compartida. Dices: "Yo pongo 0.8 USDC y mi socio 0.2 USDC".
*   Envías este contrato firmado a la red Yellow. Si ves `Payment session created!`, significa que la red aceptó abrir este canal privado.

### D. Enviar el Pago (`sendPayment`)
*   Aquí, en lugar de mover dinero real en la Blockchain, le escribes un "cheque" digital a tu socio.
*   Como ya tienen el canal abierto, este mensaje viaja instantáneamente por el WebSocket. No hay espera de bloques ni comisiones de gas.

## En resumen: ¿Qué pasó en tu consola?
*   `🟢 Connected`: Tu PC habló con Yellow.
*   `Signature Request`: Firmaste con MetaMask para probar que eres tú.
*   `✅ Payment session created!`: Yellow creó un espacio privado para ti y la dirección destino.
*   `💸 Sent 100000 instantly!`: Enviaste una promesa de pago firmada dentro de ese canal.


```
npm install @erc7824/nitrolite
```
```
npm install vite --save-dev   
```
```
npm run dev         
```