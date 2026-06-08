import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(name, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>
            Dumplings del Dragón
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">Sistema de Punto de Venta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Tu Nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ej: carlos, alejandra, admin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña (solo para Admin)</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full py-3"
              disabled={loading}
              size="lg"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-secondary rounded-lg text-sm space-y-3 text-muted-foreground">
            <div>
              <p className="font-semibold mb-1">👤 Meseros (sin contraseña):</p>
              <ul className="list-none space-y-1 ml-2">
                <li>• carlos</li>
                <li>• alexis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
