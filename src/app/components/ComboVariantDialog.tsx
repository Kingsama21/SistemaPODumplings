import { useState } from 'react';
import type { Product } from '../context/AppContext';
import {
  BULDAK_FLAVORS,
  DUMPLING_TYPES,
  type BuldakFlavor,
  type DumplingType,
  type OrderItemVariants,
} from '../../config/inventory.config';

interface ComboVariantDialogProps {
  product: Product | null;
  open: boolean;
  onConfirm: (variants: OrderItemVariants) => void;
  onCancel: () => void;
}

export function ComboVariantDialog({
  product,
  open,
  onConfirm,
  onCancel,
}: ComboVariantDialogProps) {
  const [buldakFlavor, setBuldakFlavor] = useState<BuldakFlavor>(BULDAK_FLAVORS[0]);
  const [dumplingType, setDumplingType] = useState<DumplingType>(DUMPLING_TYPES[0]);

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Selecciona variantes</h3>
          <p className="text-sm text-muted-foreground mt-1">{product?.name}</p>
          <p className="text-xs text-muted-foreground">Categoría: Ramen Buldak y Dumplings</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sabor Buldak</label>
          <select
            value={buldakFlavor}
            onChange={(e) => setBuldakFlavor(e.target.value as BuldakFlavor)}
            className="w-full px-3 py-2 border border-border rounded bg-input"
          >
            {BULDAK_FLAVORS.map(flavor => (
              <option key={flavor} value={flavor}>
                {flavor}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Dumpling</label>
          <select
            value={dumplingType}
            onChange={(e) => setDumplingType(e.target.value as DumplingType)}
            className="w-full px-3 py-2 border border-border rounded bg-input"
          >
            {DUMPLING_TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-border rounded hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ buldakFlavor, dumplingType })}
            className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded font-semibold"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
