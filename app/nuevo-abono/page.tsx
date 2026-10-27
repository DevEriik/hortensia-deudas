"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, User, HandCoins } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Cliente } from "@/tipos/fiados";
import { formatearMoneda } from "@/utilidades/formateadores";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function redondearAPesos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function FormularioNuevoAbono() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientePreseleccionado = searchParams.get("cliente");

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);

  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarClientes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) throw error;

      const lista = (data as Cliente[]) || [];
      setClientes(lista);

      if (clientePreseleccionado) {
        const encontrado = lista.find((c) => c.id === clientePreseleccionado);
        if (encontrado) {
          setClienteSeleccionado(encontrado);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoClientes(false);
    }
  }, [clientePreseleccionado]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const clientesFiltrados = clientes.filter((cliente) => {
    if (!busquedaCliente.trim()) return true;
    const termino = busquedaCliente.toLowerCase();
    return (
      cliente.nombre.toLowerCase().includes(termino) ||
      (cliente.telefono ?? "").includes(termino)
    );
  });

  const saldoPendiente = clienteSeleccionado
    ? Number(clienteSeleccionado.saldo_pendiente)
    : 0;

  const montoNumerico = parseFloat(monto.replace(",", ".")) || 0;

  const aplicarPorcentaje = (porcentaje: number) => {
    if (saldoPendiente <= 0) return;
    const calculado = saldoPendiente * porcentaje;
    setMonto(calculado.toFixed(2));
  };

  const guardarAbono = async () => {
    setError(null);

    if (!clienteSeleccionado) {
      setError("Tenés que seleccionar un cliente.");
      return;
    }

    if (montoNumerico <= 0) {
      setError("El monto tiene que ser mayor a $0.");
      return;
    }

    if (montoNumerico > saldoPendiente + 0.01) {
      setError("El monto no puede ser mayor al saldo pendiente.");
      return;
    }

    setGuardando(true);

    try {
      const { error: errorAbono } = await supabase.from("abonos").insert({
        cliente_id: clienteSeleccionado.id,
        monto: redondearAPesos(montoNumerico),
        metodo: metodo.trim() || null,
        notas: notas.trim() || null,
      });

      if (errorAbono) throw errorAbono;

      const nuevoSaldo = redondearAPesos(saldoPendiente - montoNumerico);

      const { error: errorCliente } = await supabase
        .from("clientes")
        .update({ saldo_pendiente: nuevoSaldo < 0 ? 0 : nuevoSaldo })
        .eq("id", clienteSeleccionado.id);

      if (errorCliente) throw errorCliente;

      router.push(`/clientes/${clienteSeleccionado.id}`);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al registrar el abono.");
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col pb-28">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-9 w-9",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Registrar abono
            </h1>
            <p className="text-sm text-muted-foreground">
              Anotar pago del cliente
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 flex w-full max-w-2xl flex-col gap-6 px-6">
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Cliente
          </h2>
          {clienteSeleccionado ? (
            <Card className="border-border/80">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{clienteSeleccionado.nombre}</p>
                    {clienteSeleccionado.telefono && (
                      <p className="text-sm text-muted-foreground">
                        {clienteSeleccionado.telefono}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBusquedaCliente("");
                    setMonto("");
                  }}
                >
                  Cambiar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/80">
              <CardContent className="space-y-3 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o teléfono..."
                    className="pl-9"
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                  />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto">
                  {cargandoClientes && (
                    <p className="py-2 text-center text-sm text-muted-foreground">
                      Cargando...
                    </p>
                  )}
                  {!cargandoClientes && clientesFiltrados.length === 0 && (
                    <p className="py-2 text-center text-sm text-muted-foreground">
                      No se encontraron clientes
                    </p>
                  )}
                  {!cargandoClientes &&
                    clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/40"
                        onClick={() => {
                          setClienteSeleccionado(cliente);
                          setBusquedaCliente("");
                          setMonto("");
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {cliente.nombre}
                          </p>
                          {cliente.telefono && (
                            <p className="text-xs text-muted-foreground">
                              {cliente.telefono}
                            </p>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs",
                            Number(cliente.saldo_pendiente) > 0.001
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          Debe: {formatearMoneda(cliente.saldo_pendiente)}
                        </p>
                      </button>
                    ))}
                </div>
                <Link
                  href="/clientes"
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-center",
                  )}
                >
                  Ver todos los clientes
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {clienteSeleccionado && (
          <>
            <Card className="border-border/80">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Saldo pendiente
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-destructive">
                    {formatearMoneda(saldoPendiente)}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <HandCoins className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Monto a abonar
              </h2>
              <Card className="border-border/80">
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="monto">Monto</Label>
                    <Input
                      id="monto"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={0}
                      placeholder="0,00"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                    />
                  </div>
                  {saldoPendiente > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => aplicarPorcentaje(0.25)}
                      >
                        25%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => aplicarPorcentaje(0.5)}
                      >
                        50%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => aplicarPorcentaje(0.75)}
                      >
                        75%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => aplicarPorcentaje(1)}
                      >
                        Todo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Detalles (opcional)
              </h2>
              <Card className="border-border/80">
                <CardContent className="space-y-3 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="metodo">Método de pago</Label>
                    <Input
                      id="metodo"
                      placeholder="Efectivo, transferencia, etc."
                      value={metodo}
                      onChange={(e) => setMetodo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      placeholder="Agregar una observación..."
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </section>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </>
        )}
      </div>

      {clienteSeleccionado && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">A abonar</p>
              <p className="text-lg font-semibold">
                {montoNumerico > 0
                  ? formatearMoneda(montoNumerico)
                  : formatearMoneda(0)}
              </p>
            </div>
            <Button
              className="px-6"
              disabled={guardando || montoNumerico <= 0 || !clienteSeleccionado}
              onClick={guardarAbono}
            >
              {guardando ? "Guardando..." : "Guardar abono"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function PaginaNuevoAbono() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </main>
      }
    >
      <FormularioNuevoAbono />
    </Suspense>
  );
}
