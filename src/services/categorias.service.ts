import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  Unsubscribe,
  query,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Categoria } from './types';

const CATEGORIES_COLLECTION = 'categorias';

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtiene todas las categorías (una sola vez)
 */
export async function getCategorias(): Promise<Categoria[]> {
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('nombre'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as Categoria));
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    throw error;
  }
}

/**
 * Escucha cambios en tiempo real de las categorías
 */
export function onCategoriasChange(
  callback: (categorias: Categoria[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collection(db, CATEGORIES_COLLECTION), orderBy('nombre'));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const categorias = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as Categoria));
        callback(categorias);
      },
      (error) => {
        console.error('Error escuchando categorías:', error);
        onError?.(error as Error);
      }
    );
  } catch (error) {
    console.error('Error configurando listener de categorías:', error);
    throw error;
  }
}

/**
 * Agrega una nueva categoría
 */
export async function addCategoria(nombre: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
      nombre,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error agregando categoría:', error);
    throw error;
  }
}

/**
 * Actualiza una categoría existente
 */
export async function updateCategoria(id: string, nombre: string): Promise<void> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await updateDoc(docRef, {
      nombre,
    });
  } catch (error) {
    console.error('Error actualizando categoría:', error);
    throw error;
  }
}

/**
 * Elimina una categoría
 */
export async function deleteCategoria(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    throw error;
  }
}
