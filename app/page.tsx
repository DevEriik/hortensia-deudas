"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { HandCoins, PlusCircle, Users, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Cliente } from "@/tipos/fiados";
import {
  formatearMoneda,
  formatearFechaLarga,
} from "@/utilidades/formateadores";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PaginaInicio() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fechaHoy, setFechaHoy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  const cargarClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("saldo_pendiente", { ascending: false });

      if (error) throw error;

      setClientes((data as Cliente[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  useEffect(() => {
    setFechaHoy(formatearFechaLarga(new Date()));
  }, []);

  const clientesConDeuda = clientes.filter(
    (cliente) => Number(cliente.saldo_pendiente) > 0.001,
  );

  const totalPorCobrar = clientesConDeuda.reduce(
    (suma, cliente) => suma + Number(cliente.saldo_pendiente),
    0,
  );

  return (
    <main className="flex flex-1 flex-col pb-10">
      <header className="px-6 pt-8">
        <p className="text-sm capitalize text-muted-foreground">
          {fechaHoy || " "}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Hortensia
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Control de fiados</p>
      </header>

      <section className="mt-6 px-6">
        <Card className="border-border/80 shadow-sm">
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total por cobrar</p>
              {cargando ? (
                <div className="mt-2 h-9 w-40 animate-pulse rounded-md bg-muted" />
              ) : (
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {formatearMoneda(totalPorCobrar)}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {!montado || cargando
                    ? "Cargando..."
                    : `${clientesConDeuda.length} ${
                        clientesConDeuda.length === 1 ? "cliente" : "clientes"
                      } con deuda`}
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 px-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Accesos rápidos
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/nueva-salida">
            <Card className="border-border/80 transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <PlusCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Nueva salida</p>
                  <p className="text-sm text-muted-foreground">
                    Registrar fiado
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/nuevo-abono">
            <Card className="border-border/80 transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <HandCoins className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Registrar abono</p>
                  <p className="text-sm text-muted-foreground">Anotar pago</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <section className="mt-8 px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Clientes con deuda
          </h2>
          <Link
            href="/clientes"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 px-2",
            )}
          >
            Ver todos
          </Link>
        </div>

        {cargando && (
          <div className="space-y-2">
            <div className="h-14 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-14 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-14 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {!cargando && clientesConDeuda.length === 0 && (
          <Card className="border-border/80">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="font-medium">Sin deudas pendientes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Todos los clientes están al corriente
              </p>
            </CardContent>
          </Card>
        )}

        {!cargando && clientesConDeuda.length > 0 && (
          <div className="space-y-2">
            {clientesConDeuda.slice(0, 6).map((cliente) => (
              <Link key={cliente.id} href={`/clientes/${cliente.id}`}>
                <Card className="border-border/80 transition-colors hover:bg-muted/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{cliente.nombre}</p>
                      {cliente.telefono && (
                        <p className="text-sm text-muted-foreground">
                          {cliente.telefono}
                        </p>
                      )}
                    </div>
                    <p className="font-medium text-destructive">
                      {formatearMoneda(cliente.saldo_pendiente)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
