# 💎 ECONOMÍA PROMPTBITS: MANIFIESTO Y AUDITORÍA (Actualizado Feb 2026)

Este documento es el registro maestro de la arquitectura económica de **Prompt Gallery**. Detalla la evolución del sistema de tokens, desde sus fallos iniciales hasta el blindaje actual y el futuro sistema de auditoría inmutable.

---

## 📅 1. LÍNEA DE TIEMPO Y EVOLUCIÓN

### Fase 1: Génesis (Enero 2026)
*   **Concepto**: Creación de los "Bits" como incentivo básico.
*   **Estado**: El saldo era un simple número en la tabla `users`.
*   **Vulnerabilidad**: El frontend tenía permisos completos de escritura sobre el saldo. Cualquier usuario con conocimientos básicos de consola podía "inyectarse" millones de bits.

### Fase 2: El Refactor de Seguridad (Principios Feb 2026)
*   **Problema Detectado**: El "Bug de Persistencia". Los usuarios perdían bits aleatoriamente al actualizar su perfil porque el frontend sobrescribía el valor real de la base de datos con una copia local antigua.
*   **Solución Aplicada**: Se eliminó el campo `tokens` de todas las funciones de actualización de perfil (`_persistUser`).
*   **Resultado**: El saldo solo puede cambiar mediante operaciones controladas en el servidor (Batch updates). ✅

### Fase 3: Unificación y Auditoría V29 (Hoy)
*   **Meta**: Implementar el `promptbits_ledger` para que cada centavo digital sea trazable.

---

## 💰 2. MECÁNICAS DE FLUJO DE CAPITAL

### 📥 Entradas (¿Cómo entran bits al sistema?)
1.  **Welcome Bonus**: **+100 💎** al verificar el correo. Es el capital semilla para que la comunidad se mueva.
2.  **Incentivo de Creación**: **+1 💎** por cada prompt publicado. Fomenta que los usuarios compartan su trabajo.
3.  **Level Up Bonus**: **+10 💎** por cada subida de nivel (de "Explorador" hasta "Maestro").
4.  **Admin Gift**: Inyecciones manuales por parte del equipo de moderación para premios o soporte.

### 🔄 Circulación (Transferencias Usuario a Usuario)
1.  **Propinas (Tips)**: Los usuarios pueden enviar cualquier cantidad a sus autores favoritos. Es la base de la economía social.
2.  **Regalos Directos**: Transferencias manuales desde el perfil de un usuario.

### 📤 Salidas (¿Cómo desaparecen bits del sistema?)
1.  **Boost Post**: Cuesta **50 💎** destacar un post durante 7 días. Esta "quema" de tokens ayuda a evitar la inflación galopante.

---

## 🕵️‍♂️ 3. LA AUDITORÍA PROFESIONAL (LEDGER V29)

Para garantizar que nadie pierda tokens y que todo sea auditable, el sistema ahora utiliza la colección `promptbits_ledger`.

### Esquema de Datos Requerido:
| Campo | Propósito | Ejemplo |
| :--- | :--- | :--- |
| `user` | Dueño del movimiento | `ID_USUARIO_123` |
| `amount` | Cambio neto | `+10` (Ingreso) o `-50` (Gasto) |
| `type` | Clasificación técnica | `signup`, `tip_send`, `post_reward`, `boost` |
| `description`| Motivo legible | "Propina enviada a @rodrigo" |
| `metadata` | Datos técnicos | `{ "postId": "ABC", "ip": "1.2.3.4" }` |

### Reglas de Auditoría Inmutable:
> [!IMPORTANT]
> **NUNCA BORRAR**: Los registros del ledger no se deben borrar jamás. Si hay un error, se crea una transacción de "Ajuste" (negativa o positiva) para compensar, manteniendo el historial intacto.

---

## 🛡️ 4. SEGURIDAD Y BLINDAJE TÉCNICO

*   **Frontend Read-Only**: El navegador solo puede **leer** el saldo total. Nunca puede decidir cuánto saldo tiene el usuario.
*   **Validación de Saldo**: Antes de cualquier transacción (Tip o Boost), el sistema verifica en el servidor que `saldo_actual >= monto_a_gastar`.
*   **Transacciones Atómicas**: Si el registro en el Ledger falla, el saldo del usuario no se toca. Esto previene "bits fantasma" que se gastan pero no se registran.

---

## 🚀 5. HOJA DE RUTA (PRÓXIMOS PASOS)

1.  **Pestaña de Transacciones**: Una nueva vista para que cada usuario vea su extracto bancario digital.
2.  **Notificaciones de Ingreso**: Avisar en tiempo real cuando recibes una propina.
3.  **Marketplace de Beneficios**: Poder canjear PromptBits por emojis exclusivos, colores de nombre o marcos para el avatar.

---
**DOCUMENTO MAESTRO - ACTUALIZADO FEBRERO 2026**
*Unidad de Seguridad Económica - Prompt Gallery* 🛡️💎📊
