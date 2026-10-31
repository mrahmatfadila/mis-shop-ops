import { NextResponse } from "next/server";
import { db, initDb } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = parseInt(params.id, 10);
    const body = await request.json();

    const {
      po_number,
      item_name,
      category,
      target_location,
      quantity,
      unit,
      estimated_price,
      total_price,
      vendor,
      request_date,
      purchase_date,
      received_date,
      requester,
      status,
      priority,
      notes,
      component_type,
      serial_number,
      target_pos_code,
      installed_pos_code,
      installed_at,
      installed_by,
      capex_number,
      brand_model,
      item_price,
      store_type,
      store_name,
      store_link,
      invoice_url,
      arrival_date,
      shipped_to_t3_date,
      shipping_courier,
      received_by_t3_at,
      manager_approved_at,
      manager_approved_by,
      manager_notes,
    } = body;

    const calcTotal =
      total_price !== undefined
        ? total_price
        : (quantity ? Number(quantity) : 1) * (item_price !== undefined ? Number(item_price) : estimated_price ? Number(estimated_price) : 0);

    await db.execute({
      sql: `UPDATE purchases SET
              po_number = COALESCE(?, po_number),
              item_name = COALESCE(?, item_name),
              category = COALESCE(?, category),
              target_location = COALESCE(?, target_location),
              quantity = COALESCE(?, quantity),
              unit = COALESCE(?, unit),
              estimated_price = COALESCE(?, estimated_price),
              total_price = COALESCE(?, total_price),
              vendor = COALESCE(?, vendor),
              request_date = COALESCE(?, request_date),
              purchase_date = COALESCE(?, purchase_date),
              received_date = COALESCE(?, received_date),
              requester = COALESCE(?, requester),
              status = COALESCE(?, status),
              priority = COALESCE(?, priority),
              notes = COALESCE(?, notes),
              component_type = COALESCE(?, component_type),
              serial_number = COALESCE(?, serial_number),
              target_pos_code = COALESCE(?, target_pos_code),
              installed_pos_code = COALESCE(?, installed_pos_code),
              installed_at = COALESCE(?, installed_at),
              installed_by = COALESCE(?, installed_by),
              capex_number = COALESCE(?, capex_number),
              brand_model = COALESCE(?, brand_model),
              item_price = COALESCE(?, item_price),
              store_type = COALESCE(?, store_type),
              store_name = COALESCE(?, store_name),
              store_link = COALESCE(?, store_link),
              invoice_url = COALESCE(?, invoice_url),
              arrival_date = COALESCE(?, arrival_date),
              shipped_to_t3_date = COALESCE(?, shipped_to_t3_date),
              shipping_courier = COALESCE(?, shipping_courier),
              received_by_t3_at = COALESCE(?, received_by_t3_at),
              manager_approved_at = COALESCE(?, manager_approved_at),
              manager_approved_by = COALESCE(?, manager_approved_by),
              manager_notes = COALESCE(?, manager_notes),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        po_number ?? null,
        item_name ?? null,
        category ?? null,
        target_location ?? null,
        quantity !== undefined && quantity !== null ? Number(quantity) : null,
        unit ?? null,
        estimated_price !== undefined && estimated_price !== null ? Number(estimated_price) : null,
        total_price !== undefined && total_price !== null
          ? Number(total_price)
          : quantity !== undefined || item_price !== undefined || estimated_price !== undefined
          ? calcTotal
          : null,
        vendor ?? null,
        request_date ?? null,
        purchase_date ?? null,
        received_date ?? null,
        requester ?? null,
        status ?? null,
        priority ?? null,
        notes ?? null,
        component_type ?? null,
        serial_number ?? null,
        target_pos_code ?? null,
        installed_pos_code ?? null,
        installed_at ?? null,
        installed_by ?? null,
        capex_number ?? null,
        brand_model ?? null,
        item_price !== undefined && item_price !== null ? Number(item_price) : null,
        store_type ?? null,
        store_name ?? null,
        store_link ?? null,
        invoice_url ?? null,
        arrival_date ?? null,
        shipped_to_t3_date ?? null,
        shipping_courier ?? null,
        received_by_t3_at ?? null,
        manager_approved_at ?? null,
        manager_approved_by ?? null,
        manager_notes ?? null,
        id,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Data pembelian berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Error updating purchase:", error);
    return jsonError(error, "Failed to update purchase");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await initDb();
    const id = parseInt(params.id, 10);

    await db.execute({
      sql: "DELETE FROM purchases WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Data pembelian berhasil dihapus.",
    });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    return jsonError(error, "Failed to delete purchase");
  }
}

