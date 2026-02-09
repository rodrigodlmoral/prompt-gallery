# 📁 Historial de Copias de Seguridad (Backups)

Este archivo registra todas las versiones de seguridad creadas para la App "Prompt Gallery".

| Versión | Fecha y Hora | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| **v1.0** | 2026-01-27 23:45 | Restauración completa de funcionalidades + Settings Modal | ✅ Realizada |
| **v1.1** | 2026-01-28 00:06 | Mejora de Collage, Reacciones y Atribución de Creador Original | ✅ Realizada |
| **v1.2** | 2026-01-28 00:40 | Restauración de DetMetaTop, eliminación opción 'Eliminar' de DetailModal, nativo Fullscreen, Tips Icon. | ✅ Realizada |
| **v1.3** | 2026-01-28 01:03 | Ajustes de filtros (Source, Time, Sort, etc.), moderación visual (blur) en gallery y carousel, corrección filtro Origen/Siguiendo. | ✅ Realizada |
| **v1.4** | 2026-01-28 01:03 | Implementación completa de Edición (Single/Sequence), Filtro de Perfil "Tus Prompts" bloqueado, corrección de botón "Guardar Cambios" y validación de imagen en edición. | ✅ Realizada |
| **v1.5** | 2026-01-28 01:46 | Actualización completa de secciones Legales (Términos, Privacidad, Seguridad) con contenido profesional y scroll. Reparación visual y funcional del botón y formulario de Soporte. | ✅ Realizada |
| **v1.6** | 2026-01-28 02:32 | Corrección total de Header (Logout/Avatar), limpieza de código duplicado, restauración de Admin Mode y seguridad en visibilidad de botones (editar/borrar solo en perfil). | ✅ Realizada |
| **v1.7** | 2026-01-29 14:00 | **Optimización de Supabase**: Compresión WebP, Caché de 1 año y Parche de Emergencia para Egress. | ✅ Realizada |
| **v2.0** | 2026-01-31 01:05 | **Admin Total & Sorting**: Migración Cloudinary OK, RLS Admin OK, Borrado de Usuarios y Reordenamiento Alfabético. | ✅ Realizada |
| **v3.0** | 2026-02-03 20:40 | **Seguridad & Rewards**: Protección XSS, Crystal Slider Anti-Bot, Recompensas (+1), Cooldown (5m) y Límite Diario (10). | ✅ Realizada |
| **v4.0** | 2026-02-04 15:34 | **Migración de Perfiles**: Conversión a MPA, perfiles en `/profile.html?u=...`, limpieza de lógica en `main.js`. | ✅ Realizada |
| **v4.1** | 2026-02-05 16:52 | **Post-Review Backup**: Backup completo tras documentación exhaustiva del proyecto. Estado estable pre-correcciones. | ✅ Realizada |
| **v4.2** | 2026-02-06 10:45 | **Reactivación**: Desactivación del Modo Mantenimiento. Web accesible nuevamente. | ✅ Activa |
| **v4.3** | 2026-02-06 10:55 | **Refactor DRY**: Centralización de constantes (`TOOLS`, `LEVELS`, `RATINGS`) en `store-final.js` para evitar duplicidad. | ✅ Desplegada |
| **v4.4** | 2026-02-06 11:05 | **Performance**: Implementación de `nuclearCache` (TTL 5 min). Reduce llamadas a DB (1000 items) en búsquedas fallidas. | ✅ Desplegada |
| **v4.5** | 2026-02-06 11:10 | **UI Cleanup**: Eliminación de estilos inline. | ❌ FALLÓ (CSS Truncado) |
| **v4.5-ROLLBACK** | 2026-02-06 11:15 | **Full Restore**: Se restauró `style.css` (38KB) desde backup y se revirtieron scripts. | ✅ Desplegada (FIX) |
| **v4.6** | 2026-02-06 12:15 | **Profile Logic Fix**: Corrección de filtro (ID vs Username) y manejo de usuarios no encontrados. | ✅ Desplegada |
| **v4.7** | 2026-02-06 12:25 | **Search Strategy Fix**: Reactivación de búsqueda directa por usuario (Strategy 1) para encontrar usuarios fuera del caché masivo. | ✅ Desplegada |
| **v4.8** | 2026-02-06 12:35 | **Flexible Search**: Ampliación de búsqueda para incluir `OR name = ...`. | ❌ FALLÓ (400 Bad Request) |
| **v4.9** | 2026-02-06 12:45 | **Sequential Search**: Refactor de búsqueda en 2 pasos. | ❌ FALLÓ (400 Bad Request persistente) |
| **v5.0** | 2026-02-06 12:55 | **Diagnostic Search**: Uso de `getFirstListItem`. | ❌ FALLÓ (400 Bad Request persistente) |
| **v5.1** | 2026-02-06 13:00 | **Super Safe Search**: Refactor SQL explícito. | ✅ Desplegada (Pero no resolvió el problema lógico) |
| **v5.4** | 2026-02-06 13:30 | **Name Priority**: Se prioriza búsqueda por `name`. | ❌ FALLÓ (Conflicto Puerto 5174) |\n| **v5.5** | 2026-02-06 13:45 | **Fuzzy Search**: Uso de `~`. | ❌ FALLÓ (Toast mostró v5.4, posible caché o fallo lógico) |\n| **v5.6** | 2026-02-06 14:00 | **Explicit Debug**: Toast con info de búsqueda y alertas de fallos. | ❌ FALLÓ (400 Bad Request confirmed) |\n| **v6.0** | 2026-02-06 14:15 | **Strict Name Search**: Revertir a `=` para evitar 400. | ❌ FALLÓ (400 Bad Request confirmed) |\n| **v7.0** | 2026-02-06 14:30 | **Dragnet Search**: Client-side filtering. | ❌ FALLÓ (Sobreescrito por función duplicada) |\n| **v8.0** | 2026-02-06 14:45 | **Ghost Buster**: Eliminada función duplicada en línea 665. | ✅ FIX FINAL REAL |

---

## 🛠️ Cómo Restaurar una Versión Anterior
Si algo sale mal con una actualización futura, puedes pedirme:
> *"Antigravity, restaura la copia de seguridad v1.0"*

Yo procederé a sobreescribir los archivos actuales con los del backup seleccionado de forma automática.
| **ADMIN FIX** | 2026-02-06 15:25 | **Admin Nuke**: Borrado privilegiado de 5 posts fantasmas. Script eliminado post-uso. | ✅ BORRADO TOTAL |
| **SYNC** | 2026-02-06 15:35 | **Recalc Counts**: Script `recalc_counts.js` ejecutado para sincronizar `prompts_count` real. | ✅ CONTADORES OK |
| **v8.2** | 2026-02-06 15:45 | **Auto-Decrement**: `removePrompt` ahora recalcula y guarda el conteo real en DB. | ✅ FIX LÓGICO |
| **v8.3** | 2026-02-06 16:00 | **UX Polish**: Reemplazados `alert()` molestos por `toast()` elegantes. Limpieza de logs. | ✅ UI MEJORADA |
| **v9.0** | 2026-02-09 00:25 | **Master Unification + MPA Fix**: Centralización de lógica en `store-final.js`, unificación de IDs (#app) y corrección de renderizado en Perfiles. | ✅ ESTABLE |
