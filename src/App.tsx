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
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, TimeLog, OperationType, UserRole, Project, ProjectStage, CompanySettings } from './types';
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
  MessageCircle,
  Globe,
  Bell,
  BellOff,
  FileText,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  const getInviteLink = () => {
    const origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return `${origin.replace('ais-dev-', 'ais-pre-')}/register`;
    }
    return `${origin}/register`;
  };

  const inviteLink = getInviteLink();

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

const CheckoutReminderModal = ({ isOpen, onClose, onConfirm, reminders }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, reminders: string[] }) => {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  const allChecked = reminders.length === 0 || reminders.every((_, idx) => checkedItems[idx]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-rose-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Checklist de Saída</h3>
              <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest">Atenção Necessária</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Por favor, confirme se as seguintes tarefas foram realizadas antes de sair:</p>
          
          <div className="space-y-2">
            {reminders.map((reminder, idx) => (
              <label key={idx} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all">
                <input 
                  type="checkbox" 
                  checked={checkedItems[idx] || false}
                  onChange={(e) => setCheckedItems(prev => ({ ...prev, [idx]: e.target.checked }))}
                  className="w-5 h-5 rounded-lg border-2 border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span className={cn("text-sm font-semibold", checkedItems[idx] ? "text-slate-400 line-through" : "text-slate-700")}>
                  {reminder}
                </span>
              </label>
            ))}
            {reminders.length === 0 && (
              <p className="text-sm text-slate-400 italic text-center py-4">Nenhum lembrete configurado. Pode prosseguir.</p>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-slate-600 font-bold hover:bg-white rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            disabled={!allChecked}
            className={cn(
              "flex-[2] py-3 rounded-2xl font-bold transition-all shadow-lg",
              allChecked 
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            Confirmar e Sair
          </button>
        </div>
      </div>
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

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

    // Listen for projects
    const projQ = query(
      collection(db, 'projects'),
      where('companyId', '==', profile.companyId),
      where('status', '==', 'active')
    );
    const unsubProj = onSnapshot(projQ, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Listen for company settings
    const unsubSettings = onSnapshot(doc(db, 'companySettings', profile.companyId), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings({ ...docSnap.data(), id: docSnap.id } as CompanySettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `companySettings/${profile.companyId}`));

    return () => {
      clearInterval(timer);
      navigator.geolocation.clearWatch(watchId);
      unsubscribe();
      unsubProj();
      unsubSettings();
    };
  }, [profile]);

  const handleClockAction = async (type: 'in' | 'out') => {
    if (type === 'out' && companySettings && companySettings.checkoutReminders.length > 0) {
      setIsReminderModalOpen(true);
      return;
    }
    await performClockAction(type);
  };

  const performClockAction = async (type: 'in' | 'out') => {
    setLoading(true);
    setStatus(null);
    setIsReminderModalOpen(false);

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
      <CheckoutReminderModal 
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onConfirm={() => performClockAction('out')}
        reminders={companySettings?.checkoutReminders || []}
      />
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

      {/* Projects Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Globe size={20} className="text-indigo-600" /> Meus Projetos Ativos
          </h3>
          <p className="text-xs text-slate-500 mt-1">Acompanhe as etapas e marque o que já foi concluído.</p>
        </div>
        
        <div className="p-6">
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                    <h4 className="font-bold text-indigo-900">{project.name}</h4>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-lg">Ativo</span>
                  </div>
                  <div className="p-4">
                    <ProjectStagesList 
                      projectId={project.id!} 
                      companyId={profile.companyId} 
                      isAdmin={false} 
                      profile={profile}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 shadow-sm">
                <Globe size={32} />
              </div>
              <p className="text-slate-400 text-sm font-medium">Nenhum projeto atribuído no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectStagesList = ({ projectId, companyId, isAdmin, profile }: { projectId: string, companyId: string, isAdmin: boolean, profile?: UserProfile }) => {
  const [stages, setStages] = useState<ProjectStage[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'projectStages'),
      where('projectId', '==', projectId),
      where('companyId', '==', companyId),
      orderBy('title', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProjectStage)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projectStages'));
    return () => unsubscribe();
  }, [projectId]);

  const toggleStage = async (stage: ProjectStage) => {
    if (!profile && !isAdmin) return;
    
    await setDoc(doc(db, 'projectStages', stage.id!), {
      ...stage,
      completed: !stage.completed,
      completedBy: !stage.completed ? (profile?.uid || 'admin') : null,
      completedByName: !stage.completed ? (profile?.displayName || 'Admin') : null,
      completedAt: !stage.completed ? serverTimestamp() : null
    });
  };

  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <div key={stage.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <button 
            onClick={() => toggleStage(stage)}
            className={cn(
              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
              stage.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"
            )}
          >
            {stage.completed && <CheckCircle2 size={16} />}
          </button>
          <div className="flex-1">
            <p className={cn("text-sm font-semibold", stage.completed ? "text-slate-400 line-through" : "text-slate-700")}>
              {stage.title}
            </p>
            {stage.completed && stage.completedByName && (
              <p className="text-[10px] text-emerald-600 font-bold uppercase">
                Feito por {stage.completedByName} em {stage.completedAt ? format(stage.completedAt.toDate(), 'dd/MM HH:mm') : '---'}
              </p>
            )}
          </div>
          {isAdmin && (
            <button 
              onClick={async () => {
                if (confirm('Excluir esta etapa?')) {
                  await deleteDoc(doc(db, 'projectStages', stage.id!));
                }
              }}
              className="text-slate-300 hover:text-rose-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      {isAdmin && (
        <button 
          onClick={async () => {
            const title = prompt('Título da etapa:');
            if (title) {
              await addDoc(collection(db, 'projectStages'), {
                projectId,
                title,
                completed: false,
                companyId,
                createdAt: serverTimestamp()
              });
            }
          }}
          className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Adicionar Etapa
        </button>
      )}
      {stages.length === 0 && !isAdmin && (
        <p className="text-xs text-slate-400 italic">Nenhuma etapa definida para este projeto.</p>
      )}
    </div>
  );
};

const AdminDashboard = ({ profile }: { profile: UserProfile }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'map' | 'settings' | 'projects'>('logs');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsEnabled((window as any).Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Este navegador não suporta notificações.');
      return;
    }

    const permission = await (window as any).Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    
    if (permission === 'granted') {
      new (window as any).Notification('Notificações Ativadas', {
        body: 'Você receberá alertas quando funcionários baterem o ponto.',
        icon: '/favicon.ico'
      });
    }
  };

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

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro de ponto? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'timeLogs', logId));
      setSelectedLogIds(prev => prev.filter(id => id !== logId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `timeLogs/${logId}`);
    }
  };

  const handleDeleteSelectedLogs = async () => {
    if (selectedLogIds.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir os ${selectedLogIds.length} registros selecionados? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedLogIds.forEach(id => {
        batch.delete(doc(db, 'timeLogs', id));
      });
      await batch.commit();
      setSelectedLogIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'timeLogs/batch');
    }
  };

  const toggleSelectLog = (id: string) => {
    setSelectedLogIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredLogs: TimeLog[]) => {
    if (selectedLogIds.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedLogIds([]);
    } else {
      setSelectedLogIds(filteredLogs.map(log => log.id!));
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const filteredLogs = logs.filter(log => {
      if (!log.timestamp) return false;
      const date = log.timestamp.toDate();
      // Use local time for date comparison
      const start = startOfDay(new Date(startDate + 'T00:00:00'));
      const end = endOfDay(new Date(endDate + 'T23:59:59'));
      return isWithinInterval(date, { start, end });
    });

    if (filteredLogs.length === 0) {
      alert('Nenhum registro encontrado no período selecionado para gerar o PDF.');
      return;
    }

    // Header
    doc.setFontSize(18);
    doc.text('Relatório de Ponto Digital', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Empresa: ${profile.companyId}`, 14, 30);
    doc.text(`Período: ${format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy')} até ${format(new Date(endDate + 'T00:00:00'), 'dd/MM/yyyy')}`, 14, 36);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 42);

    const tableData = filteredLogs.map(log => [
      log.userName,
      log.type === 'in' ? 'Entrada' : 'Saída',
      log.timestamp ? format(log.timestamp.toDate(), 'dd/MM/yyyy HH:mm:ss') : '---',
      `${log.location.latitude.toFixed(4)}, ${log.location.longitude.toFixed(4)}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Funcionário', 'Tipo', 'Data/Hora', 'Localização']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`relatorio_ponto_${startDate}_${endDate}.pdf`);
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
      const updatedLogs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TimeLog));
      setLogs(updatedLogs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'timeLogs'));

    // Listen for invitations
    const invQ = query(
      collection(db, 'invitations'),
      where('companyId', '==', profile.companyId)
    );
    const unsubInv = onSnapshot(invQ, (snapshot) => {
      setInvitations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'invitations'));

    // Listen for projects
    const projQ = query(
      collection(db, 'projects'),
      where('companyId', '==', profile.companyId),
      orderBy('createdAt', 'desc')
    );
    const unsubProj = onSnapshot(projQ, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Listen for company settings
    const unsubSettings = onSnapshot(doc(db, 'companySettings', profile.companyId), (docSnap) => {
      if (docSnap.exists()) {
        setCompanySettings({ ...docSnap.data(), id: docSnap.id } as CompanySettings);
      } else {
        // Initialize default settings if they don't exist
        const defaultSettings: CompanySettings = {
          id: profile.companyId,
          checkoutReminders: ['Conferir portas e janelas', 'Limpeza da obra']
        };
        setCompanySettings(defaultSettings);
        setDoc(doc(db, 'companySettings', profile.companyId), defaultSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `companySettings/${profile.companyId}`));

    return () => {
      unsubUsers();
      unsubLogs();
      unsubInv();
      unsubProj();
      unsubSettings();
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
            onClick={() => setActiveTab('projects')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === 'projects' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Projetos
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
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === 'settings' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Configurações
          </button>
        </div>

        {activeTab === 'users' && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="hidden sm:flex px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={18} /> Convidar
          </button>
        )}
      </div>

      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Calendar size={14} /> Data Inicial
              </label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                <Calendar size={14} /> Data Final
              </label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <button 
              onClick={generatePDF}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 h-[42px]"
            >
              <Download size={18} /> Gerar PDF
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={(() => {
                          const filtered = logs.filter(log => {
                            if (!log.timestamp) return true;
                            const date = log.timestamp.toDate();
                            const start = startOfDay(new Date(startDate + 'T00:00:00'));
                            const end = endOfDay(new Date(endDate + 'T23:59:59'));
                            return isWithinInterval(date, { start, end });
                          });
                          return filtered.length > 0 && selectedLogIds.length === filtered.length;
                        })()}
                        onChange={() => toggleSelectAll(logs.filter(log => {
                          if (!log.timestamp) return true;
                          const date = log.timestamp.toDate();
                          const start = startOfDay(new Date(startDate + 'T00:00:00'));
                          const end = endOfDay(new Date(endDate + 'T23:59:59'));
                          return isWithinInterval(date, { start, end });
                        }))}
                      />
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Funcionário</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data/Hora</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">
                      {selectedLogIds.length > 0 ? (
                        <button 
                          onClick={handleDeleteSelectedLogs}
                          className="text-rose-600 hover:text-rose-700 flex items-center gap-1 ml-auto font-bold text-[10px]"
                        >
                          <Trash2 size={14} /> Apagar ({selectedLogIds.length})
                        </button>
                      ) : 'Ações'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(() => {
                    const filtered = logs.filter(log => {
                      if (!log.timestamp) return true;
                      const date = log.timestamp.toDate();
                      const start = startOfDay(new Date(startDate + 'T00:00:00'));
                      const end = endOfDay(new Date(endDate + 'T23:59:59'));
                      return isWithinInterval(date, { start, end });
                    });
                    
                    return filtered.length > 0 ? filtered.map((log) => (
                      <tr key={log.id} className={cn("hover:bg-slate-50/50 transition-colors", selectedLogIds.includes(log.id!) && "bg-indigo-50/30")}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedLogIds.includes(log.id!)}
                            onChange={() => toggleSelectLog(log.id!)}
                          />
                        </td>
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
                            <MapPin size={12} /> Ver Mapa
                          </a>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteLog(log.id!)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Excluir Registro"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado para este período.</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
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

      {activeTab === 'projects' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Projetos e Obras</h3>
              <p className="text-sm text-slate-500">Gerencie os projetos e as etapas de cada obra.</p>
            </div>
            <button 
              onClick={async () => {
                const name = prompt('Nome do Projeto:');
                if (name) {
                  await addDoc(collection(db, 'projects'), {
                    name,
                    companyId: profile.companyId,
                    status: 'active',
                    createdAt: serverTimestamp()
                  });
                }
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={20} /> Novo Projeto
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{project.name}</h4>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status: {project.status === 'active' ? 'Ativo' : 'Concluído'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={async () => {
                        if (confirm(`Deseja excluir o projeto "${project.name}" e todas as suas etapas?`)) {
                          await deleteDoc(doc(db, 'projects', project.id!));
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <h5 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-600" /> Etapas do Serviço
                  </h5>
                  
                  <ProjectStagesList projectId={project.id!} companyId={profile.companyId} isAdmin={true} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Equipe Registrada</h3>
              <p className="text-sm text-slate-500">Funcionários que já completaram o cadastro.</p>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={20} /> Convidar Funcionário
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((u) => (
              <div key={u.uid} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
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
          </div>

          {invitations.length > 0 && (
            <div className="pt-8 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Convites Pendentes</h3>
              <p className="text-sm text-slate-500 mb-6">E-mails convidados que ainda não se cadastraram.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invitations.map((inv) => (
                  <div key={inv.id} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400">
                          <MessageCircle size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{inv.email}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Aguardando Cadastro</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm('Deseja cancelar este convite?')) {
                            await deleteDoc(doc(db, 'invitations', inv.id));
                          }
                        }}
                        className="text-slate-300 hover:text-rose-600 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="px-2 py-1 bg-white border border-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase">
                        {inv.role === 'admin' ? 'Admin' : 'Funcionário'}
                      </span>
                      <p className="text-[10px] text-slate-400 italic">Enviado em {inv.createdAt ? format(inv.createdAt.toDate(), 'dd/MM') : '---'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {users.length === 0 && invitations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <Users size={40} />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Sua equipe está vazia</h4>
              <p className="text-slate-500 max-w-xs mt-2">Comece convidando seus funcionários para baterem ponto pelo sistema.</p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Convidar Primeiro Funcionário
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Configurações do Sistema</h3>
            <p className="text-slate-500 text-sm">Gerencie o acesso e os links de convite da sua empresa.</p>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-600" /> Lembretes de Saída (Checklist Diário)
              </h4>
            </div>
            <p className="text-sm text-slate-600">
              Estes itens aparecerão para o funcionário quando ele clicar em "Saída". Use para garantir que nada seja esquecido na obra.
            </p>
            
            <div className="space-y-2">
              {companySettings?.checkoutReminders.map((reminder, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                  <span className="flex-1 text-sm text-slate-700">{reminder}</span>
                  <button 
                    onClick={async () => {
                      const currentReminders = companySettings?.checkoutReminders || [];
                      const newReminders = currentReminders.filter((_, i) => i !== idx);
                      await setDoc(doc(db, 'companySettings', profile.companyId), {
                        checkoutReminders: newReminders
                      }, { merge: true });
                    }}
                    className="text-slate-300 hover:text-rose-600 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button 
                onClick={async () => {
                  const text = prompt('Novo lembrete:');
                  if (text) {
                    const currentReminders = companySettings?.checkoutReminders || [];
                    await setDoc(doc(db, 'companySettings', profile.companyId), {
                      checkoutReminders: [...currentReminders, text]
                    }, { merge: true });
                  }
                }}
                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Adicionar Lembrete
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Bell size={18} className="text-indigo-600" /> Notificações em Tempo Real
              </h4>
              <button 
                onClick={requestNotificationPermission}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                  notificationsEnabled 
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                )}
              >
                {notificationsEnabled ? (
                  <><CheckCircle2 size={14} /> Ativadas</>
                ) : (
                  <><Bell size={14} /> Ativar Notificações</>
                )}
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Ative as notificações para receber alertas no seu celular ou computador sempre que um funcionário registrar entrada ou saída.
            </p>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={18} />
              <div className="text-[11px] text-amber-800">
                <p className="font-bold mb-1">Notificações em Segundo Plano:</p>
                <p className="mb-2">Para receber alertas mesmo com o app fechado ou celular bloqueado:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Use a opção <b>"Adicionar à Tela de Início"</b> no seu navegador.</li>
                  <li>Abra o app pelo ícone que aparecerá na sua tela inicial.</li>
                  <li>Mantenha o app instalado como um aplicativo (PWA).</li>
                </ol>
              </div>
            </div>
            {notificationsEnabled && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <p className="text-xs text-slate-500">As notificações estão configuradas para este navegador.</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <Globe size={18} className="text-indigo-600" /> Link Público de Cadastro
              </h4>
              {window.location.origin.includes('ais-dev-') ? (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">Ambiente de Teste</span>
              ) : (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Ambiente Público</span>
              )}
            </div>
            
            <p className="text-sm text-slate-600">
              Este é o link que seus funcionários devem usar para se cadastrar. Se eles virem um erro "403", certifique-se de que estão usando o link que começa com <code className="bg-slate-200 px-1 rounded">ais-pre-</code>.
            </p>

            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin.includes('ais-dev-') ? window.location.origin.replace('ais-dev-', 'ais-pre-') : window.location.origin}/register`}
                className="flex-1 bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-mono text-slate-500 outline-none"
              />
              <button 
                onClick={() => {
                  const link = `${window.location.origin.includes('ais-dev-') ? window.location.origin.replace('ais-dev-', 'ais-pre-') : window.location.origin}/register`;
                  navigator.clipboard.writeText(link);
                  alert('Link copiado com sucesso!');
                }}
                className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
                title="Copiar Link"
              >
                <Copy size={20} />
              </button>
            </div>

            {window.location.origin.includes('ais-dev-') && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <div className="text-xs text-amber-800 space-y-2">
                  <p className="font-bold">Atenção: Você está no ambiente de desenvolvimento.</p>
                  <p>Para evitar erros 403 para seus funcionários, sempre use o link acima ou acesse o sistema através da URL de compartilhamento (Shared App URL).</p>
                  <a 
                    href={window.location.origin.replace('ais-dev-', 'ais-pre-')} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block font-bold underline hover:text-amber-900"
                  >
                    Abrir Versão Pública do Sistema
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-4">Informações da Empresa</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Nome da Empresa</p>
                <p className="font-semibold text-slate-700">{profile.companyId}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Seu ID de Administrador</p>
                <p className="font-mono text-xs text-slate-500">{profile.uid}</p>
              </div>
            </div>
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

// --- Notification Handler ---

const NotificationHandler = ({ profile }: { profile: UserProfile }) => {
  useEffect(() => {
    if (profile.role !== 'admin') return;

    const sendLogNotification = async (log: TimeLog) => {
      if (typeof window !== 'undefined' && 'Notification' in window && (window as any).Notification.permission === 'granted') {
        const title = log.type === 'in' ? 'Nova Entrada' : 'Nova Saída';
        const body = `${log.userName} acabou de bater o ponto (${log.type === 'in' ? 'Entrada' : 'Saída'}).`;
        
        // Try to use Service Worker registration for better background support
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: log.id,
            vibrate: [200, 100, 200]
          } as any);
        } else {
          // Fallback to standard Notification
          new (window as any).Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: log.id
          });
        }
      }
    };

    const logsQ = query(
      collection(db, 'timeLogs'),
      where('companyId', '==', profile.companyId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(logsQ, (snapshot) => {
      if (!snapshot.metadata.hasPendingWrites) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const log = { ...change.doc.data(), id: change.doc.id } as TimeLog;
            const logTime = log.timestamp?.toDate().getTime();
            const now = Date.now();
            if (logTime && (now - logTime) < 30000) {
              sendLogNotification(log);
            }
          }
        });
      }
    }, (error) => console.error('Notification listener error:', error));

    return () => unsubscribe();
  }, [profile]);

  return null;
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
      {profile && <NotificationHandler profile={profile} />}
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
