import React from 'react';
import { Resource, User } from '../types';
import { LinkIcon } from './icons/LinkIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { TrashIcon } from './icons/TrashIcon';
import { supabase } from '../services/supabaseClient';

interface ResourceCardProps {
  resource: Resource;
  currentUser: User;
  onDelete: (resource: Resource) => void;
}

const getResourceIcon = (type: Resource['type']) => {
  switch (type) {
    case 'LINK':
      return <LinkIcon />;
    case 'VIDEO':
      return <VideoCameraIcon />;
    default:
      return null;
  }
};

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, currentUser, onDelete }) => {
    const isPatron = currentUser.role === 'PATRON';

    const getActionLink = () => {
        // The full public URL for all resource types is now stored in the `url` property.
        // The `filePath` is still used for deletions but not for display.
        return resource.url || '#';
    };

    const actionText = 'View';
    
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 flex items-start gap-4 hover:shadow-lg transition-shadow">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-pink-500">
                {getResourceIcon(resource.type)}
            </div>
            <div className="flex-grow">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">{resource.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{resource.description}</p>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Uploaded by {resource.uploaderName} on {resource.createdAt}
                </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                <a
                    href={getActionLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg shadow-sm hover:bg-pink-700 transition-all"
                >
                    {actionText}
                </a>
                {isPatron && (
                    <button
                        onClick={() => onDelete(resource)}
                        className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        aria-label="Delete resource"
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ResourceCard;