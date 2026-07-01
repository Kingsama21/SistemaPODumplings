import { useState } from 'react';
import { toast } from 'sonner';
import type { Discount } from '../context/AppContext';
import {
  applyDiscount,
  applyManualDiscountToTotal,
  formatDiscountLabel,
  type DiscountResult,
  type DiscountableItem,
} from '../../services/discount.service';

export interface AutoPromotionSummary {
  subtotal: number;
  autoPromotionDiscount: number;
  totalAfterAutoPromotions: number;
  appliedPromotions: string[];
}

interface PromotionCodeInputProps {
  items: DiscountableItem[];
  discounts: Discount[];
  redeemPromotion: (code: string) => Promise<Discount | null>;
  onDiscountChange: (result: DiscountResult | null) => void;
  autoPromotionSummary?: AutoPromotionSummary;
}

export function PromotionCodeInput({
  items,
  discounts,
  redeemPromotion,
  onDiscountChange,
  autoPromotionSummary,
}: PromotionCodeInputProps) {
  const [promoCode, setPromoCode] = useState('');
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [applied, setApplied] = useState<DiscountResult | null>(null);

  const activeDiscounts = discounts.filter(discount => discount.active);
  const baseSubtotal = autoPromotionSummary?.subtotal ?? items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const buildDiscountResult = (discount: Discount): DiscountResult => {
    if (autoPromotionSummary) {
      const manual = applyManualDiscountToTotal(
        autoPromotionSummary.totalAfterAutoPromotions,
        discount
      );
      return {
        subtotal: baseSubtotal,
        discountAmount: autoPromotionSummary.autoPromotionDiscount + manual.discountAmount,
        total: manual.total,
        discountApplied: discount,
      };
    }

    return applyDiscount(items, discount);
  };

  const handleApplyCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Ingresa un código promocional');
      return;
    }

    const discount = await redeemPromotion(promoCode.trim());
    if (!discount) {
      toast.error('Código inválido, expirado o sin usos disponibles');
      return;
    }

    const result = buildDiscountResult(discount);
    setApplied(result);
    setSelectedDiscountId('');
    onDiscountChange(result);
    toast.success(`Promoción aplicada: ${discount.name}`);
  };

  const handleApplyDiscount = () => {
    const discount = activeDiscounts.find(d => d.id === selectedDiscountId);
    if (!discount) {
      toast.error('Selecciona un descuento');
      return;
    }

    const result = buildDiscountResult(discount);
    setApplied(result);
    setPromoCode('');
    onDiscountChange(result);
    toast.success(`Descuento aplicado: ${discount.name}`);
  };

  const handleClear = () => {
    setApplied(null);
    setPromoCode('');
    setSelectedDiscountId('');
    onDiscountChange(null);
  };

  const displayTotal = applied?.total ?? autoPromotionSummary?.totalAfterAutoPromotions ?? baseSubtotal;

  return (
    <div className="space-y-3 border border-border rounded p-3">
      <p className="text-sm font-medium">Descuentos y promociones</p>

      {autoPromotionSummary && autoPromotionSummary.appliedPromotions.length > 0 && !applied && (
        <div className="text-xs space-y-1 bg-accent/10 rounded p-2">
          <p className="font-medium">Promociones automáticas:</p>
          {autoPromotionSummary.appliedPromotions.map(promotion => (
            <p key={promotion}>- {promotion}</p>
          ))}
          {autoPromotionSummary.autoPromotionDiscount > 0 && (
            <p className="text-green-600">
              Ahorro promo: -${autoPromotionSummary.autoPromotionDiscount.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {!applied ? (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Código promocional"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 border border-border rounded bg-input text-sm"
            />
            <button
              type="button"
              onClick={handleApplyCode}
              className="px-3 py-2 bg-secondary rounded text-sm font-semibold hover:bg-accent/20"
            >
              Aplicar
            </button>
          </div>

          {activeDiscounts.length > 0 ? (
            <div className="flex gap-2">
              <select
                value={selectedDiscountId}
                onChange={(e) => setSelectedDiscountId(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded bg-input text-sm"
              >
                <option value="">O selecciona un descuento...</option>
                {activeDiscounts.map(discount => (
                  <option key={discount.id} value={discount.id}>
                    {discount.name} ({formatDiscountLabel(discount)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyDiscount}
                disabled={!selectedDiscountId}
                className="px-3 py-2 bg-secondary rounded text-sm font-semibold hover:bg-accent/20 disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Crea descuentos activos en Administración para aplicarlos directamente.
            </p>
          )}

          {autoPromotionSummary && (
            <div className="text-sm flex justify-between font-medium pt-1">
              <span>Total con promos automáticas:</span>
              <span>${displayTotal.toFixed(2)}</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${applied.subtotal.toFixed(2)}</span>
          </div>
          {autoPromotionSummary && autoPromotionSummary.autoPromotionDiscount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Promos automáticas:</span>
              <span>-${autoPromotionSummary.autoPromotionDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-green-600">
            <span>Descuento ({applied.discountApplied.name}):</span>
            <span>
              -$
              {(
                applied.discountAmount - (autoPromotionSummary?.autoPromotionDiscount ?? 0)
              ).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total con descuento:</span>
            <span>${applied.total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground underline mt-1"
          >
            Quitar descuento manual
          </button>
        </div>
      )}
    </div>
  );
}
