export type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  saldo_pendiente: number;
  created_at: string;
};

export type Salida = {
  id: string;
  cliente_id: string;
  total: number;
  fecha: string;
  notas: string | null;
  created_at: string;
  cliente?: Cliente;
  items_salida?: ItemSalida[];
};

export type ItemSalida = {
  id: string;
  salida_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  created_at: string;
};

export type Abono = {
  id: string;
  cliente_id: string;
  monto: number;
  fecha: string;
  metodo: string | null;
  notas: string | null;
  created_at: string;
  cliente?: Cliente;
};
