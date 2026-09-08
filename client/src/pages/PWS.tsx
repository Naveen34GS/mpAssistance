import { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, ShieldAlert, Key, Copy, Eye, Lock, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

interface Credential {
  id: string;
  name: string;
  url?: string;
  username?: string;
  password?: string; // Only available when revealed
  notes?: string;
  created_at: string;
}

export default function PWS() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isSetupPinModalOpen, setIsSetupPinModalOpen] = useState(false);
  
  const [currentCredential, setCurrentCredential] = useState<Partial<Credential>>({});
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [credToDelete, setCredToDelete] = useState<string | null>(null);
  
  const [hasPinSession, setHasPinSession] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});

  useEffect(() => {
    checkPinSession();
    fetchCredentials();
  }, []);

  const checkPinSession = async () => {
    try {
      await api.get('/pws/session');
      setHasPinSession(true);
    } catch (error) {
      setHasPinSession(false);
      setIsPinModalOpen(true);
    }
  };

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/pws');
      setCredentials(data || []);
    } catch (error) {
      toast.error('Failed to fetch credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/pws/setup-pin', { pin: setupPin });
      toast.success('PIN setup successfully');
      setIsSetupPinModalOpen(false);
      setSetupPin('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to setup PIN');
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/pws/verify-pin', { pin });
      toast.success('PIN verified');
      setHasPinSession(true);
      setIsPinModalOpen(false);
      setPin('');
    } catch (error: any) {
      if (error.response?.data?.error === 'PIN not setup') {
         setIsPinModalOpen(false);
         setIsSetupPinModalOpen(true);
      } else {
         toast.error(error.response?.data?.error || 'Invalid PIN');
      }
    }
  };

  const handleLogoutPin = async () => {
    try {
      await api.post('/pws/logout-pin');
      setHasPinSession(false);
      setRevealedPasswords({});
      toast.success('PIN session cleared');
    } catch (error) {
      console.error('Error logging out PIN', error);
    }
  };

  const requirePin = (callback: () => void) => {
    if (hasPinSession) {
      callback();
    } else {
      setIsPinModalOpen(true);
    }
  };

  const handleReveal = async (id: string) => {
    requirePin(async () => {
      try {
        const { data } = await api.get(`/pws/${id}/reveal`);
        setRevealedPasswords(prev => ({ ...prev, [id]: data.password }));
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
          setRevealedPasswords(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 30000);
      } catch (error) {
        toast.error('Failed to reveal password');
      }
    });
  };

  const handleCopy = (text: string, type: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    toast.success(`${type === 'username' ? 'Username' : 'Password'} copied to clipboard`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (currentCredential.id) {
        await api.put(`/pws/${currentCredential.id}`, currentCredential);
        toast.success('Credential updated');
      } else {
        await api.post('/pws', currentCredential);
        toast.success('Credential saved');
      }
      setIsFormModalOpen(false);
      fetchCredentials();
    } catch (error: any) {
      const msg = error.response?.data?.error;
      const displayMsg = Array.isArray(msg) ? msg[0].message : (typeof msg === 'string' ? msg : 'Failed to save');
      toast.error(displayMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    requirePin(() => {
      setCredToDelete(id);
      setIsConfirmOpen(true);
    });
  };

  const handleDelete = async () => {
    const idToDelete = credToDelete;
    if (!idToDelete) return;
    setIsDeleting(idToDelete);
    try {
      await api.delete(`/pws/${credToDelete}`);
      toast.success('Credential deleted');
      fetchCredentials();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    } finally {
      setIsDeleting(null);
    }
  };

  const openFormModal = (cred?: Credential) => {
    requirePin(() => {
      if (cred) {
        // We need to fetch the password to edit it
        api.get(`/pws/${cred.id}/reveal`).then(({ data }) => {
          setCurrentCredential({ ...cred, password: data.password });
          setIsFormModalOpen(true);
        }).catch(() => {
          toast.error('Failed to load password for editing');
        });
      } else {
        setCurrentCredential({
          name: '',
          url: '',
          username: '',
          password: '',
          notes: ''
        });
        setIsFormModalOpen(true);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            PWS Management 
            {hasPinSession ? (
              <span title="Secure Session Active"><ShieldCheck className="w-5 h-5 text-green-500" /></span>
            ) : (
              <span title="Secure Session Locked"><Lock className="w-5 h-5 text-amber-500" /></span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Securely store your personal web credentials.</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasPinSession && (
             <button
               onClick={handleLogoutPin}
               className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
             >
               Lock Session
             </button>
          )}
          <button
            onClick={() => openFormModal()}
            className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent rounded-full sm:rounded-xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors"
          >
            <Plus className="sm:-ml-1 sm:mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Add Credential</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl"></div>)}
        </div>
      ) : credentials.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <ShieldAlert className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No credentials saved</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Add your first password to securely store it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {credentials.map(cred => (
            <div key={cred.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col group">
               <div className="p-5 flex-1">
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-700 flex-shrink-0">
                          <Key size={18} className="text-gray-500" />
                       </div>
                       <div className="min-w-0">
                         <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{cred.name}</h3>
                         {cred.url && (
                           <a href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline flex items-center gap-1 mt-0.5 truncate">
                             {cred.url} <ExternalLink size={10} />
                           </a>
                         )}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3 mt-5">
                   <div>
                     <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Username</label>
                     <div className="flex items-center justify-between mt-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-800">
                       <span className="text-sm text-gray-900 dark:text-gray-200 truncate pr-2 font-mono">{cred.username || '-'}</span>
                       {cred.username && (
                         <button onClick={() => handleCopy(cred.username!, 'username')} className="text-gray-400 hover:text-orange-500">
                           <Copy size={14} />
                         </button>
                       )}
                     </div>
                   </div>

                   <div>
                     <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Password</label>
                     <div className="flex items-center justify-between mt-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-800">
                       <span className="text-sm text-gray-900 dark:text-gray-200 truncate pr-2 font-mono flex-1">
                         {revealedPasswords[cred.id] ? revealedPasswords[cred.id] : '••••••••••••'}
                       </span>
                       <div className="flex items-center gap-2">
                         <button onClick={() => handleReveal(cred.id)} className="text-gray-400 hover:text-orange-500" title="Reveal">
                           <Eye size={14} />
                         </button>
                         {revealedPasswords[cred.id] && (
                           <button onClick={() => handleCopy(revealedPasswords[cred.id], 'password')} className="text-gray-400 hover:text-orange-500" title="Copy">
                             <Copy size={14} />
                           </button>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
               
               <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                 <button onClick={() => openFormModal(cred)} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-600 flex items-center gap-1">
                   <Edit2 size={14} /> Edit
                 </button>
                 <button onClick={() => confirmDelete(cred.id)} disabled={isDeleting === cred.id} className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1 disabled:opacity-50">
      {isDeleting === cred.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
    </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Verify PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setIsPinModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border border-gray-100 dark:border-gray-700">
              <form onSubmit={handleVerifyPin}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 mb-4">
                    <Lock className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                  </div>
                  <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                    Enter Secret PIN
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Please enter your PIN to access sensitive credentials.
                  </p>
                  <div className="mt-4">
                    <input
                      type="password"
                      required
                      autoFocus
                      maxLength={6}
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      className="text-center tracking-widest text-2xl mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="••••"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                  <button type="submit" disabled={isSaving} className="inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-2 bg-orange-600 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center justify-center gap-2">
                    Verify
                  </button>
                  <button type="button" onClick={() => setIsPinModalOpen(false)} className="inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-6 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Setup PIN Modal */}
      {isSetupPinModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setIsSetupPinModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border border-gray-100 dark:border-gray-700">
              <form onSubmit={handleSetupPin}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                    <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                    Setup Secret PIN
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Create a secure PIN to protect your passwords. You will need this to view or edit credentials.
                  </p>
                  <div className="mt-4">
                    <input
                      type="password"
                      required
                      autoFocus
                      minLength={4}
                      maxLength={6}
                      value={setupPin}
                      onChange={e => setSetupPin(e.target.value)}
                      className="text-center tracking-widest text-2xl mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="••••"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                  <button type="submit" disabled={isSaving} className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save PIN
                  </button>
                  <button type="button" onClick={() => setIsSetupPinModalOpen(false)} className="inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-6 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setIsFormModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-700">
              <form onSubmit={handleSubmit}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                      {currentCredential.id ? 'Edit Credential' : 'Add Credential'}
                    </h3>
                    <button type="button" onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name (e.g., GitHub)</label>
                      <input
                        type="text"
                        required
                        value={currentCredential.name || ''}
                        onChange={e => setCurrentCredential({...currentCredential, name: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
                      <input
                        type="url"
                        value={currentCredential.url || ''}
                        onChange={e => setCurrentCredential({...currentCredential, url: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                      <input
                        type="text"
                        value={currentCredential.username || ''}
                        onChange={e => setCurrentCredential({...currentCredential, username: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                      <textarea
                        required
                        rows={2}
                        value={currentCredential.password || ''}
                        onChange={e => setCurrentCredential({...currentCredential, password: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm font-mono bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
                      <textarea
                        rows={2}
                        value={currentCredential.notes || ''}
                        onChange={e => setCurrentCredential({...currentCredential, notes: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                  <button type="submit" disabled={isSaving} className="inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-2 bg-orange-600 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save
                  </button>
                  <button type="button" onClick={() => setIsFormModalOpen(false)} className="inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-6 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Credential"
        message="Are you sure you want to delete this credential?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
