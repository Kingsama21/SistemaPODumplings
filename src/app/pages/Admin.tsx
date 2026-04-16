import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp, Product, Ingredient, Category, Discount, Promotion } from '../context/AppContext';
import { ArrowLeft, Plus, Edit2, Trash2, X, Save, Tag, Package, Percent, Ticket, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Admin() {
  const navigate = useNavigate();
  const { 
    products, 
    ingredients,
    categories, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    updateIngredientStock,
    getLowStockIngredients,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    discounts,
    createPromotion,
    updatePromotion,
    deletePromotion,
    promotions,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'ingredients' | 'discounts' | 'promotions' | 'categories'>('products');

  // ============ PRODUCTOS ============
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    category: '',
    image: ''
  });

  const openProductForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        price: product.price.toString(),
        category: product.category,
        image: product.image || ''
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', price: '', category: categories[0]?.name || '', image: '' });
    }
    setShowProductForm(true);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductForm({ name: '', price: '', category: '', image: '' });
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.category) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const price = parseFloat(productForm.price);
    if (isNaN(price) || price <= 0) {
      toast.error('El precio debe ser válido');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: productForm.name,
          price,
          category: productForm.category,
          image: productForm.image || undefined
        });
        toast.success('Producto actualizado');
      } else {
        addProduct({
          name: productForm.name,
          price,
          category: productForm.category,
          image: productForm.image || undefined
        });
        toast.success('Producto creado');
      }
      closeProductForm();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (confirm(`¿Eliminar "${name}"?`)) {
      deleteProduct(id);
      toast.success('Producto eliminado');
    }
  };

  // ============ INGREDIENTES ============
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    stock: '',
    unit: '',
    minStock: '',
  });
  
  const lowStockIngredients = getLowStockIngredients(5);

  const openIngredientForm = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setIngredientForm({
        name: ingredient.name,
        stock: ingredient.stock.toString(),
        unit: ingredient.unit,
        minStock: (ingredient.minStock || '').toString(),
      });
    } else {
      setEditingIngredient(null);
      setIngredientForm({
        name: '',
        stock: '',
        unit: '',
        minStock: '',
      });
    }
    setShowIngredientForm(true);
  };

  const closeIngredientForm = () => {
    setShowIngredientForm(false);
    setEditingIngredient(null);
    setIngredientForm({
      name: '',
      stock: '',
      unit: '',
      minStock: '',
    });
  };

  const handleSaveIngredient = async () => {
    if (!ingredientForm.name || !ingredientForm.stock || !ingredientForm.unit) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const stock = parseFloat(ingredientForm.stock);
    const minStock = ingredientForm.minStock ? parseFloat(ingredientForm.minStock) : undefined;

    if (isNaN(stock) || stock < 0) {
      toast.error('Stock debe ser un número válido');
      return;
    }

    try {
      if (editingIngredient) {
        await updateIngredient(editingIngredient.id, {
          name: ingredientForm.name,
          stock,
          unit: ingredientForm.unit,
          minStock,
        });
        toast.success('Ingrediente actualizado');
      } else {
        addIngredient({
          name: ingredientForm.name,
          stock,
          unit: ingredientForm.unit,
          minStock,
        });
        toast.success('Ingrediente creado');
      }
      closeIngredientForm();
    } catch (error) {
      console.error('Error al guardar ingrediente:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDeleteIngredient = (id: string, name: string) => {
    if (confirm(`¿Eliminar "${name}"?`)) {
      deleteIngredient(id);
      toast.success('Ingrediente eliminado');
    }
  };

  // ============ DESCUENTOS ============
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'percentage' as const,
    value: '',
    applicableTo: 'all' as const,
    targetId: '',
    active: true
  });

  const openDiscountForm = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setDiscountForm({
        name: discount.name,
        type: discount.type,
        value: discount.value.toString(),
        applicableTo: discount.applicableTo || 'all',
        targetId: discount.targetId || '',
        active: discount.active
      });
    } else {
      setEditingDiscount(null);
      setDiscountForm({
        name: '',
        type: 'percentage',
        value: '',
        applicableTo: 'all',
        targetId: '',
        active: true
      });
    }
    setShowDiscountForm(true);
  };

  const handleSaveDiscount = async () => {
    if (!discountForm.name || !discountForm.value) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const value = parseFloat(discountForm.value);
    if (isNaN(value) || value <= 0) {
      toast.error('Valor inválido');
      return;
    }

    try {
      if (editingDiscount) {
        await updateDiscount(editingDiscount.id, {
          name: discountForm.name,
          type: discountForm.type,
          value,
          applicableTo: discountForm.applicableTo,
          targetId: discountForm.targetId || undefined,
          active: discountForm.active
        });
        toast.success('Descuento actualizado');
      } else {
        await createDiscount({
          name: discountForm.name,
          type: discountForm.type,
          value,
          applicableTo: discountForm.applicableTo,
          targetId: discountForm.targetId || undefined,
          active: discountForm.active
        });
        toast.success('Descuento creado');
      }
      setShowDiscountForm(false);
    } catch (error) {
      console.error('Error al guardar descuento:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDeleteDiscount = (id: string) => {
    if (confirm('¿Eliminar descuento?')) {
      deleteDiscount(id);
      toast.success('Descuento eliminado');
    }
  };

  // ============ PROMOCIONES ============
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [promotionForm, setPromotionForm] = useState({
    code: '',
    discountId: '',
    usageLimit: '',
    expiresAt: '',
    active: true
  });

  const openPromotionForm = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setPromotionForm({
        code: promotion.code,
        discountId: promotion.discount.id,
        usageLimit: (promotion.usageLimit || '').toString(),
        expiresAt: promotion.expiresAt ? new Date(promotion.expiresAt).toISOString().split('T')[0] : '',
        active: promotion.active
      });
    } else {
      setEditingPromotion(null);
      setPromotionForm({
        code: '',
        discountId: '',
        usageLimit: '',
        expiresAt: '',
        active: true
      });
    }
    setShowPromotionForm(true);
  };

  const handleSavePromotion = async () => {
    if (!promotionForm.code || !promotionForm.discountId) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    try {
      const selectedDiscount = discounts.find(d => d.id === promotionForm.discountId);
      if (!selectedDiscount) {
        toast.error('Descuento no válido');
        return;
      }

      const promotion = {
        code: promotionForm.code.toUpperCase(),
        discount: selectedDiscount,
        usageLimit: promotionForm.usageLimit ? parseInt(promotionForm.usageLimit) : undefined,
        expiresAt: promotionForm.expiresAt ? new Date(promotionForm.expiresAt).toISOString() : undefined,
        active: promotionForm.active,
        usageCount: editingPromotion?.usageCount || 0
      };

      if (editingPromotion) {
        await updatePromotion(editingPromotion.id, promotion);
        toast.success('Promoción actualizada');
      } else {
        await createPromotion(promotion);
        toast.success('Promoción creada');
      }
      setShowPromotionForm(false);
    } catch (error) {
      console.error('Error al guardar promoción:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDeletePromotion = (id: string) => {
    if (confirm('¿Eliminar promoción?')) {
      deletePromotion(id);
      toast.success('Promoción eliminada');
    }
  };

  // ============ CATEGORÍAS ============
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const openCategoryForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryName);
        toast.success('Categoría actualizada');
      } else {
        addCategory({ name: categoryName });
        toast.success('Categoría creada');
      }
      setShowCategoryForm(false);
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      toast.error('Error al guardar');
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    const productsInCategory = products.filter(p => p.category === name);
    if (productsInCategory.length > 0) {
      toast.error(`Hay ${productsInCategory.length} producto(s) en esta categoría`);
      return;
    }
    if (confirm(`¿Eliminar "${name}"?`)) {
      deleteCategory(id);
      toast.success('Categoría eliminada');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-secondary transition-colors rounded"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600 }}>
            Panel de Administración
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border overflow-x-auto">
          {[
            { id: 'products', label: 'Productos', icon: Package },
            { id: 'ingredients', label: 'Ingredientes', icon: AlertCircle },
            { id: 'discounts', label: 'Descuentos', icon: Percent },
            { id: 'promotions', label: 'Promociones', icon: Ticket },
            { id: 'categories', label: 'Categorías', icon: Tag }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* PRODUCTOS */}
        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600 }}>
                Gestión de Productos
              </h2>
              <Button onClick={() => openProductForm()} className="flex items-center gap-2">
                <Plus size={20} />
                Nuevo Producto
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <div key={product.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                        {product.name}
                      </h3>
                      <span className="inline-block bg-secondary px-3 py-1 rounded text-sm text-muted-foreground">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-accent mb-4" style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 700 }}>
                    ${product.price}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openProductForm(product)}
                      className="flex-1 border border-border px-4 py-2 rounded hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                      style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      className="px-4 py-2 rounded border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INGREDIENTES */}
        {activeTab === 'ingredients' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600 }}>
                Gestión de Ingredientes y Insumos
              </h2>
              <Button onClick={() => openIngredientForm()} className="flex items-center gap-2">
                <Plus size={20} />
                Nuevo Ingrediente
              </Button>
            </div>

            {lowStockIngredients.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
                <p className="font-semibold text-orange-600 text-sm">⚠️ {lowStockIngredients.length} ingrediente(s) con stock bajo</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ingredients.map(ingredient => {
                const isLow = ingredient.stock <= (ingredient.minStock || 5);
                return (
                  <div 
                    key={ingredient.id} 
                    className={`rounded-lg p-6 border transition-all ${
                      isLow 
                        ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' 
                        : 'bg-card border-border hover:shadow-lg'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                          {ingredient.name}
                        </h3>
                        <span className={`inline-block rounded text-sm px-3 py-1 ${
                          isLow 
                            ? 'bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200' 
                            : 'bg-secondary text-muted-foreground'
                        }`}>
                          {ingredient.unit}
                        </span>
                      </div>
                      {isLow && <AlertCircle size={20} className="text-orange-600" />}
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-1">Stock actual</p>
                      <p className={`text-2xl font-bold ${isLow ? 'text-orange-600' : 'text-accent'}`}>
                        {ingredient.stock} {ingredient.unit}
                      </p>
                      {ingredient.minStock && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Mínimo: {ingredient.minStock} {ingredient.unit}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openIngredientForm(ingredient)}
                        className="flex-1 border border-border px-4 py-2 rounded hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                        style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                      >
                        <Edit2 size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteIngredient(ingredient.id, ingredient.name)}
                        className="px-4 py-2 rounded border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DESCUENTOS */}
        {activeTab === 'discounts' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600 }}>
                Gestión de Descuentos
              </h2>
              <Button onClick={() => openDiscountForm()} className="flex items-center gap-2">
                <Plus size={20} />
                Nuevo Descuento
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discounts.map(discount => (
                <div key={discount.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{discount.name}</h3>
                      <p className="text-muted-foreground text-sm">
                        {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                      </p>
                    </div>
                    <Badge variant={discount.active ? 'default' : 'secondary'}>
                      {discount.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 capitalize">
                    Aplica a: {discount.applicableTo}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDiscountForm(discount)}
                      className="flex-1 border border-border px-3 py-2 rounded text-sm hover:bg-secondary transition-colors"
                    >
                      <Edit2 size={14} className="inline mr-1" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteDiscount(discount.id)}
                      className="px-3 py-2 rounded border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROMOCIONES */}
        {activeTab === 'promotions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600 }}>
                Gestión de Promociones (Códigos)
              </h2>
              <Button onClick={() => openPromotionForm()} className="flex items-center gap-2">
                <Plus size={20} />
                Nuevo Código
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map(promotion => (
                <div key={promotion.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold font-mono text-lg">{promotion.code}</h3>
                      <p className="text-muted-foreground text-sm">
                        {promotion.discount.type === 'percentage' ? `${promotion.discount.value}%` : `$${promotion.discount.value}`} de descuento
                      </p>
                    </div>
                    <Badge variant={promotion.active ? 'default' : 'secondary'}>
                      {promotion.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Usos: {promotion.usageCount} {promotion.usageLimit ? `/ ${promotion.usageLimit}` : ''}
                  </p>
                  {promotion.expiresAt && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Expira: {new Date(promotion.expiresAt).toLocaleDateString('es-MX')}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => openPromotionForm(promotion)}
                      className="flex-1 border border-border px-3 py-2 rounded text-sm hover:bg-secondary transition-colors"
                    >
                      <Edit2 size={14} className="inline mr-1" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promotion.id)}
                      className="px-3 py-2 rounded border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORÍAS */}
        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 600 }}>
                Gestión de Categorías
              </h2>
              <Button onClick={() => openCategoryForm()} className="flex items-center gap-2">
                <Plus size={20} />
                Nueva Categoría
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(category => {
                const count = products.filter(p => p.category === category.name).length;
                return (
                  <div key={category.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <h3 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                      {category.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {count} producto{count !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openCategoryForm(category)}
                        className="flex-1 border border-border px-4 py-2 rounded hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="px-4 py-2 rounded border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        disabled={count > 0}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Diálogos */}
      <ProductDialog 
        isOpen={showProductForm}
        onClose={closeProductForm}
        onSave={handleSaveProduct}
        formData={productForm}
        setFormData={setProductForm}
        categories={categories}
        isEditing={!!editingProduct}
      />

      <IngredientDialog
        isOpen={showIngredientForm}
        onClose={closeIngredientForm}
        onSave={handleSaveIngredient}
        formData={ingredientForm}
        setFormData={setIngredientForm}
        isEditing={!!editingIngredient}
      />

      <DiscountDialog
        isOpen={showDiscountForm}
        onClose={() => setShowDiscountForm(false)}
        onSave={handleSaveDiscount}
        formData={discountForm}
        setFormData={setDiscountForm}
        products={products}
        isEditing={!!editingDiscount}
      />

      <PromotionDialog
        isOpen={showPromotionForm}
        onClose={() => setShowPromotionForm(false)}
        onSave={handleSavePromotion}
        formData={promotionForm}
        setFormData={setPromotionForm}
        discounts={discounts}
        isEditing={!!editingPromotion}
      />

      <CategoryDialog
        isOpen={showCategoryForm}
        onClose={() => setShowCategoryForm(false)}
        onSave={handleSaveCategory}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        isEditing={!!editingCategory}
      />
    </div>
  );
}

// Componentes de diálogos
function ProductDialog({ isOpen, onClose, onSave, formData, setFormData, categories, isEditing }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del producto"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Precio</label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Categoría</label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat: Category) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog({ isOpen, onClose, onSave, formData, setFormData, products, isEditing }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Descuento' : 'Nuevo Descuento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Promo Viernes"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Valor</label>
              <Input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Aplica a</label>
            <Select value={formData.applicableTo} onValueChange={(value) => setFormData({ ...formData, applicableTo: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                <SelectItem value="product">Producto específico</SelectItem>
                <SelectItem value="order">Orden completa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IngredientDialog({ isOpen, onClose, onSave, formData, setFormData, isEditing }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Carne Molida de Cerdo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Stock</label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Unidad</label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="unidad">unidad</SelectItem>
                  <SelectItem value="docena">docena</SelectItem>
                  <SelectItem value="paquete">paquete</SelectItem>
                  <SelectItem value="caja">caja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Stock Mínimo (Opcional)</label>
            <Input
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
              placeholder="0"
              step="0.1"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PromotionDialog({ isOpen, onClose, onSave, formData, setFormData, discounts, isEditing }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Promoción' : 'Nuevo Código'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Código</label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="VERANO2024"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descuento</label>
            <Select value={formData.discountId} onValueChange={(value) => setFormData({ ...formData, discountId: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {discounts.map((d: Discount) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.type === 'percentage' ? `${d.value}%` : `$${d.value}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Límite de usos</label>
              <Input
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                placeholder="Sin límite"
                min="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Vence el</label>
              <Input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ isOpen, onClose, onSave, categoryName, setCategoryName, isEditing }: any) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nombre de la categoría"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Badge component
function Badge({ children, variant = 'default' }: any) {
  const variants = {
    default: 'bg-accent text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground'
  };
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}
