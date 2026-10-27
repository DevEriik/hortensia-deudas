"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Search, User } from "lucide-react";
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

function generarId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback para navegadores móviles que no soportan crypto.randomUUID (HTTP local)
  return (
    "id_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 11)
  );
}

function redondearAPesos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

type ItemPrenda = {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
};

export default function PaginaNuevaSalida() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);

  const [items, setItems] = useState<ItemPrenda[]>([]);

  useEffect(() => {
    setItems([
      {
        id: generarId(),
        descripcion: "",
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
  }, []);
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
      setClientes((data as Cliente[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoClientes(false);
    }
  }, []);

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

  const agregarItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: generarId(),
        descripcion: "",
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
  };

  const eliminarItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const actualizarItem = (
    id: string,
    campo: keyof ItemPrenda,
    valor: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)),
    );
  };

  const calcularSubtotal = (item: ItemPrenda) => {
    const cantidad = Number(item.cantidad) || 0;
    const precio = Number(item.precio_unitario) || 0;
    return redondearAPesos(cantidad * precio);
  };

  const total = redondearAPesos(
    items.reduce((suma, item) => suma + calcularSubtotal(item), 0),
  );

  const guardarSalida = async () => {
    setError(null);

    if (!clienteSeleccionado) {
      setError("Tenés que seleccionar un cliente.");
      return;
    }

    const itemsValidos = items.filter(
      (item) =>
        item.descripcion.trim() !== "" &&
        Number(item.cantidad) > 0 &&
        Number(item.precio_unitario) >= 0,
    );

    if (itemsValidos.length === 0) {
      setError("Agregá al menos una prenda con descripción y precio.");
      return;
    }

    if (total <= 0) {
      setError("El total tiene que ser mayor a $0.");
      return;
    }

    setGuardando(true);

    try {
      const { data: salidaCreada, error: errorSalida } = await supabase
        .from("salidas")
        .insert({
          cliente_id: clienteSeleccionado.id,
          total: total,
          notas: notas.trim() || null,
        })
        .select()
        .single();

      if (errorSalida) throw errorSalida;

      const itemsParaInsertar = itemsValidos.map((item) => ({
        salida_id: salidaCreada.id,
        descripcion: item.descripcion.trim(),
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.precio_unitario),
        subtotal: redondearAPesos(
          Number(item.cantidad) * Number(item.precio_unitario),
        ),
      }));

      const { error: errorItems } = await supabase
        .from("items_salida")
        .insert(itemsParaInsertar);

      if (errorItems) throw errorItems;

      const nuevoSaldo = redondearAPesos(
        Number(clienteSeleccionado.saldo_pendiente) + total,
      );

      const { error: errorCliente } = await supabase
        .from("clientes")
        .update({ saldo_pendiente: nuevoSaldo })
        .eq("id", clienteSeleccionado.id);

      if (errorCliente) throw errorCliente;

      router.push(`/clientes/${clienteSeleccionado.id}`);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al guardar el fiado.");
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
              Nueva salida
            </h1>
            <p className="text-sm text-muted-foreground">
              Registrar prendas a fiado
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
                        <p className="text-xs text-muted-foreground">
                          {formatearMoneda(cliente.saldo_pendiente)}
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
                  Agregar nuevo cliente
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Prendas
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={agregarItem}
            >
              <Plus className="h-4 w-4" />
              Agregar prenda
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, index) => (
              <Card key={item.id} className="border-border/80">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Prenda {index + 1}</p>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => eliminarItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input
                      placeholder="Ej. Camisa, Pantalón, Vestido..."
                      value={item.descripcion}
                      onChange={(e) =>
                        actualizarItem(item.id, "descripcion", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) =>
                          actualizarItem(
                            item.id,
                            "cantidad",
                            parseInt(e.target.value) || 1,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio unitario</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0,00"
                        value={
                          item.precio_unitario === 0 ? "" : item.precio_unitario
                        }
                        onChange={(e) =>
                          actualizarItem(
                            item.id,
                            "precio_unitario",
                            e.target.value === ""
                              ? 0
                              : parseFloat(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      {formatearMoneda(calcularSubtotal(item))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Notas (opcional)
          </h2>
          <Card className="border-border/80">
            <CardContent className="p-4">
              <Textarea
                placeholder="Ej. Se lleva para arreglar, pagará más adelante..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </CardContent>
          </Card>
        </section>

        {/* TOTAL */}
        <Card className="border-border/80">
          <CardContent className="flex items-center justify-between p-4">
            <p className="font-medium">Total</p>
            <p className="text-xl font-semibold tracking-tight">
              {formatearMoneda(total)}
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total a fiar</p>
            <p className="text-lg font-semibold">{formatearMoneda(total)}</p>
          </div>
          <Button
            className="px-6"
            disabled={guardando || !clienteSeleccionado || total <= 0}
            onClick={guardarSalida}
          >
            {guardando ? "Guardando..." : "Guardar fiado"}
          </Button>
        </div>
      </div>
    </main>
  );
}
