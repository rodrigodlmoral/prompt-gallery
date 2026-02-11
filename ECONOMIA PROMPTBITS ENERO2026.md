# ECONOMÍA PROMPTBITS - ENERO 2026 💎📊

Este documento detalla el estado técnico actual y la hoja de ruta para la seguridad y escalabilidad del sistema económico de Prompt Gallery.

---

## 1. ESTADO ACTUAL (Auditoría de Código)

Actualmente, el saldo de un usuario reside en el campo `tokens` de la colección `users`. El sistema funciona mediante actualizaciones directas desde el cliente, lo que representa un riesgo de seguridad y falta de trazabilidad.

### 📥 Cómo se GANAN los tokens (Fuentes de Ingreso)
Según el análisis del código en `store-final.js`, `main.js` y `profile.js`:

1.  **Bono de Bienvenida (Capital Inicial)**: Al registrarse, el sistema otorga **100 PromptBits** automáticamente. Esto permite que nuevos usuarios interactúen de inmediato.
2.  **Propinas/Regalos en Posts**: Un usuario puede enviar tokens a otro a través de un post. El destinatario recibe el monto íntegro.
3.  **Apoyo Directo al Perfil (Tips)**: A través del botón "Apoyar" en el perfil, se pueden enviar 5, 10, 20 o 50 tokens sin que estén vinculados a una imagen específica.
4.  **Sistema de Gamificación (XP/Niveles)**:
    *   **Subida de Nivel**: Ganas **10 tokens** cada vez que subes de nivel.
    *   **Bono de Actividad**: El sistema otorga **1 token** por ciertas acciones de interacción que generan XP.
5.  **Administración**: El dueño de la web puede usar la función `giftTokens` para inyectar saldo a cualquier usuario (soporte, premios, eventos).

### 📤 Cómo se GASTAN los tokens (Salidas de Capital)

1.  **Envío de Propinas (Tips)**: Es el flujo principal de transferencia entre usuarios.
2.  **Destacar Posts (Boost)**: Cuesta **50 tokens** destacar un prompt durante 7 días. Esta es la principal "quema" de tokens hacia el sistema.
3.  **Copiar Prompts (Futuro/Premium)**: Aunque actualmente hay lógica de copia, el modelo admite expandirse para que obtener un prompt específico tenga un coste en bits.

---

## 2. EL NUEVO SISTEMA: CONTABILIDAD PROFESIONAL (LEDGER) 🔐

Para evitar inconsistencias y proteger la economía, se propone la creación de la colección `promptbits_transactions`.

### Estructura de la Colección: `promptbits_transactions`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `user_id` | Relation (users) | Beneficiario o emisor del movimiento. |
| `amount` | Number | Cantidad (positivo para ingresos, negativo para gastos). |
| `type` | Select | `earn`, `spend`, `transfer`, `admin_adjustment`. |
| `reason` | String | Descripción: "Bono registro", "Tip de @usuario", "Boost Post #123". |
| `reference_id` | String/ID | ID del prompt o evento que originó la transacción. |
| `balance_snapshot` | Number | Saldo del usuario **después** de esta transacción. |

---

## 3. SEGURIDAD INFALIBLE (BACKEND FIRST) 🛡️

El objetivo es eliminar el permiso de escritura del frontend sobre el campo `tokens`.

### Reglas de Oro de Seguridad:
1.  **Update Prohibido**: Ningún usuario (excepto `admin`) debe poder editar el campo `tokens` de la tabla `users` directamente desde el navegador.
2.  **Hooks en PocketBase**: Toda la lógica económica debe ejecutarse en el servidor usando Hooks (Golang o JS):
    *   `onRecordBeforeCreateRequest` (en la tabla de transacciones): El servidor valida si el usuario tiene saldo antes de permitir el registro.
    *   `onRecordAfterCreateRequest`: El servidor actualiza el saldo del usuario automáticamente después de validar la transacción.
3.  **Atomicidad**: Las transacciones deben ser atómicas. Si falla la creación del registro en el Ledger, no se debe alterar el saldo del usuario.

### Mejora en la Experiencia de Usuario (UX)
*   **Auditoría para el usuario**: Crear una pestaña "Mis Finanzas" donde el usuario vea su historial de transacciones (gracias al nuevo Ledger).
*   **Sincronización Silenciosa**: Al cargar la web, el sistema verifica una sola vez el saldo real contra el historial, asegurando que el número que ve el usuario es 100% verídico.
*   **Prevención de Huérfanos**: Al momento de eliminar un post, el Ledger asegura que los tokens recibidos por ese post no se pierdan, manteniéndolos en el saldo histórico del autor.

---

**DOCUMENTO GENERADO POR ANTIGRAVITY - ENERO 2026**
*Propiedad de Prompt Gallery*
