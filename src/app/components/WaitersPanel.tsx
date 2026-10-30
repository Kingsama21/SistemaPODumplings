import { useEffect, useState } from 'react';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  addWaiter,
  onWaitersChange,
  removeWaiter,
  renameWaiter,
  type Waiter,
} from '../../services/waiters.service';

export default function WaitersPanel() {
  const [waiters, setWaiters] = useState<Waiter[] | null>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onWaitersChange(setWaiters), []);

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el cambio');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() => addWaiter(newName), 'Mesero agregado');
    if (ok) setNewName('');
  };

  const handleRename = async (id: string) => {
    const ok = await run(() => renameWaiter(id, editingName), 'Nombre actualizado');
    if (ok) setEditingId(null);
  };

  const handleRemove = async (waiter: Waiter) => {
    if (!confirm(`¿Quitar a ${waiter.name}? Ya no podrá entrar al sistema.`)) return;
    await run(() => removeWaiter(waiter.id), 'Mesero eliminado');
  };

  return (
    <div className="max-w-xl">
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Meseros
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Estos nombres aparecen como botones en la pantalla de inicio de los celulares. Los cambios se ven al instante
        en todos los dispositivos.
      </p>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del nuevo mesero"
          maxLength={30}
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !newName.trim()} className="gap-2 whitespace-nowrap">
          <Plus size={16} />
          Agregar
        </Button>
      </form>

      {waiters === null && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {waiters?.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay meseros. Agrega el primero arriba.</p>
      )}

      <div className="space-y-2">
        {waiters?.map(waiter => (
          <div key={waiter.id} className="flex items-center gap-2 border border-border rounded-lg p-3 bg-card">
            {editingId === waiter.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  maxLength={30}
                  autoFocus
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleRename(waiter.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <Button size="sm" disabled={busy || !editingName.trim()} onClick={() => void handleRename(waiter.id)}>
                  <Check size={16} />
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditingId(null)}>
                  <X size={16} />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 font-semibold">{waiter.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  title="Cambiar nombre"
                  onClick={() => {
                    setEditingId(waiter.id);
                    setEditingName(waiter.name);
                  }}
                >
                  <Edit2 size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  title="Quitar mesero"
                  onClick={() => void handleRemove(waiter)}
                >
                  <Trash2 size={16} />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
