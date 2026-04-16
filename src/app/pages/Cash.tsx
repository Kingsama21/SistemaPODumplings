import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Plus, DollarSign, TrendingUp, TrendingDown, X, Save, CreditCard, Landmark } from 'lucide-react';
import { toast } from 'sonner';

export default function Cash() {
  const navigate = useNavigate();
  const { cashTransactions, addExpense } = useApp();

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
  });
  const [filterDate, setFilterDate] = useState('');

  const filteredTransactions = filterDate
    ? cashTransactions.filter(t => {
        const transactionDate = new Date(t.timestamp);
        const year = transactionDate.getFullYear();
        const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
        const day = String(transactionDate.getDate()).padStart(2, '0');
        const localDate = `${year}-${month}-${day}`;
        return localDate === filterDate;
      })
    : cashTransactions;

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Desglose por método de pago
  const cashIncome = filteredTransactions
    .filter(t => t.type === 'income' && t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);

  const cardIncome = filteredTransactions
    .filter(t => t.type === 'income' && t.paymentMethod === 'card')
    .reduce((sum, t) => sum + t.amount, 0);

  const transferIncome = filteredTransactions
    .filter(t => t.type === 'income' && t.paymentMethod === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleSaveExpense = () => {
    if (!expenseForm.amount || !expenseForm.description) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto debe ser un número válido mayor a 0');
      return;
    }

    addExpense(amount, expenseForm.description);
    toast.success('Gasto registrado');
    setShowExpenseForm(false);
    setExpenseForm({ amount: '', description: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-secondary transition-colors rounded"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600 }}>
              Control de Caja
            </h1>
          </div>

          {/* Filter */}
          <div className="flex gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded bg-input"
                style={{ fontFamily: 'var(--font-sans)' }}
              />
            </div>
            <div className="flex gap-2">
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  Ver todo
                </button>
              )}
              <button
                onClick={() => setShowExpenseForm(true)}
                className="bg-accent text-accent-foreground px-6 py-2 rounded hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
              >
                <Plus size={20} />
                Registrar Gasto
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded">
                <TrendingUp size={24} className="text-green-600" />
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                Total Ingresos
              </p>
            </div>
            <p className="text-green-600" style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 700 }}>
              ${totalIncome}
            </p>
          </div>

          <div className="bg-card border border-border rounded p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded">
                <TrendingDown size={24} className="text-red-600" />
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                Total Egresos
              </p>
            </div>
            <p className="text-red-600" style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 700 }}>
              ${totalExpense}
            </p>
          </div>

          <div className="bg-card border border-border rounded p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-accent/10 rounded">
                <DollarSign size={24} className="text-accent" />
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                Balance
              </p>
            </div>
            <p className={balance >= 0 ? 'text-accent' : 'text-red-600'} style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 700 }}>
              ${balance}
            </p>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border-2 border-green-200 rounded p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded">
                <DollarSign size={24} className="text-green-600" />
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                Efectivo
              </p>
            </div>
            <p className="text-green-600" style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700 }}>
              ${cashIncome.toFixed(2)}
            </p>
          </div>

          <div className="bg-card border-2 border-blue-200 rounded p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded">
                <CreditCard size={24} className="text-blue-600" />
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                Tarjeta
              </p>
            </div>
            <p className="text-blue-600" style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700 }}>
              ${cardIncome.toFixed(2)}
            </p>
          </div>

          <div className="bg-card border-2 border-purple-200 rounded p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded">
                <Landmark size={24} className="text-purple-600" />
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '0.875rem' }}>
                Transferencia
              </p>
            </div>
            <p className="text-purple-600" style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700 }}>
              ${transferIncome.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600 }}>
              Historial de Movimientos
            </h2>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <DollarSign size={64} className="mx-auto mb-4 opacity-20" />
              <p style={{ fontFamily: 'var(--font-sans)' }}>No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Tipo</th>
                    <th className="text-left p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Descripción</th>
                    <th className="text-left p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Fecha y Hora</th>
                    <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-t border-border hover:bg-secondary transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {t.type === 'income' ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <TrendingUp size={16} />
                              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Ingreso</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <TrendingDown size={16} />
                              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Egreso</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{t.description}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(t.timestamp).toLocaleDateString('es-MX')} {new Date(t.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-right">
                        <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'} style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.125rem' }}>
                          {t.type === 'income' ? '+' : '-'}${t.amount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                Registrar Gasto
              </h3>
              <button onClick={() => setShowExpenseForm(false)} className="p-2 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded bg-input"
                  placeholder="0.00"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  Motivo *
                </label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded bg-input"
                  placeholder="Ej: Proveedor de vegetales"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowExpenseForm(false)}
                  className="flex-1 border border-border px-4 py-3 rounded hover:bg-secondary"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveExpense}
                  className="flex-1 bg-accent text-accent-foreground px-4 py-3 rounded hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  <Save size={20} />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
