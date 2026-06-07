"""
Importa una muestra representativa de los CSV (Orders/OrderDetails/Resultados)
a las tablas de Supabase (customers, orders, order_details, product_substitutions)
usando la API REST (PostgREST) con la publishable key del frontend.

No requiere credenciales de base de datos: usa el mismo "anon key" que ya usa
my-app/.env. RLS está deshabilitado en estas tablas, así que el insert funciona.
"""
import os
import uuid
import math
import requests
import pandas as pd

SUPABASE_URL = "https://xteabjceygdxcstjdqgg.supabase.co"
SUPABASE_KEY = "sb_publishable_hpoYDMdnLAGCB6RXzcxXZQ_JXlW7K3E"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates,return=minimal",
}

NAMESPACE = uuid.UUID("a7f0c9d2-9e3a-4f1b-8b2e-2f6f0a6d6c10")
N_CUSTOMERS = 100
BATCH_SIZE = 1000


def det_uuid(prefix: str, value: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"{prefix}:{value}"))


def clean(value):
    if value is None:
        return None
    try:
        if isinstance(value, float) and math.isnan(value):
            return None
    except TypeError:
        pass
    if pd.isna(value):
        return None
    return value


def post_batch(table: str, rows: list[dict], on_conflict: str):
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={on_conflict}"
    for i in range(0, len(rows), BATCH_SIZE):
        chunk = rows[i:i + BATCH_SIZE]
        resp = requests.post(url, headers=HEADERS, json=chunk, timeout=120)
        if resp.status_code not in (200, 201, 204):
            raise RuntimeError(f"{table} batch {i}: {resp.status_code} {resp.text[:500]}")
        print(f"  {table}: insertados {i + len(chunk)}/{len(rows)}")


print("Cargando CSVs...")
df_orders = pd.read_csv("Orders.csv", dtype={"id_pedido": str, "customer_id": str})
df_details = pd.read_csv("OrderDetails.csv", dtype={"id_pedido": str, "id_linea": str})
df_res = pd.read_csv("Resultados.csv", dtype={"id_pedido": str, "id_linea": str})

orders_with_details = set(df_details["id_pedido"].unique())
df_orders["has_details"] = df_orders["id_pedido"].isin(orders_with_details)

grp = df_orders.groupby("customer_id").agg(
    n_orders=("id_pedido", "count"), n_detailed=("has_details", "sum")
)
candidates = grp[(grp["n_orders"] >= 2) & (grp["n_detailed"] >= 1)].sort_values(
    "n_orders", ascending=False
)
chosen_customers = candidates.head(N_CUSTOMERS).index

sel_orders = df_orders[df_orders["customer_id"].isin(chosen_customers)].copy()
sel_details = df_details[df_details["id_pedido"].isin(sel_orders["id_pedido"])].copy()
sel_subs = df_res[df_res["id_linea"].isin(sel_details["id_linea"])].copy()

print(f"Clientes: {len(chosen_customers)} | Pedidos: {len(sel_orders)} | "
      f"Detalles: {len(sel_details)} | Sustituciones: {len(sel_subs)}")

sel_orders["customer_uuid"] = sel_orders["customer_id"].map(lambda v: det_uuid("customer", v))
sel_orders["order_uuid"] = sel_orders["id_pedido"].map(lambda v: det_uuid("order", v))
sel_details["order_uuid"] = sel_details["id_pedido"].map(lambda v: det_uuid("order", v))
sel_details["detail_uuid"] = sel_details["id_linea"].map(lambda v: det_uuid("order_detail", v))
sel_subs["detail_uuid"] = sel_subs["id_linea"].map(lambda v: det_uuid("order_detail", v))
sel_subs["sub_uuid"] = sel_subs["id_linea"].map(lambda v: det_uuid("product_substitution", v))

# ---------------------------------------------------------------- customers
customers_df = sel_orders.drop_duplicates("customer_id")
customers_rows = [
    {
        "id": r.customer_uuid,
        "external_customer_id": r.customer_id,
        "pais": clean(r.pais),
    }
    for r in customers_df.itertuples(index=False)
]
print("Importando customers...")
post_batch("customers", customers_rows, on_conflict="external_customer_id")

# ------------------------------------------------------------------ orders
orders_rows = [
    {
        "id": r.order_uuid,
        "external_order_id": r.id_pedido,
        "customer_id": r.customer_uuid,
        "pais": clean(r.pais),
        "id_businessunit": clean(r.id_businessunit),
        "business_unit": clean(r.business_unit),
        "cedis": clean(r.cedis),
        "fecha_pedido": clean(r.fecha_pedido),
        "fecha_entrega": clean(r.fecha_entrega),
        "status_final": clean(r.status_final),
        "valor_pedido": clean(r.valor_pedido),
        "subtotal": clean(r.SubTotal),
        "total": clean(r.Total),
    }
    for r in sel_orders.itertuples(index=False)
]
print("Importando orders...")
post_batch("orders", orders_rows, on_conflict="id")

# ---------------------------------------------------------- order_details
details_rows = [
    {
        "id": r.detail_uuid,
        "external_line_id": r.id_linea,
        "order_id": r.order_uuid,
        "sku_solicitado": clean(r.sku_solicitado),
        "nombre_sku_solicitado": clean(r.nombre_sku_solicitado),
        "quantity": clean(r.Quantity),
        "status": clean(r.Status),
    }
    for r in sel_details.itertuples(index=False)
]
print("Importando order_details...")
post_batch("order_details", details_rows, on_conflict="id")

# ---------------------------------------------------- product_substitutions
subs_rows = [
    {
        "id": r.sub_uuid,
        "id_businessunit": clean(r.id_businessunit),
        "external_line_id": r.id_linea,
        "order_detail_id": r.detail_uuid,
        "sku_solicitado": clean(r.sku_solicitado),
        "sku_solicitado_hash": clean(r.sku_solicitado_hash),
        "nombre_sku_solicitado": clean(r.nombre_sku_solicitado),
        "sku_solicitado_cambio": clean(r.sku_solicitado_cambio),
        "sku_solicitado_cambio_hash": clean(r.sku_solicitado_cambio_hash),
        "nombre_sku_solicitado_cambio": clean(r.nombre_sku_solicitado_cambio),
    }
    for r in sel_subs.itertuples(index=False)
]
print("Importando product_substitutions...")
post_batch("product_substitutions", subs_rows, on_conflict="id")

print("Listo.")
