# 🔄 FLUJOS DE USUARIO - Prompt Gallery

Este documento describe los principales flujos de interacción del usuario con la plataforma.

---

## 🚪 FLUJO 1: REGISTRO Y PRIMER USO

### Paso 1: Visitante llega al sitio
- Ve el dashboard con posts públicos
- Puede ver posts pero no puede interactuar
- Ve botón "Login" en el header

### Paso 2: Click en "Registrarse"
- Se abre `AuthModal` en modo registro
- Ve las 3 reglas de la comunidad:
  - 🔞 Mayor de 18 años
  - 🤝 Consentimiento para contenido real
  - 🛡️ Responsabilidad del contenido
- Rellena: Email, Usuario, Contraseña
- Click en "Registrar"

### Paso 3: Validación de email
- Sistema valida que el dominio del email esté permitido
- Sistema crea usuario con:
  - `level: 0` (Explorador)
  - `tokens: 100` (PromptBits)
  - `xp: 0`
  - `moderation: { suggestive: 'BLUR', nsfw: 'BLUR' }`
- Sistema envía email de verificación
- Sistema auto-sigue al admin
- Modal muestra mensaje: "Revisa tu email para activar tu cuenta"

### Paso 4: Verificación de email
- Usuario recibe email con link
- Click en link abre `AuthModal` en modo activación
- Usuario elige nueva contraseña
- Click en "Activar y Entrar"
- Sistema actualiza `level: 1` (Novato)
- Usuario es redirigido al dashboard autenticado

### Paso 5: Primera experiencia autenticada
- Dashboard se recarga con UI completa
- Ve TopBar con enlaces legales
- Ve su perfil en el header con:
  - Avatar (RoboHash por defecto)
  - Nivel 1 - Novato
  - 100 PromptBits
- Puede crear su primer post

---

## 📝 FLUJO 2: CREAR UN POST SIMPLE

### Paso 1: Abrir modal de creación
- Click en botón "Crear Post" (header)
- Se abre `CreateModal`
- Por defecto está en modo "Simple"

### Paso 2: Subir imagen
- Click en área de upload
- Selecciona imagen del sistema
- Sistema muestra preview
- Imagen se comprime automáticamente a WebP

### Paso 3: Llenar formulario
- **Título:** "Retrato Cyberpunk"
- **Prompt:** "cyberpunk portrait, neon lights, futuristic city..."
- **Negative Prompt:** "blurry, low quality, distorted"
- **Herramienta:** Selecciona "Midjourney"
- **Rating:** Selecciona "SFW / Apto"
- **Referencia:** Desmarca checkbox (no requiere foto de referencia)

### Paso 4: Añadir etiquetas
- Click en "Buscar Tags"
- Escribe "cyberpunk" en el buscador
- Sistema filtra categorías y muestra coincidencias
- Click en "cyberpunk", "portrait", "neon"
- Etiquetas se añaden a la lista de seleccionadas

### Paso 5: Auto-Tag con IA (opcional)
- Click en "IA Auto-Tag"
- Sistema convierte imagen a base64
- Envía a OpenRouter API (Gemini 2.0 Flash Lite)
- IA analiza imagen y sugiere: ["futuristic", "city", "lights"]
- Etiquetas se añaden automáticamente

### Paso 6: Publicar
- Click en "Publicar"
- Sistema valida:
  - ✅ Usuario nivel 1+
  - ✅ Título no vacío
  - ✅ Imagen presente
  - ✅ Máximo 10 etiquetas
- Sistema sube imagen a Cloudinary
- Sistema crea registro en PocketBase
- Sistema añade 50 XP al usuario
- Sistema incrementa `prompts_count` del usuario
- Modal se cierra
- Dashboard se recarga mostrando el nuevo post

---

## 🔍 FLUJO 3: BUSCAR Y COPIAR UN PROMPT

### Paso 1: Buscar contenido
- Usuario escribe "landscape" en barra de búsqueda
- Sistema muestra sugerencias en tiempo real:
  - Etiquetas: "landscape", "mountain landscape"
  - Usuarios: "@landscapemaster"
- Usuario presiona Enter o click en sugerencia

### Paso 2: Ver resultados
- Dashboard filtra posts que contienen "landscape" en:
  - Título
  - Prompt
  - Etiquetas
  - Nombre de autor
- Resultados se muestran en grid

### Paso 3: Abrir detalle de post
- Click en un post del grid
- Se abre `DetailModal` con:
  - Imagen completa
  - Título y autor
  - Prompt completo
  - Negative prompt
  - Herramienta usada
  - Rating
  - Contador de copias
  - Reacciones
  - Comentarios

### Paso 4: Copiar prompt
- Click en botón "Copiar Prompt" (10 PB)
- Sistema valida:
  - ✅ Usuario tiene al menos 10 PB
  - ✅ No ha copiado este prompt antes
  - ✅ No es su propio prompt
- Sistema ejecuta transacción:
  - Descuenta 10 PB del usuario
  - Añade 10 PB al autor
  - Incrementa `copy_count` del post
  - Añade username a `copiedBy` array
  - Añade 10 XP al autor
- Sistema copia texto al portapapeles
- Toast: "¡Prompt copiado! -10 PB"
- Botón cambia a "Ya copiado"

---

## 🎨 FLUJO 4: SUBIR DE NIVEL

### Escenario: Usuario alcanza 100 XP

### Paso 1: Acumular XP
- Usuario ha creado 2 posts (100 XP)
- `store.currentUser.xp = 100`

### Paso 2: Detección de subida de nivel
- Sistema calcula nivel con `getUserLevel(100)`
- Retorna `level: 2` (Principiante)
- Detecta que `currentUser.level === 1` pero debería ser `2`

### Paso 3: Actualización de nivel
- Sistema actualiza registro en PocketBase
- Sistema actualiza `store.currentUser.level = 2`
- Sistema dispara evento de subida de nivel

### Paso 4: Celebración
- Se abre modal de nivel 2
- Animación de confetti
- Mensaje: "¡Felicidades! Ahora eres Principiante"
- Lista de beneficios desbloqueados:
  - ✨ Puedes cambiar tu avatar
  - ✨ Puedes añadir redes sociales

### Paso 5: Nuevas capacidades
- Usuario va a Configuración
- Ahora ve habilitado el botón "Cambiar Foto"
- Ahora puede editar campos de redes sociales

---

## 🔞 FLUJO 5: CONFIGURAR MODERACIÓN

### Paso 1: Abrir configuración
- Click en avatar (header)
- Click en "Configuración"
- Se abre `SettingsModal`

### Paso 2: Navegar a sección de moderación
- Scroll hasta "🛡️ Moderación de Contenido"
- Ve dos dropdowns:
  - Contenido Sugestivo: [Mostrar / Difuminar]
  - Contenido NSFW: [Mostrar / Difuminar / Apagar]

### Paso 3: Cambiar configuración
- Cambia "Sugestivo" de "Difuminar" a "Mostrar"
- Deja "NSFW" en "Difuminar"
- Click en "Guardar Cambios"

### Paso 4: Aplicación de cambios
- Sistema llama a `store.updateUserSettings()`
- Sistema actualiza PocketBase
- Sistema actualiza `store.currentUser.moderation`
- Modal se cierra
- Dashboard se recarga

### Paso 5: Efecto visual
- Posts con rating "Sugestivo" ahora se ven sin blur
- Posts con rating "NSFW" siguen con blur
- Click en "Revelar Imagen" quita el blur temporalmente

---

## 👥 FLUJO 6: SEGUIR A UN CREADOR

### Paso 1: Descubrir creador
- Usuario ve el "Cuadro de Honor" (Top Creadores)
- Click en una tarjeta de creador
- Se abre perfil del creador (`profile.html?u=username`)

### Paso 2: Ver perfil
- Ve `ProfileHeader` con:
  - Avatar y nombre
  - Nivel y badges
  - Estadísticas (Posts, Seguidores, Siguiendo)
  - Botón "Seguir"
  - Redes sociales
- Ve tabs: Creaciones / Guardados / Actividad
- Por defecto está en "Creaciones"

### Paso 3: Seguir
- Click en botón "Seguir"
- Sistema llama a `store.followUser(username)`
- Sistema ejecuta batch update:
  - Añade ID del creador a `currentUser.following`
  - Añade ID del usuario a `creator.followers`
- Botón cambia a "Siguiendo"
- Contador de seguidores se incrementa

### Paso 4: Ver contenido de seguidos
- Usuario vuelve al dashboard
- Cambia filtro de "Community" a "Following"
- Ahora solo ve posts de usuarios que sigue

---

## 💬 FLUJO 7: COMENTAR EN UN POST

### Paso 1: Abrir detalle
- Click en un post
- Se abre `DetailModal`
- Scroll hasta sección de comentarios

### Paso 2: Escribir comentario
- Click en campo de texto
- Escribe: "¡Increíble trabajo! Me encanta el uso de colores"
- Mínimo 5 caracteres

### Paso 3: Verificación anti-bot
- Sistema muestra slider de verificación
- Usuario desliza el diamante 💎 de izquierda a derecha
- Slider se desbloquea con animación

### Paso 4: Enviar
- Click en "Enviar"
- Sistema valida:
  - ✅ Comentario tiene al menos 5 caracteres
  - ✅ Slider está desbloqueado
- Sistema llama a `store.addComment()`
- Sistema añade comentario con:
  - Username
  - Avatar
  - Texto
  - Timestamp

### Paso 5: Actualización
- Modal se recarga
- Comentario aparece en la lista
- Slider se resetea
- Campo de texto se limpia

---

## 🎯 FLUJO 8: REACCIONAR A UN POST

### Paso 1: Ver post en detalle
- Usuario abre `DetailModal`
- Ve barra de reacciones con contadores:
  - 👍 5 | ❤️ 3 | 🔥 2 | 😂 0 | 👎 0 | 😢 1

### Paso 2: Dar reacción
- Click en botón ❤️ (love)
- Sistema llama a `store.toggleReaction(postId, 'love')`
- Sistema actualiza optimísticamente la UI:
  - Contador de love: 3 → 4
  - Botón se marca como activo (resaltado)
  - Animación de scale

### Paso 3: Sincronización
- Sistema actualiza PocketBase en background
- Si falla, revierte el cambio optimista

### Paso 4: Cambiar reacción
- Usuario click en 🔥 (fire)
- Sistema detecta que ya dio "love"
- Sistema quita "love" y añade "fire":
  - Love: 4 → 3
  - Fire: 2 → 3
- Botón de love se desmarca
- Botón de fire se marca

### Paso 5: Quitar reacción
- Usuario click en 🔥 de nuevo
- Sistema detecta que es la misma reacción
- Sistema la quita:
  - Fire: 3 → 2
- Botón se desmarca

---

## 🎁 FLUJO 9: ENVIAR PROPINA

### Paso 1: Abrir modal de propina
- Usuario está en `DetailModal`
- Click en botón "Enviar Propina"
- Se abre `TipModal`

### Paso 2: Seleccionar cantidad
- Ve opciones: 10 PB, 25 PB, 50 PB, 100 PB
- Click en "25 PB"
- Botón se resalta

### Paso 3: Confirmar
- Click en "Enviar Propina"
- Sistema valida:
  - ✅ Usuario tiene al menos 25 PB
- Sistema ejecuta transacción:
  - Descuenta 25 PB del usuario
  - Añade 25 PB al autor
  - Registra en activity logs

### Paso 4: Confirmación
- Toast: "¡Propina enviada! -25 PB"
- Modal se cierra
- Header actualiza contador de PB

---

## 🔧 FLUJO 10: EDITAR UN POST

### Paso 1: Abrir post propio
- Usuario abre un post que él creó
- `DetailModal` detecta que es el autor
- Muestra botones adicionales:
  - ✏️ Editar
  - 🗑️ Eliminar

### Paso 2: Click en editar
- Se cierra `DetailModal`
- Se abre `CreateModal` en modo edición
- Campos se pre-llenan con datos actuales
- Título del modal: "Editar Post"

### Paso 3: Hacer cambios
- Usuario cambia título
- Añade una etiqueta nueva
- Cambia rating de "SFW" a "Sugestivo"

### Paso 4: Guardar
- Click en "Guardar Cambios"
- Sistema valida propiedad del post
- Sistema llama a `store.updatePrompt()`
- Sistema actualiza PocketBase
- Modal se cierra
- Dashboard se recarga con cambios

---

**Conclusión:** Estos flujos cubren las interacciones principales del usuario con la plataforma. Cada flujo está diseñado para ser intuitivo y proporcionar feedback inmediato al usuario.
