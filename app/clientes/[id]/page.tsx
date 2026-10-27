"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  User,
  PlusCircle,
  HandCoins,
  ReceiptText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Cliente, Salida, Abono, ItemSalida } from "@/tipos/fiados";
import { formatearMoneda, formatearFecha } from "@/utilidades/formateadores";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Movimiento = {
  id: string;
  tipo: "salida" | "abono";
  fecha: string;
  monto: number;
  detalle?: string;
  notas?: string | null;
};

function ContenidoFichaCliente() {
  const params = useParams();
  const router = useRouter();
  const clienteId = params.id as string;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarFicha = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const [clienteRes, salidasRes, abonosRes] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", clienteId).single(),
        supabase
          .from("salidas")
          .select("*, items_salida(*)")
          .eq("cliente_id", clienteId)
          .order("fecha", { ascending: false }),
        supabase
          .from("abonos")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("fecha", { ascending: false }),
      ]);

      if (clienteRes.error) throw clienteRes.error;
      if (salidasRes.error) throw salidasRes.error;
      if (abonosRes.error) throw abonosRes.error;

      setCliente(clienteRes.data as Cliente);

      const salidas =
        (salidasRes.data as (Salida & { items_salida: ItemSalida[] })[]) || [];
      const abonos = (abonosRes.data as Abono[]) || [];

      const listaMovimientos: Movimiento[] = [];

      salidas.forEach((salida) => {
        const cantidadItems = salida.items_salida?.length || 0;
        let detalle = "";

        if (cantidadItems === 1 && salida.items_salida[0]?.descripcion) {
          detalle = salida.items_salida[0].descripcion;
        } else if (cantidadItems > 1) {
          detalle = `${cantidadItems} prenda${cantidadItems === 1 ? "" : "s"}`;
        }

        listaMovimientos.push({
          id: salida.id,
          tipo: "salida",
          fecha: salida.fecha,
          monto: Number(salida.total),
          detalle: detalle || undefined,
          notas: salida.notas,
        });
      });

      abonos.forEach((abono) => {
        listaMovimientos.push({
          id: abono.id,
          tipo: "abono",
          fecha: abono.fecha,
          monto: Number(abono.monto),
          detalle: abono.metodo || undefined,
          notas: abono.notas,
        });
      });

      listaMovimientos.sort((a, b) => {
        const fechaA = new Date(a.fecha).getTime();
        const fechaB = new Date(b.fecha).getTime();
        return fechaB - fechaA;
      });

      setMovimientos(listaMovimientos);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al cargar la ficha del cliente.");
      }
    } finally {
      setCargando(false);
    }
  }, [clienteId]);

  useEffect(() => {
    if (clienteId) {
      cargarFicha();
    }
  }, [clienteId, cargarFicha]);

  const saldoPendiente = cliente ? Number(cliente.saldo_pendiente) : 0;
  const tieneDeuda = saldoPendiente > 0.001;

  return (
    <main className="flex flex-1 flex-col pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Ficha del cliente
            </h1>
            <p className="text-sm text-muted-foreground">
              Historial de fiados y abonos
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 flex w-full max-w-2xl flex-col gap-6 px-6">
        {cargando && (
          <Card className="border-border/80">
            <CardContent className="space-y-3 p-5">
              <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
              <div className="mt-4 h-16 w-full animate-pulse rounded-lg bg-muted" />
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!cargando && !error && cliente && (
          <>
            <Card className="border-border/80">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">{cliente.nombre}</p>
                      {cliente.telefono ? (
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{cliente.telefono}</span>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Sin teléfono
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">
                    Saldo pendiente
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tracking-tight",
                      tieneDeuda ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {formatearMoneda(saldoPendiente)}
                  </p>
                  {!tieneDeuda && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sin deuda pendiente
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/nueva-salida?cliente=${cliente.id}`}
                    className={cn(buttonVariants(), "gap-2 justify-center")}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Nueva salida
                  </Link>
                  <Link
                    href={`/nuevo-abono?cliente=${cliente.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "gap-2 justify-center",
                    )}
                  >
                    <HandCoins className="h-4 w-4" />
                    Registrar abono
                  </Link>
                </div>
              </CardContent>
            </Card>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Historial
                </h2>
                <p className="text-xs text-muted-foreground">
                  {movimientos.length} movimiento
                  {movimientos.length === 1 ? "" : "s"}
                </p>
              </div>

              {movimientos.length === 0 ? (
                <Card className="border-border/80">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <ReceiptText className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 font-medium">Sin movimientos</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Todavía no hay fiados ni abonos para este cliente
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {movimientos.map((movimiento) => {
                    const esSalida = movimiento.tipo === "salida";

                    return (
                      <Card
                        key={`${movimiento.tipo}-${movimiento.id}`}
                        className="border-border/80"
                      >
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg",
                                esSalida ? "bg-muted" : "bg-emerald-500/10",
                              )}
                            >
                              {esSalida ? (
                                <ReceiptText className="h-4 w-4" />
                              ) : (
                                <HandCoins className="h-4 w-4 text-emerald-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {esSalida ? "Salida a fiado" : "Abono"}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatearFecha(movimiento.fecha)}</span>
                                {movimiento.detalle && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">
                                      {movimiento.detalle}
                                    </span>
                                  </>
                                )}
                              </div>
                              {movimiento.notas && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {movimiento.notas}
                                </p>
                              )}
                            </div>
                          </div>
                          <p
                            className={cn(
                              "font-medium",
                              esSalida ? "text-foreground" : "text-emerald-600",
                            )}
                          >
                            {esSalida ? "+" : "-"}
                            {formatearMoneda(movimiento.monto)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaginaFichaCliente() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Cargando ficha del cliente...
          </p>
        </main>
      }
    >
      <ContenidoFichaCliente />
    </Suspense>
  );
}
