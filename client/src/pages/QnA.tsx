import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Database, Trash2, HelpCircle, Loader2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { format } from 'date-fns';

interface QnA {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

export default function QnA() {
  const [qnas, setQnas] = useState<QnA[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [qnaToDelete, setQnaToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchQnas();
  }, []);

  const fetchQnas = async () => {
    try {
      const { data } = await api.get('/qna');
      setQnas(data || []);
    } catch {
      toast.error('Failed to fetch QA data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonInput.trim()) {
      toast.error('Please enter JSON data');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonInput);
      if (!Array.isArray(parsedData)) {
        throw new Error('JSON must be an array of objects.');
      }
    } catch (error: any) {
      toast.error(`Invalid JSON: ${error.message}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/qna/bulk', parsedData);
      toast.success(data.message || 'QA pairs imported successfully');
      setJsonInput('');
      fetchQnas();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import QA pairs');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setQnaToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!qnaToDelete) return;
    try {
      await api.delete(`/qna/${qnaToDelete}`);
      toast.success('QA deleted');
      fetchQnas();
    } catch {
      toast.error('Failed to delete QA');
    } finally {
      setQnaToDelete(null);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QA Database</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Import and manage your questions and answers.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Bulk Import JSON</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              JSON Format expected: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-orange-600 dark:text-orange-400">{'[{ "question": "...", "answer": "..." }]'}</code>
            </label>
            <textarea
              required
              rows={8}
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm py-3 px-4 focus:outline-none focus:ring-orange-500 focus:border-orange-500 bg-gray-50 dark:bg-gray-900/50 dark:text-white font-mono text-sm"
              placeholder={'[\n  {\n    "question": "What is the capital of France?",\n    "answer": "Paris"\n  }\n]'}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl border border-transparent shadow-sm px-6 py-2.5 bg-orange-600 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 min-w-[140px]"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Importing...</>
              ) : (
                <><Database className="w-5 h-5 mr-2" /> Import to DB</>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
          <HelpCircle className="w-5 h-5 mr-2 text-orange-500" />
          Saved QA Pairs
        </h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>)}
          </div>
        ) : qnas.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <Database className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No QA pairs found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Import your JSON above to populate the database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {qnas.map((qna) => (
              <div key={qna.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{qna.question}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl whitespace-pre-wrap">
                      {qna.answer}
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                      Added on {format(new Date(qna.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <button 
                    onClick={() => confirmDelete(qna.id)} 
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0" 
                    title="Delete QA"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete QA"
        message="Are you sure you want to delete this Question & Answer pair?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
