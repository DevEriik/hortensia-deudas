export function formatearMoneda(
  valor: number | string | null | undefined,
): string {
  const cantidad = Number(valor) || 0;

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cantidad);
}

export function formatearFecha(fecha: string | Date): string {
  const fechaObjeto = typeof fecha === "string" ? new Date(fecha) : fecha;

  return fechaObjeto.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatearFechaLarga(fecha: string | Date): string {
  const fechaObjeto = typeof fecha === "string" ? new Date(fecha) : fecha;

  return fechaObjeto.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function esHoy(fecha: string | Date): boolean {
  const fechaObjeto = typeof fecha === "string" ? new Date(fecha) : fecha;
  const hoy = new Date();

  return (
    fechaObjeto.getFullYear() === hoy.getFullYear() &&
    fechaObjeto.getMonth() === hoy.getMonth() &&
    fechaObjeto.getDate() === hoy.getDate()
  );
}
