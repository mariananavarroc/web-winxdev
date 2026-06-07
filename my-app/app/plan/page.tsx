"use client"; // 1. Clave para indicarle a Next.js que este componente usa interactividad en el navegador

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // 2. Cambiado desde 'react-router'
import { ArrowLeft, TrendingUp, Package, DollarSign, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { CLIENT_ID_STORAGE_KEY } from "../page";

interface Recomendacion {
  producto: string;
  razon: string;
  impacto_estimado: number;
  prioridad: "urgent" | "recommended" | "optional";
  veces_comprado: number;
}

interface ResumenCrecimiento {
  sin_datos: boolean;
  meta?: { monto_actual: number; monto_objetivo: number; porcentaje: number };
  recomendaciones?: Recomendacion[];
}

export default function PlanPage() {
  const router = useRouter(); // 3. Inicializamos el router nativo de Next.js
  const [idCliente, setIdCliente] = useState("");
  const [resumen, setResumen] = useState<ResumenCrecimiento | null>(null);

  useEffect(() => {
    const guardado = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (guardado) setIdCliente(guardado);
  }, []);

  useEffect(() => {
    if (!idCliente) return;
    let cancelado = false;
    fetch(`http://127.0.0.1:8000/tuali/resumen-crecimiento/${encodeURIComponent(idCliente)}`)
      .then((r) => r.json())
      .then((data: ResumenCrecimiento) => !cancelado && setResumen(data))
      .catch(() => !cancelado && setResumen(null));
    return () => {
      cancelado = true;
    };
  }, [idCliente]);

  const meta = resumen?.meta;
  const recomendaciones = resumen?.recomendaciones ?? [];
  const pct = meta?.porcentaje ?? 0;
  const restante = meta ? Math.max(meta.monto_objetivo - meta.monto_actual, 0) : 0;
  const totalImpacto = recomendaciones.reduce((sum, item) => sum + item.impacto_estimado, 0);
  const fmt = (n: number) => `$${n.toLocaleString("es-MX")}`;

  return (
    <div className="relative w-full h-full bg-gray-50 flex flex-col">
      {/* Barra de estado */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-white shrink-0">
        <span className="text-xs font-semibold text-gray-900">2:04</span>
        <div className="w-4 h-2.5 border border-gray-800 rounded-sm relative">
          <div className="absolute inset-y-0.5 left-0.5 right-1.5 bg-gray-800 rounded-sm" />
          <div className="absolute right-[-3px] top-[3px] w-[3px] h-1.5 bg-gray-500 rounded-r-sm" />
        </div>
      </div>

      {/* Encabezado */}
      <div className="bg-white px-4 pt-3 pb-4 shrink-0 border-b border-gray-100">
        <button
          onClick={() => router.push("/")} // 4. Cambiado de navigate("/") a router.push("/")
          className="flex items-center gap-2 mb-3 group"
        >
          <ArrowLeft size={18} className="text-gray-500 group-hover:text-gray-700 transition-colors" />
          <span className="text-sm font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">Volver</span>
        </button>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Lora', Georgia, serif" }}>
              Plan de Crecimiento
            </h1>
            <p className="text-xs text-gray-500">Personalizado para ti</p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto pb-6">
        {!idCliente ? (
          <div className="mx-4 mt-5 mb-5 rounded-2xl bg-gray-50 border border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-600 leading-relaxed">
              Ingresa tu ID de cliente desde la pantalla de Inicio para ver tu plan de crecimiento, calculado a partir de tus pedidos reales.
            </p>
          </div>
        ) : !meta ? (
          <div className="mx-4 mt-5 mb-5 rounded-2xl bg-gray-50 border border-gray-200 p-5 text-center">
            <p className="text-sm text-gray-600 leading-relaxed">
              Aún no encontramos pedidos para el ID <span className="font-semibold text-gray-900">{idCliente}</span> en la base de datos.
            </p>
          </div>
        ) : (
          <>
            {/* Resumen de meta */}
            <div className="mx-4 mt-5 mb-5 rounded-2xl bg-green-50 border border-green-100 p-5" style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.06)", fontFamily: "'Lora', Georgia, serif" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Meta de crecimiento</span>
                <span className="text-lg">
                  <span className="font-bold text-gray-900">{fmt(meta.monto_actual)}</span>
                  <span style={{ color: "#ca8a04", fontWeight: 700 }}> / {fmt(meta.monto_objetivo)}</span>
                </span>
              </div>
              <div className="w-full h-4 bg-green-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-green-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Restante</p>
                  <p className="text-base font-bold text-gray-900">{fmt(restante)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Potencial</p>
                  <p className="text-base font-bold text-green-600">+${totalImpacto}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">Progreso</p>
                  <p className="text-base font-bold text-gray-900">{pct}%</p>
                </div>
              </div>
            </div>

            {/* Resumen del plan */}
            <div className="px-4 mb-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar size={14} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 mb-1">Plan basado en tu historial</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Surtiendo seguido tus productos más vendidos podrías generar <span className="font-bold text-blue-600">+${totalImpacto}</span> adicionales y acercarte a tu meta.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de recomendaciones */}
            <div className="px-4">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Package size={16} className="text-gray-500" />
                Recomendaciones personalizadas
              </h2>
              {recomendaciones.length === 0 ? (
                <p className="text-xs text-gray-500">Sigue registrando pedidos para que detectemos tus productos estrella.</p>
              ) : (
                <div className="space-y-3">
                  {recomendaciones.map((item) => (
                    <div
                      key={item.producto}
                      className="bg-white rounded-xl border border-gray-100 p-4"
                      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
                    >
                      {/* Cabecera */}
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-900">{item.producto}</p>
                            {item.prioridad === "urgent" && (
                              <AlertCircle size={14} className="text-orange-500" />
                            )}
                            {item.prioridad === "recommended" && (
                              <CheckCircle2 size={14} className="text-green-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{item.razon}</p>
                        </div>
                      </div>

                      {/* Detalles */}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <DollarSign size={13} className="text-green-600" />
                          <span className="text-xs font-bold text-green-600">+${item.impacto_estimado} est.</span>
                        </div>
                        <div className="h-3 w-px bg-gray-200" />
                        <div className="flex items-center gap-1.5">
                          <Package size={13} className="text-gray-400" />
                          <span className="text-xs font-medium text-gray-600">Comprado {item.veces_comprado}x</span>
                        </div>
                        <div className="flex-1" />
                        <button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg px-3 py-1.5 transition-colors">
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nota final */}
            <div className="px-4 mt-5 mb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-600 leading-relaxed text-center">
                  💡 <span className="font-semibold">Tip:</span> Estas recomendaciones se calculan a partir de tu propio historial de pedidos en Tuali.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}