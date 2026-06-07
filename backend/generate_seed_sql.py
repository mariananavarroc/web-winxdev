"""
Genera SQL de importación (muestra representativa) desde los CSV hacia las
tablas de Supabase: customers, orders, order_details, product_substitutions.

Selecciona clientes con >= 2 pedidos (para que el promedio de ticket tenga
sentido) y al menos un pedido con detalle, para que el agente pueda calcular
"top productos".

Genera archivos .sql en ./seed/ listos para aplicar con execute_sql/apply_migration.
"""
import os
import uuid
import pandas as pd

NAMESPACE = uuid.UUID("a7f0c9d2-9e3a-4f1b-8b2e-2f6f0a6d6c10")
N_CUSTOMERS = 60
DETAILS_PER_ORDER_CAP = 4   # limita renglones de detalle por pedido para que el SQL sea manejable
BATCH_SIZE = 400
OUT_DIR = os.path.join(os.path.dirname(__file__), "seed")
os.makedirs(OUT_DIR, exist_ok=True)


def det_uuid(prefix: str, value: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"{prefix}:{value}"))


def esc(value) -> str:
    if pd.isna(value):
        return "NULL"
    return "'" + str(value).replace("'", "''").strip() + "'"


def num(value):
    if pd.isna(value):
        return "NULL"
    return str(value)


def write_sql(filename: str, statements: list[str]):
    path = os.path.join(OUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(statements))
    print(f"-> {path} ({len(statements)} statement(s))")


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
sel_details = (
    df_details[df_details["id_pedido"].isin(sel_orders["id_pedido"])]
    .groupby("id_pedido", group_keys=False)
    .head(DETAILS_PER_ORDER_CAP)
    .copy()
)
sel_subs = df_res[df_res["id_linea"].isin(sel_details["id_linea"])].copy()

print(f"Clientes: {len(chosen_customers)} | Pedidos: {len(sel_orders)} | "
      f"Detalles: {len(sel_details)} | Sustituciones: {len(sel_subs)}")

# --- UUIDs deterministicos (mismo external_id -> mismo UUID siempre) ---
sel_orders["customer_uuid"] = sel_orders["customer_id"].map(lambda v: det_uuid("customer", v))
sel_orders["order_uuid"] = sel_orders["id_pedido"].map(lambda v: det_uuid("order", v))
sel_details["order_uuid"] = sel_details["id_pedido"].map(lambda v: det_uuid("order", v))
sel_details["detail_uuid"] = sel_details["id_linea"].map(lambda v: det_uuid("order_detail", v))
sel_subs["detail_uuid"] = sel_subs["id_linea"].map(lambda v: det_uuid("order_detail", v))
sel_subs["sub_uuid"] = sel_subs["id_linea"].map(lambda v: det_uuid("product_substitution", v))

# ---------------------------------------------------------------- customers
customers = sel_orders.drop_duplicates("customer_id")[["customer_uuid", "customer_id", "pais"]]
rows = [
    f"({esc(r.customer_uuid)}::uuid, {esc(r.customer_id)}, {esc(r.pais)})"
    for r in customers.itertuples(index=False)
]
stmts = [
    "insert into public.customers (id, external_customer_id, pais) values\n"
    + ",\n".join(rows)
    + "\non conflict (external_customer_id) do nothing;"
]
write_sql("01_customers.sql", stmts)

# ------------------------------------------------------------------ orders
rows = []
for r in sel_orders.itertuples(index=False):
    rows.append(
        "(" + ", ".join([
            f"{esc(r.order_uuid)}::uuid",
            esc(r.id_pedido),
            f"{esc(r.customer_uuid)}::uuid",
            esc(r.pais),
            esc(r.id_businessunit),
            esc(r.business_unit),
            esc(r.cedis),
            esc(r.fecha_pedido),
            esc(r.fecha_entrega),
            esc(r.status_final),
            num(r.valor_pedido),
            num(r.SubTotal),
            num(r.Total),
        ]) + ")"
    )
ORDERS_BATCH = 80
stmts = []
for i in range(0, len(rows), ORDERS_BATCH):
    batch = rows[i:i + ORDERS_BATCH]
    stmts.append(
        "insert into public.orders (id, external_order_id, customer_id, pais, id_businessunit, "
        "business_unit, cedis, fecha_pedido, fecha_entrega, status_final, valor_pedido, subtotal, total) values\n"
        + ",\n".join(batch)
        + "\non conflict (id) do nothing;"
    )
write_sql("02_orders.sql", stmts)

# ---------------------------------------------------------- order_details (batched)
rows = []
for r in sel_details.itertuples(index=False):
    rows.append(
        "(" + ", ".join([
            f"{esc(r.detail_uuid)}::uuid",
            esc(r.id_linea),
            f"{esc(r.order_uuid)}::uuid",
            esc(r.sku_solicitado),
            esc(r.nombre_sku_solicitado),
            num(r.Quantity),
            esc(r.Status),
        ]) + ")"
    )

stmts = []
for i in range(0, len(rows), BATCH_SIZE):
    batch = rows[i:i + BATCH_SIZE]
    stmts.append(
        "insert into public.order_details (id, external_line_id, order_id, sku_solicitado, "
        "nombre_sku_solicitado, quantity, status) values\n"
        + ",\n".join(batch)
        + "\non conflict (id) do nothing;"
    )
write_sql("03_order_details.sql", stmts)

# ---------------------------------------------------- product_substitutions
rows = []
for r in sel_subs.itertuples(index=False):
    rows.append(
        "(" + ", ".join([
            f"{esc(r.sub_uuid)}::uuid",
            esc(r.id_businessunit),
            esc(r.id_linea),
            f"{esc(r.detail_uuid)}::uuid",
            esc(r.sku_solicitado),
            esc(r.sku_solicitado_hash),
            esc(r.nombre_sku_solicitado),
            esc(r.sku_solicitado_cambio),
            esc(r.sku_solicitado_cambio_hash),
            esc(r.nombre_sku_solicitado_cambio),
        ]) + ")"
    )
if rows:
    stmts = [
        "insert into public.product_substitutions (id, id_businessunit, external_line_id, order_detail_id, "
        "sku_solicitado, sku_solicitado_hash, nombre_sku_solicitado, sku_solicitado_cambio, "
        "sku_solicitado_cambio_hash, nombre_sku_solicitado_cambio) values\n"
        + ",\n".join(rows)
        + "\non conflict (id) do nothing;"
    ]
    write_sql("04_product_substitutions.sql", stmts)

print("Listo.")
