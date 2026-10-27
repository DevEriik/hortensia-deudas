"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Plus, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function PaginaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");

  const cargarClientes = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) throw error;

      setClientes((data as Cliente[]) || []);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error al cargar los clientes");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const abrirModal = () => {
    setNombre("");
    setTelefono("");
    setNotas("");
    setErrorFormulario(null);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
  };

  const guardarCliente = async () => {
    setErrorFormulario(null);

    if (!nombre.trim()) {
      setErrorFormulario("El nombre del cliente es obligatorio.");
      return;
    }

    setGuardando(true);

    try {
      const { error } = await supabase.from("clientes").insert({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        notas: notas.trim() || null,
        saldo_pendiente: 0,
      });

      if (error) throw error;

      await cargarClientes();
      setModalAbierto(false);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setErrorFormulario(err.message);
      } else {
        setErrorFormulario("Ocurrió un error al guardar el cliente.");
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col px-6 py-8 pb-10">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center gap-2">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-9 w-9 -ml-2",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Seleccioná un cliente para ver su ficha
            </p>
          </div>
          <Button className="gap-2" onClick={abrirModal}>
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        </header>

        {cargando && (
          <p className="text-sm text-muted-foreground">Cargando clientes...</p>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">Error: {error}</p>
          </div>
        )}

        {!cargando && !error && clientes.length === 0 && (
          <Card className="border-border/80">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="font-medium">Sin clientes registrados</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Agregá tu primer cliente con el botón "Nuevo cliente"
              </p>
              <Button className="mt-4 gap-2" onClick={abrirModal}>
                <Plus className="h-4 w-4" />
                Agregar cliente
              </Button>
            </CardContent>
          </Card>
        )}

        {!cargando && !error && clientes.length > 0 && (
          <div className="space-y-2">
            {clientes.map((cliente) => {
              const tieneDeuda = Number(cliente.saldo_pendiente) > 0.001;

              return (
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
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Saldo</p>
                          <p
                            className={
                              tieneDeuda
                                ? "font-medium text-destructive"
                                : "font-medium"
                            }
                          >
                            {formatearMoneda(cliente.saldo_pendiente)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={modalAbierto} onOpenChange={cerrarModal}>
        <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Completá los datos para registrar un nuevo cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre y apellido <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                placeholder="Ej. María González"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono (opcional)</Label>
              <Input
                id="telefono"
                placeholder="Ej. 11 1234 5678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                placeholder="Ej. Referencia, dirección, etc."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {errorFormulario && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
                <p className="text-sm text-destructive">{errorFormulario}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={cerrarModal}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={guardarCliente}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
