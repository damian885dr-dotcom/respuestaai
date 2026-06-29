# Respuesta Pro AI Backend

Backend seguro para usar Gemini desde la app Android sin poner la API key dentro del APK. Esta version usa Node.js, Express y `fetch` nativo de Node 20, ideal para Render Free porque tiene pocas dependencias.

## 1. Crear API key en Google AI Studio

1. Entra a Google AI Studio.
2. Crea una API key para Gemini.
3. Guarda esa clave para cargarla luego como variable de entorno en Render.

## 2. Crear cuenta en Render

1. Entra a Render y crea una cuenta.
2. Conecta tu cuenta de GitHub.

## 3. Subir el backend a GitHub

1. Sube la carpeta `backend/` a un repositorio.
2. No subas archivos `.env` con claves reales.
3. Usa `.env.example` solo como referencia.

## 4. Crear Web Service en Render

1. New > Web Service.
2. Elegi el repositorio donde subiste el backend.
3. Runtime: Node.
4. Build command: `npm install`.
5. Start command: `npm start`.

## 5. Variables de entorno

Configura estas variables en Render:

- `GEMINI_API_KEY`: tu clave de Google AI Studio.
- `GEMINI_MODEL`: `gemini-2.5-flash-lite` o el modelo Gemini que quieras usar.
- `GEMINI_TIMEOUT_MS`: `55000` recomendado para cortar llamadas lentas.

## 6. Probar

Health:

```bash
curl https://tu-app.onrender.com/health
```

Generar respuesta:

```bash
curl -X POST https://tu-app.onrender.com/api/generate-reply \
  -H "Content-Type: application/json" \
  -d "{\"customerMessage\":\"Hola, cuanto sale arreglar una tele?\",\"category\":\"Tecnico / Reparacion\",\"tone\":\"Profesional\",\"businessName\":\"Servicio Tecnico Damian\",\"signature\":\"Damian\",\"extraContext\":\"Trabajo con reparacion de televisores\",\"action\":\"generate\"}"
```

Respuesta esperada:

```json
{
  "reply": "Hola, como estas? Para pasarte un presupuesto correcto..."
}
```

## 7. Poner la URL en la app Android

En Ajustes, pega solo la URL base:

```text
https://tu-app.onrender.com
```

La app llama automaticamente a:

```text
https://tu-app.onrender.com/api/generate-reply
```

## Nota Render Free

En Render Free el servicio puede dormirse despues de un tiempo sin uso. La primera respuesta puede tardar mas. La app Android tiene modo demo local como respaldo.

Consejos para Render Free:

- No pongas la API key en el codigo ni en GitHub.
- Configura `GEMINI_API_KEY` solo en Environment de Render.
- La primera llamada despues de estar dormido puede tardar.
- Si Gemini tarda demasiado, el backend corta por timeout y devuelve JSON de error.
- La app Android debe usar la URL base, por ejemplo `https://tu-app.onrender.com`.
