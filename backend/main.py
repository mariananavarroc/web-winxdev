import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from google import genai

# 1. Cargamos el archivo .env donde pusiste tu GEMINI_API_KEY
load_dotenv()

# 2. Ahora sí usamos "os" para traer la llave de forma segura
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

app = FastAPI(title="Tuali Growth Agent")

# 🛠️ CONFIGURACIÓN DE CORS: Permite que tu Next.js (puerto 3000) hable con FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargamos tus 3 archivos de datos
df_orders = pd.read_csv('Orders.csv')
df_resultados = pd.read_csv('Resultados.csv')
df_order_details = pd.read_csv('OrderDetails.csv') 

class TualiContext(BaseModel):
    id_cliente: str
    meta_negocio: str              
    pregunta_o_situacion: str       
    contexto_externo: str = None    

@app.post("/tuali/growth-agent")
async def agente_crecimiento(contexto: TualiContext):
    
    # Simulación de cálculos duros con tus CSVs cargados
    datos_comportamiento = f"- El ticket promedio actual del cliente es $150 MXN.\n- Top ventas recientes: Refrescos y Botanas."

    # Súper-Prompt optimizado para el viejito tendero
    instrucciones_tuali = f"""
    Eres el 'Tuali Growth Agent', un asesor de negocios 100% GRATUITO.
    Tu usuario final es un tendero mayor (un viejito) que NO LE GUSTA LEER MUCHO.
    
    META: {contexto.meta_negocio}
    SITUACIÓN: {contexto.pregunta_o_situacion}
    CLIMA/EVENTOS: {contexto.contexto_externo}
    DATOS: {datos_comportamiento}
    
    REGLAS ESTRICTAS DE FORMATO:
    1. NO uses párrafos largos. Usa MÁXIMO 3 viñetas muy cortas.
    2. Usa emojis grandes al inicio de cada línea para que sea muy visual.
    3. Resalta las ganancias estimadas en **negritas**.
    4. Ve directo al grano. Cero saludos largos, cero paja.
    5. Recomienda solo 1 acción específica de Tuali (Promos, PS, Loyalty o Cupones).
    
    Ejemplo de cómo debes responder:
    💡 **Asesoría Gratis:**
    ☀️ ¡Aprovecha el calor de hoy!
    📦 Arma un combo: Ciel + Refresco estancado.
    💰 Ganancia extra estimada: **$350 MXN**.
    """
    
    respuesta = client.models.generate_content(
        model='gemini-2.5-flash', # Actualizado al modelo estándar actual
        contents=instrucciones_tuali
    )

    return {
        "recomendacion_tuali": respuesta.text
    }