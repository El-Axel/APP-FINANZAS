# Mis Finanzas — guía de configuración

Esta guía tiene tres partes que puedes hacer **en orden y por separado**. Cada una funciona sin la siguiente:

1. **Subir el nuevo diseño** (10 min, sin configurar nada).
2. **Sincronizar con Google** para ver lo mismo en el celular y en el PC (15 min, gratis).
3. **Anotar gastos desde WhatsApp** (45–60 min, es la parte más larga, también gratis).

Los nombres de los botones de Firebase, Netlify y Meta cambian de vez en cuando; si algo no se llama exactamente igual, busca el equivalente.

---

## 0. Antes de tocar nada: que no se pierdan tus datos

**Por qué importa:** tus datos viven *dentro del navegador*, atados a la dirección del sitio (tu URL de Netlify). Mientras la dirección sea la misma y no borres los datos del navegador, siguen ahí. Lo que hay que evitar es cambiar de dirección sin haberlos respaldado.

**Haz esto primero (2 minutos):**

1. Abre tu app actual, en el mismo navegador donde la usas.
2. Baja al final y toca **"Exportar respaldo (.json)"**. Se descarga un archivo `finanzas-respaldo-AAAA-MM-DD.json`.
3. Guárdalo en un lugar seguro (por ejemplo, súbelo a tu Google Drive).
4. Si también anotaste cosas desde el celular, haz lo mismo allá: cada dispositivo tiene sus propios datos hasta que conectes Google (parte 2).

**Subir el nuevo diseño sin perder nada:**

1. Entra a Netlify → tu sitio actual → pestaña **Deploys**.
2. Arrastra la carpeta **`public`** (la que tiene `index.html` adentro) al recuadro *"Drag and drop your site output folder here"*.
3. **No crees un sitio nuevo**: así la dirección es la misma y tus datos siguen ahí.
4. Abre la app: deberías ver todo lo que ya tenías, con el diseño nuevo.

**Si algo sale mal:**

- Abajo en la app: **Datos y respaldo → Cargar respaldo**, y eliges tu `.json`. Queda todo como estaba.
- Cada vez que eliminas algo o cargas un respaldo aparece un aviso con **Deshacer**.
- La app no pisa tus datos si están dañados: los aparta en una copia aparte en vez de borrarlos.

**Si algún día cambias de dirección** (un sitio nuevo, un dominio propio), los datos no viajan solos. Ahí sirve el respaldo `.json`, o mejor aún: conectar Google (parte 2), porque con eso tus datos viven en la nube y ya no dependen de la dirección.

---

## 1. Lo que cambió en el diseño

- **Arriba:** cuánto te queda este mes, cuánto falta por pagar y cuánto llevas pagado. La barra muestra a dónde se va tu ingreso; **lo rayado es pendiente y lo sólido es pagado**.
- **Barra de abajo (gasto rápido):** escribes como en WhatsApp, por ejemplo `almuerzo 25000`, `uber 18k`, `mercado 85 mil`, y se anota como gasto variable **ya pagado**, con su categoría. Si te equivocas, aparece **Deshacer**.
- Tocas el botón **Pendiente / Pagado** de cada fila para cambiarlo. Los pendientes siempre quedan arriba.
- Todo se adapta al modo claro u oscuro de tu celular o computador.

---

## 2. Sincronizar con Google (Firebase)

Firebase es un servicio gratuito de Google. Con el plan gratis (Spark) sobra para uso personal.

### 2.1 Crear el proyecto
1. Entra a <https://console.firebase.google.com> con tu cuenta de Google.
2. **Agregar proyecto** → ponle un nombre (por ejemplo `mis-finanzas`). Google Analytics puedes dejarlo apagado.

### 2.2 Activar el inicio de sesión con Google
1. Menú **Build → Authentication → Comenzar**.
2. Pestaña **Método de acceso → Google → Habilitar**, elige tu correo de asistencia y guarda.

### 2.3 Crear la base de datos
1. **Build → Firestore Database → Crear base de datos**.
2. Modo **producción**. Elige una ubicación cercana (por ejemplo `southamerica-east1`).

### 2.4 Poner las reglas de seguridad
1. En Firestore, pestaña **Reglas**.
2. Borra lo que hay y pega el contenido del archivo `firestore.rules` de este proyecto.
3. **Publicar**. Estas reglas hacen que cada cuenta solo pueda ver sus propios datos.

### 2.5 Conectar la app
1. Rueda de engranaje → **Configuración del proyecto** → sección **Tus apps** → ícono web **`</>`**.
2. Ponle un nombre y toca **Registrar app** (no necesitas Firebase Hosting).
3. Te muestra un bloque `firebaseConfig`. Abre `public/index.html` en VS Code, busca `PEGA_AQUI` (está cerca del principio) y reemplaza los cuatro valores: `apiKey`, `authDomain`, `projectId`, `appId`.

> La `apiKey` de Firebase **no es una contraseña**: identifica tu proyecto. Lo que protege tus datos son las reglas del paso 2.4.

### 2.6 Autorizar tu dirección
1. **Authentication → Configuración → Dominios autorizados → Agregar dominio**.
2. Escribe tu dirección de Netlify sin `https://` (por ejemplo `mi-finanzas.netlify.app`).

### 2.7 Subir y conectar
1. Sube la carpeta `public` otra vez a Netlify (paso de la parte 0, al mismo sitio).
2. Abre la app. Arriba a la derecha verás **"Conectar con Google"**: tócalo y elige **Continuar con Google**.
3. La primera vez, si este dispositivo ya tenía datos, la app **une** lo que hay aquí con lo que haya en tu cuenta (no reemplaza nada) y avisa con un mensaje.
4. En el celular: abre la misma dirección, conecta con la **misma cuenta** y listo. Puedes usar "Añadir a pantalla de inicio" para que quede como una app.

**Cómo se comporta:** cada cambio se guarda en el dispositivo y en la nube, y los demás dispositivos lo reciben en segundos. Si estás sin internet, se guarda aquí y sube al volver. Si dos dispositivos editan a la vez estando sin conexión, gana el último que guardó.

---

## 3. WhatsApp → "Gastos variables"

**Lo que vas a lograr:** escribes en WhatsApp `almuerzo 25000` y en la app aparece en *Gastos variables*, ya **pagado**, con la etiqueta "WhatsApp". Si la app estaba cerrada, el gasto aparece cuando la abras con tu sesión iniciada.

**Antes de empezar, ten en cuenta:**
- Usa la **API oficial de WhatsApp Business (Meta)**. Meta te da un **número de prueba** sin costo, y ahí puedes registrar tu número personal como destinatario. Los precios cambian: revisa la página de precios de WhatsApp Business por si aplica algo en tu caso.
- Necesita una función en el servidor, y la carga arrastrando carpetas (Netlify Drop) **no la despliega**. Hay que conectar el proyecto con GitHub.
- **Haz primero la parte 2.** Con Google ya conectado tus datos están en la nube, y todo lo de abajo es mucho menos riesgoso.

### 3.1 Subir el proyecto a GitHub
Crea un repositorio **privado** en GitHub y, desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Mis Finanzas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/finanzas-app.git
git push -u origin main
```

El archivo `.gitignore` ya evita subir llaves. **Nunca subas** el JSON de la cuenta de servicio (paso 3.3).

### 3.2 Conectar el repositorio con Netlify
1. Netlify → tu sitio → **Site configuration → Build & deploy → Continuous deployment → Link repository** → GitHub → elige el repositorio, rama `main`.
2. Deja vacío el *Build command*. El *Publish directory* es `public` (ya está en `netlify.toml`).
3. Si Netlify no te deja vincular el sitio actual, crea un **sitio nuevo desde GitHub**. Tendrá otra dirección: agrégala en Firebase (paso 2.6) y entra con Google; tus datos bajan solos desde la nube.

### 3.3 Variables de entorno en Netlify
**Site configuration → Environment variables → Add a variable.** Crea estas:

| Variable | De dónde sale |
|---|---|
| `OWNER_UID` | Firebase → Authentication → Usuarios → columna *UID* de tu cuenta (aparece después de iniciar sesión en la app) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase → Configuración del proyecto → **Cuentas de servicio → Generar nueva clave privada**. Abre el `.json` descargado y pega **todo** su contenido |
| `ALLOWED_PHONE` | Tu número personal, solo dígitos y con indicativo. Colombia: `573001234567` |
| `WHATSAPP_VERIFY_TOKEN` | Una frase que inventas tú (la usarás en el paso 3.5) |
| `WHATSAPP_PHONE_ID` | Meta → WhatsApp → API Setup → *Phone number ID* |
| `WHATSAPP_APP_SECRET` | Meta → App settings → Basic → *App secret* |
| `WHATSAPP_TOKEN` | Token de acceso (ver 3.4) |

> El JSON de la cuenta de servicio da acceso total a tu base de datos. No lo subas a GitHub, no lo mandes por chat ni por correo. Solo va en esa variable de Netlify.

### 3.4 Configurar Meta
1. Entra a <https://developers.facebook.com> → **My Apps → Create App** → tipo **Business**.
2. Agrega el producto **WhatsApp**. En **API Setup** verás el número de prueba y su *Phone number ID*.
3. En **"To"** agrega tu número personal como destinatario y confírmalo con el código que te llega por WhatsApp.
4. **Token:** el que muestra el panel dura unas 24 horas (sirve para probar). Para uno que no venza: Business settings → **System users** → crea un usuario del sistema, asígnale tu app y genera un token con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.

### 3.5 Registrar el webhook
1. Meta → WhatsApp → **Configuration → Webhook → Edit**.
2. **Callback URL:** `https://TU-SITIO.netlify.app/api/whatsapp`
3. **Verify token:** exactamente la misma frase de `WHATSAPP_VERIFY_TOKEN`.
4. **Verify and save**, y luego suscríbete al campo **`messages`**.

### 3.6 Probar
Desde tu WhatsApp escríbele al número de prueba:

- `ayuda` → te explica los formatos.
- `almuerzo 25000` → responde "✅ Anotado: Almuerzo · $25.000 · Comida (pagado)".
- `resumen` → te dice cuánto te queda este mes y cuánto falta por pagar.

Abre la app (con tu sesión iniciada) y verás el gasto con la etiqueta de WhatsApp.

**Seguridad:** la función solo atiende tu número, comprueba la firma de Meta en cada mensaje y rechaza todo lo demás.

---

## 4. Problemas frecuentes

| Qué pasa | Qué hacer |
|---|---|
| Netlify muestra "Page not found" | Sube la carpeta `public` (con `index.html` adentro), no el archivo suelto |
| "Este sitio no está autorizado" al conectar Google | Paso 2.6: agrega tu dirección en *Dominios autorizados* |
| "Falta activar el inicio de sesión con Google" | Paso 2.2 |
| "Firestore rechazó el acceso" | Paso 2.4: publica las reglas |
| No se abre la ventana de Google | Permite las ventanas emergentes de tu sitio |
| WhatsApp no responde | Netlify → **Logs → Functions** → `whatsapp`; revisa que el *Verify token* y el *App secret* coincidan |
| El gasto de WhatsApp no aparece | Abre la app con la sesión de Google iniciada; el gasto entra al abrirla |

---

## 5. Qué hay en la carpeta

```
finanzas-app/
├─ public/index.html            ← la app (esto es lo que sube a Netlify)
├─ netlify/functions/whatsapp.mjs   ← el webhook de WhatsApp
├─ netlify/lib/parse.mjs        ← entiende "almuerzo 25000" (lo comparten app y WhatsApp)
├─ tools/inject-parser.mjs      ← copia parse.mjs dentro de index.html
├─ firestore.rules              ← reglas de seguridad para pegar en Firebase
├─ netlify.toml, package.json, .gitignore
└─ GUIA-CONFIGURACION.md        ← esta guía
```

Si algún día cambias palabras o categorías en `netlify/lib/parse.mjs`, ejecuta `node tools/inject-parser.mjs` para que la app y WhatsApp sigan entendiendo lo mismo.
