import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Plus, DollarSign, TrendingUp, TrendingDown, X, Save, CreditCard, Landmark, Trash2, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import * as corteCajaService from '../../services/corte-caja.service';

export default function Cash() {
  const navigate = useNavigate();
  const { orders, cashTransactions, addExpense, deleteCashTransactionsByDateRange, deleteCashTransactionsByOrderId } = useApp();

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showClearForm, setShowClearForm] = useState(false);
  const [showDeleteOrderForm, setShowDeleteOrderForm] = useState(false);
  const [clearDateStart, setClearDateStart] = useState('');
  const [clearDateEnd, setClearDateEnd] = useState('');
  const [selectedOrdersToDelete, setSelectedOrdersToDelete] = useState<string[]>([]);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
  });
  const [filterDate, setFilterDate] = useState('');
  
  // Estados para Corte de Caja
  const [activeTab, setActiveTab] = useState<'transactions' | 'cut' | 'history'>('transactions');
  const [showCutDialog, setShowCutDialog] = useState(false);
  const [countedAmount, setCountedAmount] = useState('');
  const [cutNotes, setCutNotes] = useState('');
  const [cortes, setCortes] = useState<corteCajaService.CorteCaja[]>([]);
  const [loadingCortes, setLoadingCortes] = useState(false);

  // Cargar cortes al montar componente
  useEffect(() => {
    const loadCortes = async () => {
      try {
        setLoadingCortes(true);
        const allCortes = await corteCajaService.getAllCortes();
        setCortes(allCortes);
      } catch (error) {
        console.error('Error cargando cortes:', error);
        toast.error('Error al cargar cortes de caja');
      } finally {
        setLoadingCortes(false);
      }
    };
    
    loadCortes();
  }, []);

  // Obtener órdenes únicas que tienen transacciones en caja
  const ordersWithTransactions = [...new Set(
    cashTransactions
      .map(t => {
        // Intentar obtener ordenId del field
        if (t.ordenId) return t.ordenId;
        
        // Si no existe, intentar extraerlo del motivo (Ej: "Orden #9iz5 - Delivery")
        const match = t.motivo?.match(/#([A-Za-z0-9]+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[]
  )]
    .map(ordenId => {
      const order = orders.find(o => o.id === ordenId);
      const orderTransactions = cashTransactions.filter(t => {
        const transOrdenId = t.ordenId || (t.motivo?.match(/#([A-Za-z0-9]+)/) as RegExpMatchArray)?.[1];
        return transOrdenId === ordenId;
      });
      const totalAmount = orderTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      console.log('Debug Order:', { ordenId, order, transactionCount: orderTransactions.length, transactions: orderTransactions });
      
      return {
        id: ordenId,
        order,
        totalAmount,
        transactionCount: orderTransactions.length
      };
    })
    .sort((a, b) => {
      const dateA = a.order?.createdAt ? new Date(a.order.createdAt).getTime() : 0;
      const dateB = b.order?.createdAt ? new Date(b.order.createdAt).getTime() : 0;
      return dateB - dateA;
    });

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

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto debe ser un número válido mayor a 0');
      return;
    }

    try {
      await addExpense(amount, expenseForm.description);
      toast.success('Gasto registrado');
      setShowExpenseForm(false);
      setExpenseForm({ amount: '', description: '' });
    } catch (error) {
      toast.error('Error al registrar gasto');
      console.error(error);
    }
  };

  const handleClearData = async () => {
    if (!clearDateStart || !clearDateEnd) {
      toast.error('Por favor selecciona un rango de fechas');
      return;
    }

    const startDate = new Date(clearDateStart);
    const endDate = new Date(clearDateEnd);

    if (startDate > endDate) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar todas las transacciones entre ${clearDateStart} y ${clearDateEnd}? Esta acción no se puede deshacer.`)) {
      try {
        await deleteCashTransactionsByDateRange(startDate, endDate);
        toast.success('Transacciones eliminadas correctamente');
        setShowClearForm(false);
        setClearDateStart('');
        setClearDateEnd('');
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al eliminar transacciones');
      }
    }
  };

  const handleDeleteOrder = async () => {
    if (selectedOrdersToDelete.length === 0) {
      toast.error('Por favor selecciona al menos una orden');
      return;
    }

    const totalTransactions = ordersWithTransactions
      .filter(o => selectedOrdersToDelete.includes(o.id))
      .reduce((sum, o) => sum + o.transactionCount, 0);

    if (confirm(`¿Estás seguro de que deseas eliminar ${totalTransactions} transacción(es) de ${selectedOrdersToDelete.length} orden(es)? Esta acción no se puede deshacer.`)) {
      try {
        let totalDeleted = 0;
        for (const orderId of selectedOrdersToDelete) {
          const count = await deleteCashTransactionsByOrderId(orderId);
          totalDeleted += count;
        }
        toast.success(`${totalDeleted} transacción(es) eliminada(s)`);
        setShowDeleteOrderForm(false);
        setSelectedOrdersToDelete([]);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al eliminar órdenes');
      }
    }
  };

  const handleToggleOrder = (orderId: string) => {
    setSelectedOrdersToDelete(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  // Funciones para Corte de Caja
  const getTodayTransactions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return cashTransactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      transactionDate.setHours(0, 0, 0, 0);
      return transactionDate.getTime() === today.getTime();
    });
  };

  const calculateCutSummary = () => {
    const todayTransactions = getTodayTransactions();
    
    const totalIncome = todayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = todayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const cashPayments = todayTransactions
      .filter(t => t.type === 'income' && t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.amount, 0);

    const cardPayments = todayTransactions
      .filter(t => t.type === 'income' && t.paymentMethod === 'card')
      .reduce((sum, t) => sum + t.amount, 0);

    const transferPayments = todayTransactions
      .filter(t => t.type === 'income' && t.paymentMethod === 'transfer')
      .reduce((sum, t) => sum + t.amount, 0);

    const theoreticalTotal = cashPayments + cardPayments + transferPayments;

    return {
      totalIncome,
      totalExpense,
      cashPayments,
      cardPayments,
      transferPayments,
      theoreticalTotal,
    };
  };

  const handleSaveCut = async () => {
    const counted = parseFloat(countedAmount);
    if (isNaN(counted) || counted < 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    const summary = calculateCutSummary();
    const difference = counted - summary.theoreticalTotal;

    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const cutId = await corteCajaService.crearCorteCaja({
        date: today,
        startTime: startOfDay,
        endTime: new Date(),
        totalIncome: summary.totalIncome,
        totalExpense: summary.totalExpense,
        cashPayments: summary.cashPayments,
        cardPayments: summary.cardPayments,
        transferPayments: summary.transferPayments,
        theoreticalTotal: summary.theoreticalTotal,
        countedAmount: counted,
        difference: difference,
        notes: cutNotes,
      });

      toast.success(`Corte de caja realizado. Diferencia: ${difference >= 0 ? '+' : ''}$${difference.toFixed(2)}`);
      setShowCutDialog(false);
      setCountedAmount('');
      setCutNotes('');
      
      // Recargar cortes
      const allCortes = await corteCajaService.getAllCortes();
      setCortes(allCortes);
    } catch (error) {
      toast.error('Error al guardar corte de caja');
      console.error(error);
    }
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

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-border">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 border-b-2 transition-colors ${
                activeTab === 'transactions'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              📊 Transacciones
            </button>
            <button
              onClick={() => setActiveTab('cut')}
              className={`px-6 py-3 border-b-2 transition-colors ${
                activeTab === 'cut'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              📋 Realizar Corte
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              📅 Histórico de Cortes
            </button>
          </div>

          {/* Filter - Only show in transactions tab */}
          {activeTab === 'transactions' && (
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
                  onClick={() => setShowCutDialog(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  <FileText size={20} />
                  Corte de Caja
                </button>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-accent text-accent-foreground px-6 py-2 rounded hover:opacity-90 transition-opacity flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  <Plus size={20} />
                  Registrar Gasto
                </button>
                <button
                  onClick={() => setShowClearForm(true)}
                  className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  <Trash2 size={20} />
                  Limpiar Datos
                </button>
                <button
                  onClick={() => setShowDeleteOrderForm(true)}
                  className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  <Trash2 size={20} />
                  Eliminar Orden
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Conditional Content based on Tab */}
        {activeTab === 'transactions' ? (
          <>
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
          </>
        ) : activeTab === 'cut' ? (
          <>
            {/* Corte de Caja Section */}
            <div className="space-y-6">
              {/* Summary */}
              {(() => {
                const summary = calculateCutSummary();
                return (
                  <>
                    <div className="bg-card border border-border rounded-lg p-6">
                      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        Resumen del Corte de Caja
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-green-50 border-2 border-green-200 rounded p-4">
                          <p className="text-muted-foreground mb-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>INGRESOS</p>
                          <p className="text-green-600" style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 700 }}>
                            ${summary.totalIncome.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="bg-red-50 border-2 border-red-200 rounded p-4">
                          <p className="text-muted-foreground mb-2" style={{ fontSize: '0.875rem', fontWeight: 600 }}>EGRESOS</p>
                          <p className="text-red-600" style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', fontWeight: 700 }}>
                            ${summary.totalExpense.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6 mb-6">
                        <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                          Desglose por Método de Pago:
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-green-100 p-4 rounded">
                            <p className="text-sm text-green-900 mb-2" style={{ fontWeight: 600 }}>💵 Efectivo</p>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>
                              ${summary.cashPayments.toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="bg-blue-100 p-4 rounded">
                            <p className="text-sm text-blue-900 mb-2" style={{ fontWeight: 600 }}>💳 Tarjeta</p>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 700, color: '#1e40af' }}>
                              ${summary.cardPayments.toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="bg-purple-100 p-4 rounded">
                            <p className="text-sm text-purple-900 mb-2" style={{ fontWeight: 600 }}>🏦 Transferencia</p>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 700, color: '#6b21a8' }}>
                              ${summary.transferPayments.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6">
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                          TOTAL TEÓRICO (efectivo + tarjeta + transferencia):
                        </p>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.875rem', fontWeight: 700, color: '#000' }}>
                          ${summary.theoreticalTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Counted Amount Input */}
                    <div className="bg-card border border-border rounded-lg p-6">
                      <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                        Conteo Físico
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                            Monto Contado en Caja *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={countedAmount}
                            onChange={(e) => setCountedAmount(e.target.value)}
                            className="w-full px-4 py-3 border border-border rounded bg-input text-lg font-bold text-right"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          />
                        </div>

                        {countedAmount && (() => {
                          const counted = parseFloat(countedAmount);
                          const difference = counted - summary.theoreticalTotal;
                          return (
                            <div className={`p-4 rounded border-2 ${difference === 0 ? 'bg-green-50 border-green-300' : difference > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300'}`}>
                              <p className="text-sm mb-2" style={{ fontWeight: 600, color: difference === 0 ? '#166534' : difference > 0 ? '#92400e' : '#7f1d1d' }}>
                                Diferencia:
                              </p>
                              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.875rem', fontWeight: 700, color: difference === 0 ? '#16a34a' : difference > 0 ? '#ca8a04' : '#dc2626' }}>
                                {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                              </p>
                              <p className="text-xs mt-2" style={{ color: difference === 0 ? '#166534' : difference > 0 ? '#92400e' : '#7f1d1d' }}>
                                {difference === 0 && '✓ Cuadra perfectamente'}
                                {difference > 0 && `Falta registrar -$${difference.toFixed(2)}`}
                                {difference < 0 && `Exceso de -$${Math.abs(difference).toFixed(2)}`}
                              </p>
                            </div>
                          );
                        })()}

                        <div>
                          <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                            Notas (opcional)
                          </label>
                          <textarea
                            value={cutNotes}
                            onChange={(e) => setCutNotes(e.target.value)}
                            placeholder="Ej: Discrepancia por cambio de cajero, revisión pendiente..."
                            rows={3}
                            className="w-full px-4 py-3 border border-border rounded bg-input resize-none"
                            style={{ fontFamily: 'var(--font-sans)' }}
                          />
                        </div>

                        <button
                          onClick={handleSaveCut}
                          disabled={!countedAmount}
                          className="w-full bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                          style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1rem' }}
                        >
                          <Save size={20} />
                          Guardar Corte de Caja
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        ) : (
          <>
            {/* Histórico de Cortes */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600 }}>
                    Histórico de Cortes de Caja
                  </h2>
                  <span className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
                    {loadingCortes ? 'Cargando...' : `${cortes.length} corte${cortes.length !== 1 ? 's' : ''}`}
                  </span>
                </div>

                {loadingCortes ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-accent rounded-full animate-spin"></div>
                    <p style={{ fontFamily: 'var(--font-sans)', marginTop: '1rem' }}>Cargando cortes...</p>
                  </div>
                ) : cortes.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <Calendar size={64} className="mx-auto mb-4 opacity-20" />
                    <p style={{ fontFamily: 'var(--font-sans)' }}>No hay cortes de caja registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="text-left p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Fecha</th>
                          <th className="text-left p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Hora del Corte</th>
                          <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Ingresos</th>
                          <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Egresos</th>
                          <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Efectivo</th>
                          <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Tarjeta</th>
                          <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Transferencia</th>
                          <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Teórico</th>
                          <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Conteo</th>
                          <th className="text-right p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Diferencia</th>
                          <th className="text-left p-4" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cortes.map((corte) => {
                          const difColor = corte.difference === 0 ? 'text-green-600' : corte.difference > 0 ? 'text-yellow-600' : 'text-red-600';
                          return (
                            <tr key={corte.id} className="border-t border-border hover:bg-secondary transition-colors">
                              <td className="p-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>
                                {new Date(corte.date).toLocaleDateString('es-MX')}
                              </td>
                              <td className="p-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>
                                {new Date(corte.endTime).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="p-4 text-right text-green-600" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.875rem' }}>
                                ${corte.totalIncome.toFixed(2)}
                              </td>
                              <td className="p-4 text-right text-red-600" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.875rem' }}>
                                ${corte.totalExpense.toFixed(2)}
                              </td>
                              <td className="p-4 text-right" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#166534' }}>
                                ${corte.cashPayments.toFixed(2)}
                              </td>
                              <td className="p-4 text-right" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#1e40af' }}>
                                ${corte.cardPayments.toFixed(2)}
                              </td>
                              <td className="p-4 text-right" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: '#6b21a8' }}>
                                ${corte.transferPayments.toFixed(2)}
                              </td>
                              <td className="p-4 text-right text-muted-foreground" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>
                                ${corte.theoreticalTotal.toFixed(2)}
                              </td>
                              <td className="p-4 text-right" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.875rem' }}>
                                ${corte.countedAmount.toFixed(2)}
                              </td>
                              <td className={`p-4 text-right ${difColor}`} style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.875rem' }}>
                                {corte.difference >= 0 ? '+' : ''}${corte.difference.toFixed(2)}
                              </td>
                              <td className="p-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: '#666', maxWidth: '150px' }}>
                                <span title={corte.notes}>{corte.notes ? corte.notes.substring(0, 20) + '...' : '-'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Clear Data Modal */}
      {showClearForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-red-300 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, color: '#dc2626' }}>
                Limpiar Datos de Caja
              </h3>
              <button onClick={() => setShowClearForm(false)} className="p-2 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                ⚠️ Esto eliminará TODAS las transacciones de caja en el rango de fechas seleccionado. Esta acción NO se puede deshacer.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  value={clearDateStart}
                  onChange={(e) => setClearDateStart(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded bg-input"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  Fecha de Fin *
                </label>
                <input
                  type="date"
                  value={clearDateEnd}
                  onChange={(e) => setClearDateEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded bg-input"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowClearForm(false)}
                  className="flex-1 border border-border px-4 py-3 rounded hover:bg-secondary"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded hover:bg-red-700 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  <Trash2 size={20} />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Modal */}
      {showDeleteOrderForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-orange-300 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, color: '#ea580c' }}>
                Eliminar Orden
              </h3>
              <button onClick={() => setShowDeleteOrderForm(false)} className="p-2 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-orange-100 border border-orange-200 rounded">
              <p className="text-sm text-orange-800">
                ⚠️ Esto eliminará las transacciones de caja asociadas a esta orden. Esta acción NO se puede deshacer.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  Selecciona Órdenes *
                </label>
                {ordersWithTransactions.length === 0 ? (
                  <div className="w-full px-4 py-3 border border-border rounded bg-secondary text-muted-foreground text-center" style={{ fontFamily: 'var(--font-sans)' }}>
                    No hay órdenes para eliminar
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto border border-border rounded p-3">
                    {ordersWithTransactions.map((item, index) => (
                      <label
                        key={`order-${item.id}-${index}`}
                        className="flex items-start gap-3 p-3 rounded border border-border hover:bg-secondary transition-colors cursor-pointer"
                        style={{ fontFamily: 'var(--font-sans)' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOrdersToDelete.includes(item.id)}
                          onChange={() => handleToggleOrder(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p style={{ fontWeight: 600 }}>
                            {item.id ? `Orden #${item.id}` : 'Orden sin ID'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.transactionCount} transacción{item.transactionCount !== 1 ? 'es' : ''} • ${item.totalAmount.toFixed(2)}
                          </p>
                          {item.order?.paymentMethod && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.order.paymentMethod === 'cash' && '💵 Efectivo'}
                              {item.order.paymentMethod === 'card' && '💳 Tarjeta'}
                              {item.order.paymentMethod === 'transfer' && '🏦 Transferencia'}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {selectedOrdersToDelete.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-sm font-semibold text-orange-900" style={{ fontFamily: 'var(--font-sans)' }}>
                    {selectedOrdersToDelete.length} orden{selectedOrdersToDelete.length !== 1 ? 'es' : ''} seleccionada{selectedOrdersToDelete.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteOrderForm(false);
                    setSelectedOrdersToDelete([]);
                  }}
                  className="flex-1 border border-border px-4 py-3 rounded hover:bg-secondary"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteOrder}
                  disabled={selectedOrdersToDelete.length === 0}
                  className={`flex-1 text-white px-4 py-3 rounded flex items-center justify-center gap-2 transition-colors ${
                    selectedOrdersToDelete.length > 0
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  <Trash2 size={20} />
                  Eliminar {selectedOrdersToDelete.length > 0 && `(${selectedOrdersToDelete.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Cut Dialog */}
      {showCutDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-2xl w-full p-6 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                Corte de Caja
              </h3>
              <button onClick={() => setShowCutDialog(false)} className="p-2 hover:bg-secondary rounded">
                <X size={20} />
              </button>
            </div>

            <p className="text-muted-foreground mb-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem' }}>
              Ingresa el monto físico contado en caja para realizar el corte del día.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  Monto Contado *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={countedAmount}
                  onChange={(e) => setCountedAmount(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 border border-border rounded bg-input text-lg font-bold text-right"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div>
                <label className="block mb-2" style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  Notas
                </label>
                <textarea
                  value={cutNotes}
                  onChange={(e) => setCutNotes(e.target.value)}
                  placeholder="Ej: Discrepancia por cambio de cajero..."
                  rows={2}
                  className="w-full px-4 py-3 border border-border rounded bg-input resize-none"
                  style={{ fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCutDialog(false)}
                  className="flex-1 border border-border px-4 py-3 rounded hover:bg-secondary"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCut}
                  disabled={!countedAmount}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                >
                  <FileText size={20} />
                  Generar Corte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
