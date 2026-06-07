"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Heart, Bell, Home, Package, Star, ShoppingBag, Menu, ChevronRight, MapPin, TrendingUp, X } from "lucide-react";

// Importaciones de tus componentes (asegúrate de que las rutas coincidan con tus carpetas)
import { ImageWithFallback } from "../components/figma/ImageWithFallback"; 
import viejitoImg from "../imports/IMG_9323.jpeg"; 

const PRODUCTS_YA_LLEGO = [
  { id: 1, name: "Coca-Cola 600 ml", price: "$14.00", img: "https://espacioempresa.com/wp-content/uploads/2022/12/eslogan-de-coca-cola-1140x570.jpg" },
  { id: 2, name: "Sabritas Original", price: "$18.00", img: "https://images.unsplash.com/photo-1613919113640-25732ec5e61f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80" },
  { id: 3, name: "Agua Ciel 1L", price: "$10.00", img: "https://images.unsplash.com/photo-1616118132534-381148898bb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80" },
  { id: 4, name: "Pan Bimbo", price: "$22.00", img: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80" },
];

const PROMOS = [
  { id: 1, name: "Tortilla de Maíz Blanco", desc: "5.4 KG × 3 PZA 312 GR", price: "$281.49", img: "https://images.unsplash.com/photo-1580667268888-bf5c3e40ea08?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80" },
  { id: 2, name: "Galletitas Surtidas", desc: "Caja 12 pzas", price: "$145.00", img: "https://images.unsplash.com/photo-1598839950984-034f6dc7b495?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80" },
  { id: 3, name: "Refresco Manzana", desc: "6 pack 355 ml", price: "$89.00", img: "https://images.unsplash.com/photo-1598038990523-32bcaa29f679?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200&q=80" },
];

const CATEGORIES = [
  { id: 1, label: "Más vendidos", emoji: "⭐" },
  { id: 2, label: "Promos", emoji: "🏷️", active: true },
  { id: 3, label: "Refrescos", emoji: "🥤" },
  { id: 4, label: "Agua", emoji: "💧" },
];

// Clave compartida para persistir el ID del cliente entre páginas (Inicio <-> Plan)
export const CLIENT_ID_STORAGE_KEY = "tuali_client_id";

const NAV_ITEMS = [
  { label: "Inicio", icon: Home },
  { label: "Productos", icon: Package },
  { label: "Gana", icon: Star },
  { label: "Pedidos", icon: ShoppingBag },
  { label: "Menú", icon: Menu },
];

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-gray-900">{title}</span>
        {badge && (
          <span className="text-xs font-semibold bg-orange-500 text-white px-2 py-0.5 rounded-full tracking-wide">
            {badge}
          </span>
        )}
      </div>
      <button className="flex items-center gap-0.5 text-xs font-semibold text-orange-500">
        Ver más <ChevronRight size={13} />
      </button>
    </div>
  );
}

interface ResumenCrecimiento {
  sin_datos: boolean;
  meta?: { monto_actual: number; monto_objetivo: number; porcentaje: number };
  recomendaciones?: { producto: string; razon: string; impacto_estimado: number }[];
}

function AsesorCard({ idCliente }: { idCliente: string }) {
  const router = useRouter();
  const [resumen, setResumen] = useState<ResumenCrecimiento | null>(null);

  useEffect(() => {
    if (!idCliente) {
      setResumen(null);
      return;
    }
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
  const pct = meta?.porcentaje ?? 0;
  const topRecomendacion = resumen?.recomendaciones?.[0];
  const fmt = (n: number) => `$${n.toLocaleString("es-MX")}`;

  return (
    <div className="mx-4 mb-5 rounded-2xl bg-green-50 border border-green-100 overflow-hidden" style={{ boxShadow: "0 2px 12px 0 rgba(0,0,0,0.06)", fontFamily: "'Lora', Georgia, serif" }}>
      <div className="h-1 w-full bg-green-200" />
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
            <TrendingUp size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 leading-tight" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Tu asesor de crecimiento
          </span>
        </div>

        {!idCliente ? (
          <p className="text-sm text-gray-600 mb-1 leading-relaxed" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Ingresa tu ID de cliente (botón naranja arriba) para ver tu meta y recomendaciones basadas en tus pedidos reales.
          </p>
        ) : !meta ? (
          <p className="text-sm text-gray-600 mb-1 leading-relaxed" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Aún no encontramos pedidos para el ID <span className="font-semibold text-gray-900">{idCliente}</span> en la base de datos.
          </p>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500" style={{ fontFamily: "'Lora', Georgia, serif" }}>Meta de crecimiento</span>
                <span className="text-sm" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                  <span className="font-bold text-gray-900">{fmt(meta.monto_actual)}</span>
                  <span style={{ color: "#ca8a04", fontWeight: 700 }}> de {fmt(meta.monto_objetivo)}</span>
                </span>
              </div>
              <div className="w-full h-3 bg-green-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-green-600 font-medium mt-1.5" style={{ fontFamily: "'Lora', Georgia, serif" }}>{pct}% completado</p>
            </div>
            <div className="border-t border-green-100 mb-3" />
            <p className="text-sm text-gray-700 mb-3 leading-relaxed" style={{ fontFamily: "'Lora', Georgia, serif" }}>
              {topRecomendacion ? (
                <>
                  Surte <span className="font-semibold text-gray-900">{topRecomendacion.producto}</span> seguido —{" "}
                  {topRecomendacion.razon.toLowerCase()}.
                </>
              ) : (
                "Sigue registrando pedidos para que detectemos tus productos estrella."
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold whitespace-nowrap border border-green-200" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                {topRecomendacion ? `+$${topRecomendacion.impacto_estimado} est.` : "—"}
              </span>
              <button className="flex-1 bg-orange-500 text-white text-sm font-bold rounded-full py-2 px-4 hover:bg-orange-600 active:scale-95 transition-all" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                Agregar al pedido
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => router.push("/plan")}
          className="w-full flex items-center justify-center gap-1.5 mt-3 rounded-2xl py-2.5 px-4 bg-white active:scale-95 transition-all group"
          style={{ fontFamily: "'Lora', Georgia, serif", boxShadow: "0 0 0 2px #86efac, 0 3px 10px rgba(34,197,94,0.2)" }}
        >
          <span className="text-sm font-bold text-green-700 group-hover:text-green-800 tracking-wide">Ver mi plan completo</span>
          <ChevronRight size={14} className="text-green-500 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// 🤖 ESTE ES EL CHAT CONECTADO A FASTAPI
function ChatHead({ idCliente }: { idCliente: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [historial, setHistorial] = useState([
    { rol: "asesor", texto: "¡Hola! 👋 Soy tu Growth Agent de Tuali. ¿En qué te ayudo con tu tiendita hoy?" }
  ]);

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim()) return;

    const nuevoMensaje = { rol: "usuario", texto: mensaje };
    setHistorial((prev) => [...prev, nuevoMensaje]);
    setMensaje("");
    setCargando(true);

    try {
      // Conexión a tu servidor local de Python
      const respuesta = await fetch("http://127.0.0.1:8000/tuali/growth-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id_cliente: idCliente || "Anónimo",
          meta_negocio: "Aumentar ventas",
          pregunta_o_situacion: nuevoMensaje.texto,
          contexto_externo: "Clima cálido" 
        }), 
      });

      const data = await respuesta.json();
      
      setHistorial((prev) => [...prev, { rol: "asesor", texto: data.recomendacion_tuali }]);
    } catch (error) {
      console.error(error);
      setHistorial((prev) => [...prev, { rol: "asesor", texto: "⚠️ Disculpa, no me pude conectar con el servidor." }]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-[108px] right-14 z-20 w-72"
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ originX: 1, originY: 1 }}
          >
            <div className="bg-white rounded-2xl rounded-br-sm shadow-xl border border-gray-100 p-3.5 relative" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}>
              <button
                onClick={() => setOpen(false)}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={11} className="text-gray-500" />
              </button>

              <div className="flex items-center gap-2 mb-2.5 pr-5">
                <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-green-200 shrink-0">
                  <img src={viejitoImg.src} alt="Asesor" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-none">Tuali Agent</p>
                  <p className="text-[10px] text-green-600 font-medium mt-0.5">● Inteligencia Activa</p>
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto mb-3 pr-1">
                {historial.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`px-3 py-2 text-xs leading-relaxed ${
                      msg.rol === "asesor" 
                        ? "bg-gray-50 rounded-xl rounded-tl-sm text-gray-700 whitespace-pre-line" 
                        : "bg-orange-500 rounded-xl rounded-tr-sm text-white ml-6"
                    }`}
                  >
                    {msg.texto}
                  </div>
                ))}
                {cargando && (
                  <div className="bg-gray-50 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-400">
                    Analizando datos... 📊
                  </div>
                )}
              </div>

              <form onSubmit={enviarMensaje} className="flex gap-2">
                <input
                  type="text"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Pregúntame algo..."
                  className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-orange-500"
                  disabled={cargando}
                />
                <button 
                  type="submit" 
                  disabled={cargando || !mensaje.trim()}
                  className="bg-orange-500 text-white rounded-lg px-2.5 py-2 disabled:bg-gray-300 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </form>

              <div className="absolute -bottom-2 right-3 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="absolute bottom-[64px] right-3 z-20 w-20 h-20 rounded-full overflow-hidden border-[3px] border-white"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        animate={open ? { scale: 1.08 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <img src={viejitoImg.src} alt="Asesor de crecimiento" className="w-full h-full object-cover" />
      </motion.button>
    </>
  );
}

interface ClientIdButtonProps {
  saved: string;
  setSaved: (val: string) => void;
}

function ClientIdButton({ saved, setSaved }: ClientIdButtonProps) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");

  function handleListo() {
    if (clientId.trim()) {
      setSaved(clientId.trim());
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-10 right-0 z-40 w-56 bg-white rounded-2xl p-4"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}
            initial={{ opacity: 0, scale: 0.88, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X size={12} className="text-gray-500" />
            </button>

            <input
              autoFocus
              type="text"
              placeholder="Introduzca su ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleListo()}
              className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 mb-3 mt-1"
            />

            <button
              onClick={handleListo}
              className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold rounded-xl py-2.5 transition-all"
            >
              Listo !
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-full px-4 py-1.5 transition-all whitespace-nowrap"
        style={{ boxShadow: "0 2px 8px rgba(249,115,22,0.35)" }}
      >
        {saved ? `ID: ${saved}` : "ID del Cliente …"}
      </button>
    </div>
  );
}

export default function HomePage() {
  const [activeNav, setActiveNav] = useState(0);
  const [search, setSearch] = useState("");
  const [savedClientId, setSavedClientId] = useState("");

  // Recuperamos el ID guardado (p.ej. al volver desde /plan) y lo persistimos
  // en localStorage para compartirlo entre páginas sin un backend de sesión.
  useEffect(() => {
    const guardado = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (guardado) setSavedClientId(guardado);
  }, []);

  useEffect(() => {
    if (savedClientId) window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, savedClientId);
  }, [savedClientId]);

  return (
    <div className="relative w-full h-full bg-gray-50 flex flex-col">
      <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-white shrink-0">
        <span className="text-xs font-semibold text-gray-900">2:04</span>
        <div className="w-4 h-2.5 border border-gray-800 rounded-sm relative">
          <div className="absolute inset-y-0.5 left-0.5 right-1.5 bg-gray-800 rounded-sm" />
          <div className="absolute right-[-3px] top-[3px] w-[3px] h-1.5 bg-gray-500 rounded-r-sm" />
        </div>
      </div>

      <div className="bg-white px-4 pt-2 pb-4 shrink-0 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-gray-400 mb-0.5">Punto de venta</p>
            <h1 className="text-lg font-bold text-gray-900 leading-snug">Abarrotes Martínez</h1>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={11} className="text-gray-400 shrink-0" />
              <p className="text-xs text-gray-400">Loma la paz, 100, 0, ge...</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart size={16} className="text-gray-500" />
            </button>
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center">
                <Bell size={16} className="text-white" />
              </div>
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">3</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
            <ShoppingBag size={13} className="text-orange-500" />
            <span className="text-xs font-semibold text-gray-700">Pedido</span>
            <span className="text-xs text-gray-400">Editando</span>
            <span className="text-xs font-bold text-gray-900">#2342484</span>
            <ChevronRight size={12} className="text-orange-400" />
          </div>
          <ClientIdButton saved={savedClientId} setSaved={setSavedClientId} />
        </div>
      </div>

      <div className="bg-white px-4 pt-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 flex-1 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 pt-1">
        <AsesorCard idCliente={savedClientId} />

        <div className="px-4 mb-5">
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-colors ${
                  cat.active ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${cat.active ? "bg-orange-100" : "bg-gray-100"}`}>
                  {cat.emoji}
                </div>
                <span className={`text-xs font-medium text-center leading-tight ${cat.active ? "text-orange-600" : "text-gray-500"}`}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <SectionHeader title="YA LLEGÓ" badge="CONAGRA" />
          <div className="flex gap-3 overflow-x-auto px-4 pb-2">
            {PRODUCTS_YA_LLEGO.map((p) => (
              <div key={p.id} className="shrink-0 w-28 bg-white rounded-xl border border-gray-100 p-2.5 shadow-sm">
                <div className="w-full h-20 bg-gray-100 rounded-lg overflow-hidden mb-2.5">
                  <ImageWithFallback src={p.img} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-semibold text-gray-800 leading-tight mb-1">{p.name}</p>
                <p className="text-sm font-bold text-gray-900 mb-2">{p.price}</p>
                <button className="w-full bg-orange-500 text-white text-xs font-bold rounded-lg py-1.5 hover:bg-orange-600 transition-colors">
                  Agregar
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 mb-4">
          <SectionHeader title="Promociones" />
          <div className="flex flex-col gap-2.5">
            {PROMOS.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                  <ImageWithFallback src={p.img} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1.5">{p.price}</p>
                </div>
                <button className="shrink-0 bg-orange-500 text-white text-xs font-bold rounded-xl px-3 py-2 hover:bg-orange-600 transition-colors">
                  Agregar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-2 pt-2 pb-5">
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const isActive = i === activeNav;
          return (
            <button
              key={item.label}
              onClick={() => setActiveNav(i)}
              className="flex flex-col items-center gap-1 min-w-[56px]"
            >
              <Icon size={21} className={isActive ? "text-orange-500" : "text-gray-300"} />
              <span className={`text-xs font-semibold ${isActive ? "text-orange-500" : "text-gray-400"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pasamos el ID de cliente guardado al Chat Head */}
      <ChatHead idCliente={savedClientId} />
    </div>
  );
}