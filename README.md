# Tuali Growth Agent

Aplicación de la "tienda Tuali": un punto de venta (Next.js) con un **asesor de
crecimiento impulsado por IA** (FastAPI + Google Gemini) que da predicciones y
recomendaciones a partir del **historial real de compras** del cliente,
almacenado en **Supabase** (Postgres).

## Arquitectura

```
┌──────────────────┐        HTTP (REST)        ┌───────────────────────┐
│   Next.js 16     │ ───────────────────────▶  │   FastAPI (Python)    │
│   my-app/        │ ◀─────────────────────── │   backend/main.py     │
│  (puerto 3000)   │     /tuali/growth-agent   │  (puerto 8000)        │
│                  │  /tuali/resumen-crecimiento│  "Tuali Growth Agent" │
└────────┬─────────┘                            └──────────┬────────────┘
         │                                                  │
         │  @supabase/ssr (publishable key)                │ REST/PostgREST
         │                                                  │ (publishable key)
         ▼                                                  ▼
                         ┌────────────────────────────────────┐
                         │     Supabase (Postgres + REST)     │
                         │  customers · orders · order_details│
                         │  product_substitutions · goals ·   │
                         │  recommendations · conversations…  │
                         └────────────────────────────────────┘
                                          ▲
                                          │ Gemini 2.5 Flash
                                          │ (recomendaciones en lenguaje natural)
                                   ┌──────┴──────┐
                                   │ Google Gemini│
                                   └─────────────┘
```

- **Frontend** (`my-app/`): Next.js 16 + React 19 + Tailwind. Es el punto de
  venta del tendero: catálogo, "Tu asesor de crecimiento" y "Plan de
  Crecimiento" (`/plan`), y un chat flotante conectado al agente.
- **Backend** (`backend/`): FastAPI. Expone el agente de IA (Gemini) y un
  endpoint que calcula metas/recomendaciones **en vivo** a partir de los
  pedidos reales del cliente en Supabase (no usa datos inventados ni CSVs en
  producción).
- **Base de datos**: Supabase (Postgres). El backend y el frontend leen los
  datos vía la API REST de Supabase (PostgREST) usando la `publishable key`
  (clave pública/anon — segura para exponer en cliente).

## Estructura del proyecto

```
web-winxdev/
├── my-app/                  # Frontend Next.js
│   ├── app/
│   │   ├── page.tsx         # Pantalla principal (catálogo, asesor, chat)
│   │   ├── plan/page.tsx    # "Plan de Crecimiento"
│   │   └── utils/supabase/  # Clientes de Supabase (browser/server/middleware)
│   └── .env                 # Credenciales públicas de Supabase
└── backend/                 # Backend FastAPI ("Tuali Growth Agent")
    ├── main.py              # API: /tuali/growth-agent y /tuali/resumen-crecimiento
    ├── .env                 # GEMINI_API_KEY (y opcionalmente SUPABASE_*)
    ├── generate_seed_sql.py # Genera SQL de muestra desde los CSV originales
    ├── seed_to_supabase.py  # (alternativa) carga directa vía API REST
    └── seed/*.sql           # SQL de importación ya generado/aplicado
```

## Requisitos previos

- **Node.js** 18+ y **npm**
- **Python** 3.10+ y **pip**
- Una **clave de API de Google Gemini** ([Google AI Studio](https://aistudio.google.com/))
- Acceso al proyecto de **Supabase** "Tuali" (las credenciales públicas ya
  están incluidas/por defecto, ver sección de variables de entorno)

## Puesta en marcha

Necesitas **dos terminales abiertas a la vez** — el backend y el frontend
corren como procesos independientes.

### 1. Backend (FastAPI + agente)

```bash
cd backend
pip install -r requirements.txt   # o instala manualmente: fastapi uvicorn python-dotenv requests google-genai truststore
```

Crea un archivo `backend/.env` con tu clave de Gemini:

```
GEMINI_API_KEY=tu_clave_de_gemini_aqui
```

> Las credenciales de Supabase tienen un valor por defecto en `main.py`
> (son la `publishable key` pública del proyecto, segura de exponer). Si
> necesitas usar otro proyecto, puedes sobreescribirlas con `SUPABASE_URL`
> y `SUPABASE_KEY` en este mismo `.env`.

Levanta el servidor:

```bash
python -m uvicorn main:app --reload --port 8000
```

Debe quedar escuchando en `http://127.0.0.1:8000` — **mantén esta terminal
abierta** mientras usas la app.

### 2. Frontend (Next.js)

En otra terminal:

```bash
cd my-app
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### 3. Probarlo con datos reales

En la pantalla de inicio, toca el botón naranja **"ID del Cliente…"** e
ingresa un ID de cliente que ya tenga pedidos cargados en Supabase, por
ejemplo:

```
1.31045E+18
6.60046E+18
5.18361E+17
```

Verás:
- **"Tu asesor de crecimiento"**: meta de crecimiento y recomendación
  calculadas en vivo desde los pedidos reales del cliente.
- **"Ver mi plan completo"** (`/plan`): meta detallada + tarjetas de
  recomendación con productos reales, frecuencia de compra e impacto
  estimado.
- **Chat flotante**: el agente (Gemini) responde directo a lo que le
  preguntes, fundamentando su predicción/consejo en el historial real de
  compras del cliente (productos que repite, ticket promedio, gasto total).

## Variables de entorno

| Archivo            | Variable                            | Descripción                                                   |
|--------------------|-------------------------------------|---------------------------------------------------------------|
| `backend/.env`     | `GEMINI_API_KEY`                    | **Requerida.** Clave de la API de Google Gemini.              |
| `backend/.env`     | `SUPABASE_URL` / `SUPABASE_KEY`     | Opcionales — sobreescriben los valores por defecto del proyecto Supabase "Tuali". |
| `my-app/.env`      | `NEXT_PUBLIC_SUPABASE_URL`          | URL del proyecto Supabase.                                    |
| `my-app/.env`      | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon/publishable) de Supabase.              |

## Endpoints del backend

| Método | Ruta                                       | Descripción                                                                 |
|--------|--------------------------------------------|------------------------------------------------------------------------------|
| `POST` | `/tuali/growth-agent`                      | Recibe `id_cliente`, `meta_negocio`, `pregunta_o_situacion`, `contexto_externo`; devuelve una recomendación generada por Gemini, fundamentada en el historial real del cliente. |
| `GET`  | `/tuali/resumen-crecimiento/{id_cliente}`  | Devuelve `meta` (monto actual/objetivo/%) y `recomendaciones` calculadas a partir del historial real de pedidos (sin llamar a Gemini). |

## Solución de problemas

**"Failed to fetch" en el navegador**
El frontend no puede conectarse al backend. Verifica que `uvicorn` esté
corriendo en el puerto 8000 (`netstat -ano | findstr :8000` en Windows) y que
no lo hayas cerrado con `Ctrl+C`.

**`WinError 10013` al iniciar uvicorn**
El puerto 8000 ya está en uso por otro proceso (a veces queda un `python.exe`
colgado de una corrida anterior). Ciérralo desde el Administrador de tareas o
con `taskkill /F /PID <pid>` (encuéntralo con `netstat -ano | findstr :8000`),
o arranca el backend en otro puerto: `--port 8001` (y actualiza la URL en
`my-app/app/page.tsx` y `my-app/app/plan/page.tsx`).

**`Disallowed CORS origin`**
El backend solo acepta peticiones desde `http://localhost:3000` y
`http://127.0.0.1:3000`. Asegúrate de abrir el frontend con una de esas dos
URLs.

**`CERTIFICATE_VERIFY_FAILED: Basic Constraints of CA cert not marked critical`**
En algunas redes (universitarias/corporativas con inspección TLS), Python no
logra validar el certificado de Supabase/Cloudflare con el bundle de
`certifi`. El backend ya incluye `truststore`, que usa el almacén de
certificados de Windows en su lugar — asegúrate de tenerlo instalado
(`pip install truststore`).

**`Module not found: lucide-react` / `framer-motion`**
Las dependencias están en `package.json` pero no se instalaron. Corre
`npm install` en `my-app/`. Si falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
(mismo problema de certificados, pero del lado de Node), usa:
`NODE_OPTIONS="--use-system-ca" npm install`.

## Notas sobre los datos

- Los IDs de cliente y pedido son números de ~18 dígitos que, al venir de un
  origen que los trató como `float64` (Excel/CSV), perdieron precisión y
  quedaron en notación científica (p. ej. `1.31045E+18`). Esto es así en el
  origen de datos y se preserva tal cual en Supabase — por eso los IDs de
  prueba se ven así.
- Las tablas `goals` y `recommendations` existen en el esquema de Supabase
  pero aún no tienen datos cargados; por eso la meta de crecimiento y las
  recomendaciones del "Plan de Crecimiento" se **calculan en vivo** a partir
  del historial real de `orders`/`order_details` (ver
  `resumen_crecimiento` en `backend/main.py`), en vez de leerse de esas
  tablas.
- **Seguridad / RLS**: actualmente Row Level Security está deshabilitado en
  las tablas de Supabase (exposición total a la `anon key`). Antes de llevar
  esto a producción, define políticas de RLS apropiadas y habilítalas — no se
  hizo automáticamente para evitar bloquear el acceso sin políticas listas.
