import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Producto } from './types';

const PRODUCTS_COLLECTION = 'productos';

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtiene todos los productos (una sola vez)
 */
export async function getProductos(): Promise<Producto[]> {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('nombre'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as Producto));
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real de todos los productos
 * @param callbackonChange - Función que se ejecuta cuando cambian los datos
 * @returns Función para desuscribirse
 */
export function onProductosChange(
  callback: (productos: Producto[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('nombre'));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const productos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Producto));
        callback(productos);
      },
      (error) => {
        console.error('Error escuchando productos:', error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    console.error('Error configurando listener de productos:', error);
    throw error;
  }
}

/**
 * Agrega un nuevo producto
 */
export async function addProducto(
  data: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error agregando producto:', error);
    throw error;
  }
}

/**
 * Actualiza un producto existente
 */
export async function updateProducto(
  id: string,
  data: Partial<Omit<Producto, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    // Filtrar campos undefined para evitar error de Firestore
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    await updateDoc(docRef, {
      ...filteredData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    throw error;
  }
}

/**
 * Elimina un producto
 */
export async function deleteProducto(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
  } catch (error) {
    console.error('Error eliminando producto:', error);
    throw error;
  }
}

/**
 * Obtiene productos por categoría
 */
export async function getProductosPorCategoria(categoria: string): Promise<Producto[]> {
  try {
    const q = query(
      collection(db, PRODUCTS_COLLECTION),
      orderBy('nombre')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as Producto))
      .filter(p => p.categoria === categoria);
  } catch (error) {
    console.error('Error obteniendo productos por categoría:', error);
    throw error;
  }
}
