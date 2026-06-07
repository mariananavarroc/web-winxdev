import math
import os

# Usa el almacén de certificados de Windows en vez del bundle de `certifi`:
# en redes corporativas/universitarias con inspección TLS o cadenas de CA
# "atípicas" (p.ej. Cloudflare, que usa Supabase), `certifi` puede rechazar
# el certificado con CERTIFICATE_VERIFY_FAILED aunque el sistema sí confíe en él.
import truststore
truststore.inject_into_ssl()

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from google import genai

# 1. Cargamos el archivo .env donde pusiste tu GEMINI_API_KEY
load_dotenv()

# 2. Ahora sí usamos "os" para traer la llave de forma segura
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# 3. Conexión a Supabase (mismo proyecto y publishable key que usa my-app/.env).
#    Es una clave pública (anon/publishable key), por eso es seguro tener un
#    valor por defecto; se puede sobreescribir con variables de entorno.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xteabjceygdxcstjdqgg.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_hpoYDMdnLAGCB6RXzcxXZQ_JXlW7K3E")
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

app = FastAPI(title="Tuali Growth Agent")

# 🛠️ CONFIGURACIÓN DE CORS: Permite que tu Next.js (puerto 3000) hable con FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TualiContext(BaseModel):
    id_cliente: str
    meta_negocio: str
    pregunta_o_situacion: str
    contexto_externo: str = None


SIN_DATOS = "- Aún no hay pedidos registrados en la base de datos para este cliente."


def _pedidos_del_cliente(id_cliente: str) -> list[dict] | None:
    """Resuelve el id externo (CSV) a un cliente de Supabase y trae sus pedidos
    con los detalles embebidos (join vía PostgREST: total + producto/cantidad
    de cada línea). Devuelve None si el cliente no existe o no tiene pedidos."""
    resp_cliente = requests.get(
        f"{SUPABASE_URL}/rest/v1/customers",
        headers=SUPABASE_HEADERS,
        params={"external_customer_id": f"eq.{id_cliente}", "select": "id"},
        timeout=15,
    )
    resp_cliente.raise_for_status()
    clientes = resp_cliente.json()
    if not clientes:
        return None

    customer_id = clientes[0]["id"]

    resp_pedidos = requests.get(
        f"{SUPABASE_URL}/rest/v1/orders",
        headers=SUPABASE_HEADERS,
        params={
            "customer_id": f"eq.{customer_id}",
            "select": "total,order_details(nombre_sku_solicitado,quantity)",
        },
        timeout=15,
    )
    resp_pedidos.raise_for_status()
    pedidos = resp_pedidos.json()
    return pedidos or None


def _totales(pedidos: list[dict]) -> list[float]:
    # PostgREST puede serializar `numeric` como string para no perder precisión.
    return [float(p["total"]) for p in pedidos if p.get("total") is not None]


def _top_productos(pedidos: list[dict]) -> list[tuple[str, int]]:
    cantidad_por_producto: dict[str, int] = {}
    for pedido in pedidos:
        for detalle in pedido.get("order_details") or []:
            nombre = (detalle.get("nombre_sku_solicitado") or "").strip()
            if not nombre:
                continue
            cantidad_por_producto[nombre] = cantidad_por_producto.get(nombre, 0) + (detalle.get("quantity") or 0)
    return sorted(cantidad_por_producto.items(), key=lambda kv: kv[1], reverse=True)


def obtener_datos_comportamiento(id_cliente: str) -> str:
    """Resumen del historial real del cliente, pensado para que el modelo
    fundamente predicciones y recomendaciones (no para mostrarse tal cual)."""
    pedidos = _pedidos_del_cliente(id_cliente)
    if not pedidos:
        return SIN_DATOS

    totales = _totales(pedidos)
    total_historico = sum(totales)
    ticket_promedio = total_historico / len(totales) if totales else 0

    top_productos = _top_productos(pedidos)[:5]
    productos_texto = (
        "; ".join(
            f"{nombre} (lo ha comprado {veces} {'vez' if veces == 1 else 'veces'})"
            for nombre, veces in top_productos
        )
        if top_productos
        else "sin compras suficientes para detectar un patrón"
    )

    return (
        f"- Pedidos históricos: {len(pedidos)}. Gasto total acumulado: ${total_historico:,.2f} MXN. "
        f"Ticket promedio: ${ticket_promedio:,.2f} MXN.\n"
        f"- Productos que más repite, de más a menos frecuente: {productos_texto}."
    )


@app.post("/tuali/growth-agent")
async def agente_crecimiento(contexto: TualiContext):

    # Datos reales del cliente, leídos en vivo desde Supabase
    datos_comportamiento = obtener_datos_comportamiento(contexto.id_cliente)

    # Súper-Prompt optimizado para el viejito tendero
    instrucciones_tuali = f"""
    Eres el 'Tuali Growth Agent', un asesor de negocios 100% GRATUITO.
    Tu usuario final es un tendero mayor (un viejito) que NO LE GUSTA LEER MUCHO.

    LO QUE TE ACABA DE PREGUNTAR O CONTAR EL TENDERO (responde ESTO de forma
    directa y concreta — es lo más importante, no lo ignores ni cambies de tema):
    "{contexto.pregunta_o_situacion}"

    CONTEXTO ADICIONAL:
    - Meta de negocio: {contexto.meta_negocio}
    - Clima/eventos del día: {contexto.contexto_externo}

    HISTORIAL REAL DE COMPRAS DE ESTE CLIENTE (úsalo para hacer una predicción
    o recomendación fundamentada — NO inventes cifras ni productos que no estén aquí):
    {datos_comportamiento}

    REGLAS:
    1. Responde DIRECTO a lo que pidió o contó el tendero — eso manda. El historial
       es para FUNDAMENTAR tu respuesta (di brevemente el "porqué" usando sus datos
       reales: producto que repite, frecuencia, ticket promedio, etc.), no para
       desviarte hacia otro tema.
    2. NO uses párrafos largos. Usa MÁXIMO 3 viñetas muy cortas.
    3. Usa emojis grandes al inicio de cada línea para que sea muy visual.
    4. Resalta cifras y ganancias estimadas en **negritas**.
    5. Ve directo al grano. Cero saludos largos, cero paja.

    Ejemplo de formato (NO copies el contenido, es solo referencia de estilo):
    💡 **Predicción:** Te vas a quedar sin Coca-Cola esta semana.
    📦 La pides en 9 de cada 10 compras — ten 2 cajas listas desde hoy.
    💰 Si la combinas con una promo, ganas algo extra: **$280 MXN** estimado.
    """
    
    respuesta = client.models.generate_content(
        model='gemini-2.5-flash', # Actualizado al modelo estándar actual
        contents=instrucciones_tuali
    )

    return {
        "recomendacion_tuali": respuesta.text
    }


PRIORIDADES = ["urgent", "recommended", "optional"]
RAZONES_RECOMENDACION = [
    "Es tu producto más comprado — mantenlo siempre en stock",
    "Tus clientes lo piden seguido, no dejes que se agote",
    "Complementa bien tus ventas más frecuentes",
]


@app.get("/tuali/resumen-crecimiento/{id_cliente}")
async def resumen_crecimiento(id_cliente: str):
    """Meta de crecimiento y recomendaciones del 'Plan de Crecimiento',
    calculadas en vivo a partir del historial real de pedidos del cliente
    (las tablas goals/recommendations de Supabase aún no tienen datos)."""
    pedidos = _pedidos_del_cliente(id_cliente)
    if not pedidos:
        return {"sin_datos": True}

    totales = _totales(pedidos)
    total_historico = sum(totales)
    ticket_promedio = total_historico / len(totales) if totales else 0

    # Meta: el siguiente "hito" redondo de mil, al menos 10% por encima de lo
    # que el cliente ya ha generado con Tuali — así la meta crece con el cliente.
    monto_objetivo = max(math.ceil(total_historico * 1.1 / 1000) * 1000, total_historico + 500)
    monto_actual = round(total_historico, 2)
    porcentaje = round(monto_actual / monto_objetivo * 100) if monto_objetivo else 0

    recomendaciones = []
    for i, (nombre, veces) in enumerate(_top_productos(pedidos)[:3]):
        recomendaciones.append({
            "producto": nombre,
            "razon": RAZONES_RECOMENDACION[min(i, len(RAZONES_RECOMENDACION) - 1)],
            "impacto_estimado": round(ticket_promedio * (0.12 - i * 0.03)),
            "prioridad": PRIORIDADES[min(i, len(PRIORIDADES) - 1)],
            "veces_comprado": veces,
        })

    return {
        "sin_datos": False,
        "meta": {
            "monto_actual": monto_actual,
            "monto_objetivo": monto_objetivo,
            "porcentaje": porcentaje,
        },
        "recomendaciones": recomendaciones,
    }