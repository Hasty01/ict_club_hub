
import React from 'react';
import { FeedItem, FeedItemType } from '../types';
import { HeartIcon } from './icons/HeartIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

const badgeConfig: { [key in FeedItemType]: {
    text: string;
    bgClass: string;
    textClass: string;
} } = {
  EVENT_ANNOUNCEMENT: {
    text: 'Event',
    bgClass: 'bg-purple-100 dark:bg-purple-500/20',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  MEMBER_POST: {
    text: 'Discussion',
    bgClass: 'bg-pink-100 dark:bg-pink-500/20',
    textClass: 'text-pink-700 dark:text-pink-300',
  },
  NEWS_UPDATE: {
    text: 'News',
    bgClass: 'bg-blue-100 dark:bg-blue-500/20',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
};

interface FeedItemCardProps {
  item: FeedItem;
}

const FeedItemCard: React.FC<FeedItemCardProps> = ({ item }) => {
  const config = badgeConfig[item.type];
  
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-3xl p-1 shadow-sm hover:shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1">
        <div className="bg-white dark:bg-gray-800 rounded-[1.4rem] p-5 sm:p-6 h-full relative overflow-hidden">
             {/* Decorative gradient blur top right */}
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full opacity-50 blur-2xl group-hover:from-pink-100 group-hover:to-purple-100 dark:group-hover:from-pink-900/30 dark:group-hover:to-purple-900/30 transition-colors duration-500"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img 
                            src={item.authorAvatarUrl} 
                            alt={item.author} 
                            className="w-12 h-12 rounded-full object-cover ring-4 ring-gray-50 dark:ring-gray-750 shadow-sm" 
                        />
                        {/* Online/Status indicator dot mockup */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{item.author}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.timestamp}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bgClass} ${config.textClass} shadow-sm border border-transparent dark:border-white/5`}>
                    {config.text}
                </span>
            </div>

            {/* Content */}
            <div className="mb-6 relative z-10">
                {item.title && (
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-purple-600 transition-all duration-300">
                        {item.title}
                    </h3>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{item.message}</p>
                </div>
            </div>

            {/* Footer / Interactive Area */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50 relative z-10">
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600 dark:hover:text-pink-400 transition-all group/btn">
                        <HeartIcon className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-xs font-medium">Like</span>
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-all group/btn">
                         <ChatBubbleIcon />
                         <span className="text-xs font-medium">Comment</span>
                    </button>
                </div>
                
                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    #{item.id.slice(0,4)}
                </div>
            </div>
        </div>
    </div>
  );
};

export default React.memo(FeedItemCard);
