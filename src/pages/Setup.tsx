import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [superAdminExists, setSuperAdminExists] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      // Vérifier si un super admin existe déjà
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('setup-super-admin', {
        body: {
          email: 'superadmin@fere.app',
          password: '12345678',
          nom_complet: 'Super Admin',
          contact: '+22312345678'
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Super administrateur créé avec succès!');
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-[#003E2F]">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Vérification en cours...</span>
        </div>
      </div>
    );
  }

  if (superAdminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-[#003E2F]">Redirection...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md p-8 border-2 border-[#003E2F]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#003E2F] mb-2">
            Fere
          </h1>
          <p className="text-sm text-gray-600">
            Configuration initiale
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Création du super administrateur</strong>
          </p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>📧 Email: superadmin@fere.app</p>
            <p>🔐 Mot de passe: 12345678</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Button 
            type="submit" 
            className="w-full bg-[#003E2F] hover:bg-[#002d23] text-white"
            disabled={loading}
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

        <p className="text-xs text-center text-gray-500 mt-4">
          Cette page sera inaccessible une fois le super admin créé
        </p>
      </Card>
    </div>
  );
}
