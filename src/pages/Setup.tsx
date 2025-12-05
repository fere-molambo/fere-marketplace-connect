import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Copy, Check, Eye, EyeOff, Lock } from 'lucide-react';

// Generate a cryptographically secure random password
const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(x => chars[x % chars.length]).join('');
};

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [superAdminExists, setSuperAdminExists] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const navigate = useNavigate();

  // Generate password once and memoize it
  const generatedPassword = useMemo(() => generateSecurePassword(), []);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'super_admin')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification:', error);
      }
      
      if (data) {
        setSuperAdminExists(true);
        toast.error('Un super administrateur existe déjà');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
    } finally {
      setChecking(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      toast.success('Mot de passe copié!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Impossible de copier');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!setupSecret.trim()) {
      toast.error('Veuillez entrer le secret de configuration');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch(
        `https://jajfuajmkjulujnwfqen.supabase.co/functions/v1/setup-super-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Setup-Secret': setupSecret.trim(),
          },
          body: JSON.stringify({
            email: 'superadmin@fere.app',
            password: generatedPassword,
            nom_complet: 'Super Admin',
            contact: '+22312345678'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Secret de configuration invalide');
        }
        throw new Error(data.error || 'Erreur lors de la création');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Super administrateur créé avec succès! Assurez-vous d\'avoir copié le mot de passe.');
      setTimeout(() => navigate('/'), 3000);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-primary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Vérification en cours...</span>
        </div>
      </div>
    );
  }

  if (superAdminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-primary">Redirection...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 border-2 border-primary">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Fere
          </h1>
          <p className="text-sm text-muted-foreground">
            Configuration initiale
          </p>
        </div>
        
        <div className="bg-muted rounded-lg p-4 mb-6">
          <p className="text-sm text-foreground mb-2">
            <strong>Création du super administrateur</strong>
          </p>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>📧 Email: superadmin@fere.app</p>
            <div className="flex items-center gap-2">
              <p>🔐 Mot de passe:</p>
              <code className="bg-background px-2 py-1 rounded border text-xs font-mono break-all">
                {generatedPassword}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={copyPassword}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-3 font-medium">
            ⚠️ Copiez ce mot de passe maintenant. Il ne sera plus affiché.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setupSecret" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Secret de configuration
            </Label>
            <div className="relative">
              <Input
                id="setupSecret"
                type={showSecret ? "text" : "password"}
                value={setupSecret}
                onChange={(e) => setSetupSecret(e.target.value)}
                placeholder="Entrez le secret de configuration"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ce secret vous a été fourni lors de la configuration du projet.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading || !setupSecret.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Création en cours...
              </span>
            ) : (
              'Créer le super administrateur'
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Cette page sera inaccessible une fois le super admin créé
        </p>
      </Card>
    </div>
  );
}
