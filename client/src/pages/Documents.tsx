import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Upload, Trash2, File, Download, FileText } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../store/useAuth';

interface Document {
  id: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocuments(data || []);
    } catch (error) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const toastId = toast.loading('Uploading document...');

    try {
      // 1. Upload to Supabase Storage (Assumes 'documents' bucket exists and is private)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        // Fallback for demo if bucket isn't set up yet
        if (uploadError.message.includes('Bucket not found')) {
           toast.error('Storage bucket "documents" is not configured. Please create it in Supabase.', { id: toastId });
           return;
        }
        throw uploadError;
      }

      // 2. Save metadata to database
      await api.post('/documents', {
        file_name: fileName,
        original_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size
      });

      toast.success('Document uploaded successfully', { id: toastId });
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to upload document', { id: toastId });
    } finally {
      setUploading(false);
      // reset input
      e.target.value = '';
    }
  };

  const confirmDelete = (doc: Document) => {
    setDocToDelete(doc);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    try {
      // Delete from DB first
      await api.delete(`/documents/${docToDelete.id}`);
      
      // Then try to delete from storage
      await supabase.storage.from('documents').remove([docToDelete.file_path]);

      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 60); // 60 seconds expiry

      if (error) throw error;
      
      // Open in new tab to download
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      toast.error('Failed to generate download link');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Securely store and manage your files.</p>
        </div>
        <div>
          <label className="inline-flex items-center p-2.5 sm:px-4 sm:py-2 border border-transparent rounded-full sm:rounded-xl shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors cursor-pointer disabled:opacity-50">
            <Upload className="sm:-ml-1 sm:mr-2 h-5 w-5" />
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload Document'}</span>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>)}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No documents</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Upload your first document to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {documents.map((doc) => (
              <li key={doc.id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center min-w-0 gap-4">
                   <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                      <File size={20} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                       {doc.original_name}
                     </p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                       {formatFileSize(doc.file_size)} • Uploaded {format(new Date(doc.created_at), 'MMM d, yyyy')}
                     </p>
                   </div>
                </div>
                <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-4">
                  <button onClick={() => handleDownload(doc)} className="p-2 text-gray-400 hover:text-orange-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                    <Download size={16} />
                  </button>
                  <button onClick={() => confirmDelete(doc)} className="p-2 text-gray-400 hover:text-red-600 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Document"
        message="Are you sure you want to delete this document?"
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
