import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { onWaitersChange, type Waiter } from '../../services/waiters.service';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useUser();
  const [waiters, setWaiters] = useState<Waiter[] | null>(null);
  const [showCashier, setShowCashier] = useState(false);

  useEffect(() => onWaitersChange(setWaiters), []);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (name: string, pass = '') => {
    setError('');
    setLoading(true);
    try {
      await login(name, pass);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar');
    } finally {
      setLoading(false);
    }
  };

  const handleCashierLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void signIn('admin', password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>
            Dumplings del Dragón
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {showCashier ? 'Entrada del cajero' : '¿Quién eres?'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!showCashier ? (
            <>
              <div className="space-y-3">
                {waiters === null && (
                  <p className="text-center text-sm text-muted-foreground">Cargando meseros...</p>
                )}
                {waiters?.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Todavía no hay meseros registrados. Pide al cajero que los agregue.
                  </p>
                )}
                {waiters?.map(waiter => (
                  <Button
                    key={waiter.id}
                    type="button"
                    size="lg"
                    className="w-full py-6 text-lg"
                    disabled={loading}
                    onClick={() => void signIn(waiter.name)}
                  >
                    {waiter.name}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setError('');
                  setShowCashier(true);
                }}
              >
                Soy el cajero
              </Button>
            </>
          ) : (
            <form onSubmit={handleCashierLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full py-3" size="lg" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setError('');
                  setPassword('');
                  setShowCashier(false);
                }}
              >
                Volver
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
