
import React from 'react';
import { FeedItem, FeedItemType } from '../types';
import { HeartIcon } from './icons/HeartIcon';

const badgeConfig: { [key in FeedItemType]: {
    text: string;
    bgClass: string;
    textClass: string;
    iconClass: string;
} } = {
  EVENT_ANNOUNCEMENT: {
    text: 'Event',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-800 dark:text-purple-300',
    iconClass: 'text-purple-500'
  },
  MEMBER_POST: {
    text: 'Discussion',
    bgClass: 'bg-pink-100 dark:bg-pink-900/30',
    textClass: 'text-pink-800 dark:text-pink-300',
    iconClass: 'text-pink-500'
  },
  NEWS_UPDATE: {
    text: 'News',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-800 dark:text-blue-300',
    iconClass: 'text-blue-500'
  },
};

interface FeedItemCardProps {
  item: FeedItem;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item }) => {
  const config = badgeConfig[item.type];
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="p-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
                <img 
                    src={item.authorAvatarUrl} 
                    alt={item.author} 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700" 
                />
                <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.author}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp}</p>
                </div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${config.bgClass} ${config.textClass}`}>
                {config.text}
            </span>
        </div>

        {/* Content */}
        <div className="px-5 pb-4">
            {item.title && (
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 leading-snug">
                    {item.title}
                </h3>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                 <p className="whitespace-pre-wrap break-words leading-relaxed">{item.message}</p>
            </div>
        </div>

        {/* Footer / Interactive Area (Visual only for now) */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
             <div className="flex gap-4">
                 {/* Like Button (Mock) */}
                 <button className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 transition-colors group">
                    <HeartIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Like</span>
                 </button>
             </div>
             
             <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                 ID: {item.id.substring(0, 6)}...
             </div>
        </div>
    </div>
  );
};

export default React.memo(FeedItemCard);
