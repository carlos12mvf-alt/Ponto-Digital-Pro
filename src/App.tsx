import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link
} from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, TimeLog, OperationType } from './types';
import { cn } from './lib/utils';
import { 
  Clock, 
  User, 
  LogOut, 
  Settings, 
  Users, 
  History, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  Plus,
  Shield,
  Copy,
  Trash2,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet icon issue by using CDN URLs
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Map Helper ---
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center);
  return null;
};

// --- Error Handling ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('authInfo')) {
        setHasError(true);
        try {
          const parsed = JSON.parse(event.error.message);
          setErrorMsg(`Erro de permissão no Firestore: ${parsed.operationType} em ${parsed.path}`);
        } catch {
          setErrorMsg(event.error.message);
        }
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle size={24} />
            <h2 className="text-xl font-bold">Ops! Algo deu errado</h2>
          </div>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Recarregar Aplicativo
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <Clock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
    </div>
    <p className="mt-4 text-slate-500 font-medium animate-pulse">Carregando Ponto Digital...</p>
  </div>
);

// --- Auth Views ---

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 mb-4">
            <Clock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Ponto Digital Pro</h1>
          <p className="text-slate-500 text-center mt-2">Entre na sua conta para registrar seu ponto</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link to="/forgot-password" title="Recuperar Senha" className="block text-sm text-indigo-600 hover:underline">Esqueceu sua senha?</Link>
          <p className="text-sm text-slate-500">
            Não tem uma conta? <Link to="/register" title="Criar Conta" className="text-indigo-600 font-medium hover:underline">Cadastre-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // 1. Check for invitation
      const invRef = doc(db, 'invitations', email.toLowerCase());
      const invSnap = await getDoc(invRef);
      
      let companyId = 'default-company';
      let role = 'employee';

      if (invSnap.exists()) {
        const invData = invSnap.data();
        companyId = invData.companyId;
        role = invData.role;
      } else if (email === 'carlos12mvf@gmail.com') {
        role = 'admin';
        companyId = 'company-' + Math.random().toString(36).substr(2, 9); // Generate unique company ID for main admin
      } else {
        // Optional: Block registration if no invitation and not main admin
        // setError('Você precisa de um convite para se cadastrar.');
        // setLoading(false);
        // return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: name,
        role: role as any,
        companyId: companyId,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Delete invitation after use
      if (invSnap.exists()) {
        // await deleteDoc(invRef); // Optional: keep or delete
      }

      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('O método de login por E-mail/Senha não está ativado no Firebase Console.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha é muito fraca (mínimo 6 caracteres).');
      } else {
        setError('Erro ao criar conta: ' + (err.message || 'Verifique os dados.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Criar Conta</h1>
          <p className="text-slate-500 text-center mt-2">Junte-se ao Ponto Digital Pro</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
            <input 
              type="text" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="João Silva"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Já tem uma conta? <Link to="/login" title="Fazer Login" className="text-indigo-600 font-medium hover:underline">Entre aqui</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError('Erro ao enviar e-mail. Verifique o endereço informado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Recuperar Senha</h1>
          <p className="text-slate-500 text-center mt-2">Enviaremos um link para você redefinir sua senha</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="seu@email.com"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              {message}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" title="Voltar ao Login" className="text-sm text-indigo-600 font-medium hover:underline">Voltar para o login</Link>
        </div>
      </div>
    </div>
  );
};

// --- Admin Components ---

const AddEmployeeModal = ({ isOpen, onClose, adminProfile }: { isOpen: boolean, onClose: () => void, adminProfile: UserProfile }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const inviteLink = `${window.location.origin}/register`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setStatus({ type: 'success', msg: 'Link de convite copiado!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Erro ao copiar link.' });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // 1. Save invitation to Firestore
      await setDoc(doc(db, 'invitations', email.toLowerCase()), {
        email: email.toLowerCase(),
        companyId: adminProfile.companyId,
        role: role,
        invitedBy: adminProfile.uid,
        createdAt: serverTimestamp()
      });

      setStatus({ type: 'success', msg: 'Convite criado com sucesso! Agora compartilhe o link de cadastro.' });
      setEmail('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invitations');
    } finally {
      setLoading(false);
    }
  };

  const shareWhatsApp = () => {
    const text = `Olá! Você foi convidado para o Ponto Digital Pro. Cadastre-se usando este link: ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900">Novo Funcionário</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          <p className="text-sm text-slate-500">
            Informe o e-mail do funcionário. Ao se cadastrar com este e-mail, ele será automaticamente vinculado à sua empresa.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail do Funcionário</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="funcionario@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Permissão</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="employee">Funcionário (Apenas bater ponto)</option>
              <option value="admin">Administrador (Gestão total)</option>
            </select>
          </div>

          {status && (
            <div className={cn(
              "p-3 rounded-xl text-sm flex items-center gap-2",
              status.type === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {status.msg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Vincular Funcionário'}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Compartilhar Link</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button"
              onClick={copyToClipboard}
              className="py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Copy size={18} /> Copiar
            </button>
            <button 
              type="button"
              onClick={shareWhatsApp}
              className="py-3 bg-[#25D366] text-white rounded-xl font-semibold hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <MessageCircle size={18} /> WhatsApp
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-4">
            O funcionário deve usar o e-mail informado acima no momento do cadastro.
          </p>
        </form>
      </div>
    </div>
  );
};

// --- Main App Views ---

const Layout = ({ user, profile, children }: { user: FirebaseUser, profile: UserProfile, children: React.ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Clock size={18} />
            </div>
            <span className="font-bold text-slate-900 hidden sm:inline">Ponto Digital Pro</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 mr-6">
              {profile.role !== 'admin' && (
                <Link to="/" title="Início" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Início</Link>
              )}
              {profile.role === 'admin' && (
                <Link to="/admin" title="Painel Admin" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Administração</Link>
              )}
            </div>
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 leading-none">{profile.displayName}</p>
                <p className="text-xs text-slate-500 mt-1 capitalize">{profile.role === 'admin' ? 'Administrador' : 'Funcionário'}</p>
              </div>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <User size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-slate-900">Menu</span>
              <button onClick={() => setIsMenuOpen(false)} className="text-slate-400"><X size={24} /></button>
            </div>
            <nav className="flex flex-col gap-4 flex-1">
              {profile.role !== 'admin' && (
                <>
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium">
                    <Clock size={20} /> Início
                  </Link>
                  <Link to="/history" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium">
                    <History size={20} /> Meu Histórico
                  </Link>
                </>
              )}
              {profile.role === 'admin' && (
                <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 text-slate-700 font-medium">
                  <Shield size={20} /> Administração
                </Link>
              )}
            </nav>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 p-3 rounded-xl text-red-600 font-medium hover:bg-red-50 mt-auto"
            >
              <LogOut size={20} /> Sair
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};

const EmployeeDashboard = ({ profile }: { profile: UserProfile }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastLog, setLastLog] = useState<TimeLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [lastPosition, setLastPosition] = useState<GeolocationPosition | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const updatePosition = (pos: GeolocationPosition) => {
      setCurrentPos([pos.coords.latitude, pos.coords.longitude]);
      setLastPosition(pos);
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      updatePosition,
      () => console.warn('Could not get initial position')
    );

    // Watch position for real-time map
    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      (err) => console.error('Watch error:', err),
      { enableHighAccuracy: true }
    );
    
    // Listen for last log
    const q = query(
      collection(db, 'timeLogs'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc'),
      where('companyId', '==', profile.companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as TimeLog;
        setLastLog({ ...data, id: snapshot.docs[0].id });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'timeLogs');
    });

    return () => {
      clearInterval(timer);
      navigator.geolocation.clearWatch(watchId);
      unsubscribe();
    };
  }, [profile]);

  const handleClockAction = async (type: 'in' | 'out') => {
    setLoading(true);
    setStatus(null);

    const registerLog = async (position: GeolocationPosition) => {
      try {
        const logData: Omit<TimeLog, 'id'> = {
          userId: profile.uid,
          userName: profile.displayName,
          type,
          timestamp: serverTimestamp(),
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          },
          companyId: profile.companyId
        };

        await addDoc(collection(db, 'timeLogs'), logData);
        setStatus({ 
          type: 'success', 
          msg: `Ponto de ${type === 'in' ? 'entrada' : 'saída'} registrado com sucesso!` 
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'timeLogs');
      } finally {
        setLoading(false);
      }
    };

    // If we already have a position from the watcher, use it immediately for instant feedback
    if (lastPosition) {
      await registerLog(lastPosition);
      return;
    }

    if (!navigator.geolocation) {
      setStatus({ type: 'error', msg: 'Geolocalização não suportada pelo navegador.' });
      setLoading(false);
      return;
    }

    // Fallback to getting current position if watcher hasn't provided one yet
    navigator.geolocation.getCurrentPosition(
      registerLog,
      (error) => {
        setStatus({ type: 'error', msg: 'Erro ao obter localização. Permita o acesso para bater o ponto.' });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const isClockedIn = lastLog?.type === 'in';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clock Card */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 text-center md:text-left">
              <p className="text-slate-500 font-medium mb-2 uppercase tracking-widest text-xs">Horário Atual</p>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 tabular-nums mb-2">
                {format(currentTime, 'HH:mm:ss')}
              </h2>
              <p className="text-slate-400 mb-8">{format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
              
              {profile.role !== 'admin' && (
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto md:mx-0">
                  <button 
                    onClick={() => handleClockAction('in')}
                    disabled={loading || isClockedIn}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                      isClockedIn 
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100"
                    )}
                  >
                    <Plus size={20} /> Entrada
                  </button>
                  <button 
                    onClick={() => handleClockAction('out')}
                    disabled={loading || !isClockedIn}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                      !isClockedIn 
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                        : "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100"
                    )}
                  >
                    <LogOut size={20} /> Saída
                  </button>
                </div>
              )}

              {status && (
                <div className={cn(
                  "mt-6 p-4 rounded-xl text-sm flex items-center gap-3 w-full max-w-md mx-auto md:mx-0",
                  status.type === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                )}>
                  {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {status.msg}
                </div>
              )}
            </div>

            {/* Live Map */}
            <div className="w-full md:w-72 h-72 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative">
              {currentPos ? (
                <MapContainer center={currentPos} zoom={15} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={currentPos}>
                    <Popup>Você está aqui</Popup>
                  </Marker>
                  <ChangeView center={currentPos} />
                </MapContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <MapPin size={32} className="mb-2 animate-bounce" />
                  <p className="text-xs">Buscando sua localização em tempo real...</p>
                </div>
              )}
              <div className="absolute bottom-2 right-2 z-[1000] bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-600 shadow-sm border border-slate-100">
                LIVE
              </div>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <History size={18} className="text-indigo-600" /> Último Registro
          </h3>
          
          {lastLog ? (
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  lastLog.type === 'in' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                )}>
                  {lastLog.type === 'in' ? <Plus size={24} /> : <LogOut size={24} />}
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Tipo</p>
                  <p className="font-bold text-slate-900">{lastLog.type === 'in' ? 'Entrada' : 'Saída'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Horário</p>
                  <p className="font-bold text-slate-900">
                    {lastLog.timestamp ? format(lastLog.timestamp.toDate(), 'HH:mm:ss') : '--:--:--'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Localização</p>
                  <p className="text-xs text-slate-600 font-mono">
                    {lastLog.location.latitude.toFixed(4)}, {lastLog.location.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <History size={32} />
              </div>
              <p className="text-slate-400 text-sm">Nenhum registro encontrado hoje.</p>
            </div>
          )}
          
          <Link to="/history" title="Ver Histórico Completo" className="mt-6 w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
            Ver Histórico Completo <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ profile }: { profile: UserProfile }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'map'>('logs');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === profile.uid) {
      alert('Você não pode excluir sua própria conta de administrador.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o funcionário ${userEmail}? Ele perderá acesso ao sistema.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      // Also delete invitation if it exists
      await deleteDoc(doc(db, 'invitations', userEmail.toLowerCase()));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  useEffect(() => {
    // Listen for all users in company
    const usersQ = query(
      collection(db, 'users'),
      where('companyId', '==', profile.companyId)
    );
    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Listen for all logs in company
    const logsQ = query(
      collection(db, 'timeLogs'),
      where('companyId', '==', profile.companyId),
      orderBy('timestamp', 'desc')
    );
    const unsubLogs = onSnapshot(logsQ, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TimeLog)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'timeLogs'));

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Painel Administrativo</h2>
            <p className="text-slate-500">Gerencie sua equipe e registros de ponto</p>
          </div>
          <div className="hidden lg:block h-10 w-px bg-slate-200"></div>
          <div className="hidden lg:block">
            <p className="text-2xl font-black text-indigo-600 tabular-nums">
              {format(currentTime, 'HH:mm:ss')}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Horário de Brasília</p>
          </div>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
          <button 
            onClick={() => setActiveTab('logs')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === 'logs' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Registros
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === 'map' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mapa
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === 'users' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Funcionários
          </button>
        </div>
      </div>

      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Funcionário</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.length > 0 ? logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {log.userName?.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                        log.type === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {log.type === 'in' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">
                          {log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss') : '--:--:--'}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {log.timestamp ? format(log.timestamp.toDate(), 'dd/MM/yyyy') : '--/--/----'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://www.google.com/maps?q=${log.location.latitude},${log.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver no Mapa"
                        className="text-indigo-600 hover:underline text-xs flex items-center gap-1"
                      >
                        <MapPin size={14} /> Ver no Mapa
                      </a>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 h-[600px] relative overflow-hidden z-10">
          <MapContainer center={[-23.5505, -46.6333]} zoom={12} className="h-full w-full rounded-2xl">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {logs.map((log) => (
              <Marker key={log.id} position={[log.location.latitude, log.location.longitude]}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900">{log.userName}</p>
                    <p className="text-xs text-slate-500">{log.type === 'in' ? 'Entrada' : 'Saída'}</p>
                    <p className="text-xs font-medium mt-1">
                      {log.timestamp ? format(log.timestamp.toDate(), 'dd/MM HH:mm') : ''}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((u) => (
            <div key={u.uid} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                    {u.displayName?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 leading-none">{u.displayName}</h4>
                    <p className="text-sm text-slate-500 mt-1">{u.email}</p>
                  </div>
                </div>
                {u.uid !== profile.uid && (
                  <button 
                    onClick={() => handleDeleteUser(u.uid, u.email)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Excluir Funcionário"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                  u.role === 'admin' ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-600"
                )}>
                  {u.role === 'admin' ? 'Admin' : 'Funcionário'}
                </span>
                <p className="text-[10px] text-slate-400">Desde {u.createdAt ? format(u.createdAt.toDate(), 'MM/yyyy') : '---'}</p>
              </div>
            </div>
          ))}
          
          {/* Add User Placeholder */}
          <div 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center group hover:border-indigo-300 transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors mb-3">
              <Plus size={24} />
            </div>
            <p className="text-sm font-bold text-slate-500 group-hover:text-indigo-600">Novo Funcionário</p>
            <p className="text-xs text-slate-400 mt-1">Vincular por e-mail</p>
          </div>
        </div>
      )}

      <AddEmployeeModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        adminProfile={profile} 
      />
    </div>
  );
};

const HistoryView = ({ profile }: { profile: UserProfile }) => {
  const [logs, setLogs] = useState<TimeLog[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'timeLogs'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TimeLog)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'timeLogs'));

    return () => unsubscribe();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Meu Histórico</h2>
        <p className="text-slate-500">Todos os seus registros de ponto</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Hora</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length > 0 ? logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      log.type === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {log.type === 'in' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {log.timestamp ? format(log.timestamp.toDate(), 'dd/MM/yyyy') : '--/--/----'}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss') : '--:--:--'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={14} /> {log.location.latitude.toFixed(4)}, {log.location.longitude.toFixed(4)}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Erro de conexão com o Firebase. Verifique a configuração.");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // If profile doesn't exist, create it (e.g. first login)
            const role = u.email === 'carlos12mvf@gmail.com' ? 'admin' : 'employee';
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email!,
              displayName: u.displayName || u.email!.split('@')[0],
              role: role as any,
              companyId: 'default-company',
              createdAt: serverTimestamp()
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route 
            path="/" 
            element={
              user && profile ? (
                profile.role === 'admin' ? (
                  <Navigate to="/admin" />
                ) : (
                  <Layout user={user} profile={profile}>
                    <EmployeeDashboard profile={profile} />
                  </Layout>
                )
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          <Route 
            path="/history" 
            element={
              user && profile ? (
                <Layout user={user} profile={profile}>
                  <HistoryView profile={profile} />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          <Route 
            path="/admin" 
            element={
              user && profile && profile.role === 'admin' ? (
                <Layout user={user} profile={profile}>
                  <AdminDashboard profile={profile} />
                </Layout>
              ) : (
                <Navigate to="/" />
              )
            } 
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
