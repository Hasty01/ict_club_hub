import React from 'react';
import { XIcon } from './icons/XIcon';

interface PendingApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PendingApprovalModal: React.FC<PendingApprovalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <XIcon />
        </button>
        
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Account Pending Approval
          </h3>
          
          <div className="space-y-3 text-gray-500 dark:text-gray-400">
            <p>
              Thanks for signing up! Your account has been created but needs to be approved by a club patron before you can access the dashboard.
            </p>
            <p className="text-sm">
              You will be able to log in once your membership request has been reviewed.
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center px-4 py-3 text-base font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-offset-gray-800"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalModal;