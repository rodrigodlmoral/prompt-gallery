# 🎓 PROMPT GALLERY - Documentación Completa para Entrenamiento de IA

Este paquete contiene toda la información necesaria para que una IA externa comprenda al 100% el funcionamiento de **Prompt Gallery**.

---

## 📋 ÍNDICE DE ARCHIVOS

1. **README.md** (Este archivo) - Índice y visión general
2. **ARQUITECTURA.md** - Estructura técnica del proyecto
3. **LOGICA_NEGOCIO.md** - Reglas de negocio, niveles, tokens, moderación
4. **COMPONENTES.md** - Catálogo de componentes UI y su función
5. **STORE_API.md** - Documentación completa del Store (cerebro del sistema)
6. **FLUJOS_USUARIO.md** - Casos de uso y flujos de interacción
7. **CODIGO_CRITICO.md** - Fragmentos de código esenciales con explicaciones

---

## 🎯 PROPÓSITO DEL PROYECTO

**Prompt Gallery** es una plataforma web para compartir y monetizar prompts de IA generativa (imágenes). Los usuarios pueden:
- Publicar sus prompts con las imágenes generadas
- Copiar prompts de otros usuarios (gastando PromptBits)
- Ganar experiencia y subir de nivel
- Configurar moderación de contenido sensible
- Seguir a otros creadores

---

## 🛠️ STACK TECNOLÓGICO

### Frontend
- **Vite** - Build tool y dev server
- **Vanilla JavaScript** (ES6 Modules) - Sin frameworks
- **CSS Modular** - Estilos en `style.css` y `admin_fix.css`

### Backend
- **PocketBase** - Base de datos y autenticación (hosted en PocketHost)
- **Cloudinary** - CDN para almacenamiento de imágenes

### Servicios Externos
- **OpenRouter API** - Auto-tagging con IA (Gemini 2.0 Flash Lite)
- **Google Analytics 4** - Tracking de eventos

---

## 📂 ESTRUCTURA DE CARPETAS

```
prompt-gallery-v2/
├── src/
│   ├── components/          # Componentes UI modulares
│   │   ├── Modals/         # Modales (Auth, Create, Settings, etc.)
│   │   ├── Layout.js       # TopBar, Header, ProfileHeader
│   │   ├── Gallery.js      # Grid principal de posts
│   │   ├── Collage.js      # Hero carousel
│   │   ├── TopCreators.js  # Cuadro de honor
│   │   └── ...
│   ├── utils/              # Funciones auxiliares
│   │   ├── security.js     # Moderación y escape HTML
│   │   ├── dom.js          # Manipulación DOM
│   │   ├── ui-helpers.js   # Toast, confirmaciones
│   │   └── ...
│   ├── data/               # Datos estáticos
│   │   ├── tags.js         # Categorías de etiquetas
│   │   └── tagAliases.js   # Alias de búsqueda
│   ├── store-final.js      # Estado global y lógica de negocio
│   ├── main.js             # Punto de entrada (Dashboard)
│   ├── profile.js          # Página de perfil de usuario
│   ├── pocketbase.js       # Configuración de PocketBase
│   ├── uploadService.js    # Compresión y upload a Cloudinary
│   └── style.css           # Estilos globales
├── index.html              # Dashboard principal
├── profile.html            # Página de perfil
└── package.json            # Dependencias
```

---

## 🔑 CONCEPTOS CLAVE

### 1. PromptBits (Moneda Virtual)
- Cada copia de un prompt cuesta **10 PromptBits**
- Los usuarios empiezan con **100 PromptBits**
- Se ganan PromptBits cuando otros copian tus prompts

### 2. Sistema de Niveles
- **Nivel 0 (Explorador)**: Usuario nuevo, sin verificar email
- **Nivel 1 (Novato)**: Email verificado
- **Nivel 2 (Principiante)**: 100 XP - Puede cambiar avatar y redes sociales
- **Nivel 3 (Creador)**: 500 XP - Puede crear secuencias
- **Nivel 4 (Artista)**: 1,500 XP - Desbloquea herramientas premium
- **Nivel 5 (Maestro)**: 5,000 XP
- **Nivel 6 (Leyenda)**: 15,000 XP
- **Nivel 7 (Titán)**: 50,000 XP

### 3. Moderación de Contenido
- **SFW / Apto**: Contenido seguro para todos
- **Sugestivo**: Contenido insinuante (configurable: Mostrar/Blur)
- **NSFW / +18**: Contenido adulto (configurable: Mostrar/Blur/Ocultar)

### 4. Tipos de Posts
- **Simple**: Una imagen + un prompt
- **Secuencia**: Múltiples imágenes con prompts individuales (requiere Nivel 3+)

---

## 🔄 FLUJO DE DATOS

1. **Usuario inicia sesión** → PocketBase autentica → Store carga datos del usuario
2. **Store carga prompts** → PocketBase devuelve lista → Se filtran según moderación
3. **Usuario crea post** → Imagen se comprime → Se sube a Cloudinary → URL se guarda en PocketBase
4. **Usuario copia prompt** → Se verifica saldo → Se descuentan PromptBits → Se actualiza contador de copias

---

## 📖 CÓMO USAR ESTA DOCUMENTACIÓN

1. Lee **ARQUITECTURA.md** para entender la estructura del código
2. Lee **LOGICA_NEGOCIO.md** para comprender las reglas del sistema
3. Consulta **STORE_API.md** para ver todas las funciones disponibles
4. Revisa **COMPONENTES.md** para entender la UI
5. Estudia **CODIGO_CRITICO.md** para ver implementaciones específicas

---

**Última actualización:** 11 de Febrero, 2026
**Versión del Proyecto:** 4.1 "Refined Components"
