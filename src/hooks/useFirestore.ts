import { useState, useEffect } from 'react';
import * as productosService from '../services/productos.service';
import * as categoriasService from '../services/categorias.service';
import * as ordenesService from '../services/ordenes.service'
import * as cajaService from '../services/caja.service';
import type { Producto, Categoria, Orden, MovimientoCaja, ResumenCaja } from '../services/types';

// ============================================
// HOOK: useProductos
// ============================================
export function useProductos() {
  const [productos, setProductos] = useState<Array<Producto>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Escuchar cambios en tiempo real
    const unsubscribe = productosService.onProductosChange(
      (data) => {
        setProductos(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { productos, loading, error };
}

// ============================================
// HOOK: useCategorias
// ============================================
export function useCategorias() {
  const [categorias, setCategorias] = useState<Array<Categoria>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = categoriasService.onCategoriasChange(
      (data) => {
        setCategorias(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { categorias, loading, error };
}

// ============================================
// HOOK: useOrdenesActivas
// ============================================
export function useOrdenesActivas() {
  const [ordenes, setOrdenes] = useState<Array<Orden>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = ordenesService.onOrdenesActivasChange(
      (data) => {
        setOrdenes(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { ordenes, loading, error };
}

// ============================================
// HOOK: useOrdenes
// ============================================
export function useOrdenes() {
  const [ordenes, setOrdenes] = useState<Array<Orden>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);

    const fetchOrdenes = async () => {
      try {
        const data = await ordenesService.getOrdenes();
        setOrdenes(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenes();
  }, []);

  return { ordenes, loading, error };
}

// ============================================
// HOOK: useResumenCaja
// ============================================
export function useResumenCaja() {
  const [resumen, setResumen] = useState<ResumenCaja>({
    totalIngresos: 0,
    totalEgresos: 0,
    balance: 0,
  } as ResumenCaja);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = cajaService.onResumenCajaChange(
      (data) => {
        setResumen(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { resumen, loading, error };
}

// ============================================
// HOOK: useMovimientos
// ============================================
export function useMovimientos() {
  const [movimientos, setMovimientos] = useState<Array<MovimientoCaja>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = cajaService.onMovimientosChange(
      (data) => {
        setMovimientos(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { movimientos, loading, error };
}
