'use client';

import { useState } from 'react';
import { RadarrMovie } from '@/types';

interface DeleteMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: RadarrMovie | null;
  onDelete: (deleteFiles: boolean) => Promise<void>;
}

export default function DeleteMovieModal({ isOpen, onClose, movie, onDelete }: DeleteMovieModalProps) {
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !movie) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    
    try {
      await onDelete(deleteFiles);
      // Reset state on success
      setDeleteFiles(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete movie');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setDeleteFiles(false);
      setError(null);
      onClose();
    }
  };

  const hasFile = movie.hasFile || movie.movieFile;
  const folderPath = movie.path || movie.movieFile?.path;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={handleClose}
        ></div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Delete Movie
              </h3>
              <button
                onClick={handleClose}
                disabled={deleting}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to delete <span className="font-semibold">{movie.title}</span>?
              </p>

              {folderPath && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all">{folderPath}</p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteFiles}
                    onChange={(e) => setDeleteFiles(e.target.checked)}
                    disabled={deleting}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {hasFile ? 'Delete movie files and folder' : 'Delete movie folder'}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {hasFile 
                        ? 'This will permanently delete the movie file(s) and the entire movie folder from disk. This action cannot be undone.'
                        : 'This will permanently delete the movie folder from disk. This action cannot be undone.'}
                    </p>
                  </div>
                </label>
              </div>

              {!deleteFiles && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    If unchecked, the movie will only be removed from the Radarr database. Files and folders will remain on disk.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Movie'}
            </button>
            <button
              onClick={handleClose}
              disabled={deleting}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

