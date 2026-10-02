import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Printer } from 'lucide-react';

type PrinterInfo = {
  name: string;
  driverName?: string;
  portName?: string;
};

type PrinterSettings = {
  printerName: string;
  paperWidthMm: 58 | 80;
  openDrawer: boolean;
  cut: boolean;
};

export default function PrinterSettingsPanel() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [settings, setSettings] = useState<PrinterSettings>({
    printerName: '',
    paperWidthMm: 80,
    openDrawer: true,
    cut: true,
  });
  const [loading, setLoading] = useState(true);
  const isElectron = Boolean(window.electronAPI?.isElectron);

  const load = async () => {
    if (!window.electronAPI?.getPrinters) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = (await window.electronAPI.getPrinters()) as {
        printers: PrinterInfo[];
        settings: PrinterSettings;
      };
      setPrinters(data.printers || []);
      setSettings({
        printerName: data.settings?.printerName || '',
        paperWidthMm: data.settings?.paperWidthMm === 58 ? 58 : 80,
        openDrawer: data.settings?.openDrawer !== false,
        cut: data.settings?.cut !== false,
      });
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las impresoras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (partial: Partial<PrinterSettings>) => {
    if (!window.electronAPI?.setPrinterSettings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    try {
      await window.electronAPI.setPrinterSettings(next);
      toast.success('Configuración de impresora guardada');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo guardar la impresora');
    }
  };

  const testPrint = async () => {
    if (!window.electronAPI?.printTicket) return;
    const result = await window.electronAPI.printTicket({
      id: `test-${Date.now()}`,
      items: [{ quantity: 1, product: { name: 'Prueba de impresion', price: 1 } }],
      total: 1,
      timestamp: new Date().toISOString(),
      orderType: 'local',
      paymentMethod: 'cash',
      tableNumber: '0',
    });
    if (!result?.ok) {
      toast.error(result?.message || 'Falló la prueba de impresión');
    }
  };

  if (!isElectron) {
    return (
      <div className="border border-border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-2">Impresora térmica</h2>
        <p className="text-muted-foreground">
          La configuración de impresora solo está disponible dentro de la app Electron.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-6 bg-card space-y-6 max-w-2xl">
      <div className="flex items-start gap-3">
        <Printer className="mt-1" />
        <div>
          <h2 className="text-xl font-semibold">Impresora térmica (ESC/POS)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Los tickets se envían como comandos RAW. No uses PDF / Microsoft Print to PDF.
          </p>
        </div>
      </div>

      {loading ? (
        <p>Cargando impresoras...</p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-semibold mb-2">Impresora</label>
            <select
              className="w-full border border-border rounded px-3 py-2 bg-background"
              value={settings.printerName}
              onChange={(e) => void save({ printerName: e.target.value })}
            >
              <option value="">Detectar automáticamente</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mt-2 text-sm text-accent underline"
              onClick={() => void load()}
            >
              Actualizar lista
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Ancho de papel</label>
            <div className="flex gap-3">
              {[80, 58].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => void save({ paperWidthMm: w as 58 | 80 })}
                  className={`px-4 py-2 rounded border ${
                    settings.paperWidthMm === w ? 'border-accent bg-accent/10' : 'border-border'
                  }`}
                >
                  {w} mm
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.openDrawer}
              onChange={(e) => void save({ openDrawer: e.target.checked })}
            />
            Abrir cajón en pagos en efectivo
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.cut}
              onChange={(e) => void save({ cut: e.target.checked })}
            />
            Cortar papel al final
          </label>

          <button
            type="button"
            onClick={() => void testPrint()}
            className="px-4 py-2 rounded bg-accent text-accent-foreground font-semibold"
          >
            Imprimir ticket de prueba
          </button>
        </>
      )}
    </div>
  );
}
