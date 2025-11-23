
import React, { useState, useCallback } from 'react';
import { User, ShowcaseItem, Tab } from '../types';
import { useData } from '../DataContext';
import * as api from '../services/apiService';
import { HeartIcon } from './icons/HeartIcon';
import { CodeIcon } from './icons/CodeIcon';
import { UserIcon } from './icons/UserIcon';
import { CopyIcon } from './icons/CopyIcon';

interface ShowcaseProps {
    currentUser: User;
    setActiveTab: (tab: Tab) => void;
}

// Minimal syntax highlighting logic
const SYNTAX_REGEX = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b(?:True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)\b|[\[\]\{\}\(\),:])/g;

const MiniSyntaxHighlighter: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(SYNTAX_REGEX);
    return (
        <>
            {parts.map((part, i) => {
                if (!part) return null;
                if (/^".*"$/.test(part) || /^'.*'$/.test(part)) return <span key={i} className="text-green-600 dark:text-green-400">{part}</span>;
                if (/^\d+(\.\d+)?$/.test(part)) return <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">{part}</span>;
                if (/^(True|False|None|and|or|not|def|class|return|import|from|if|else|elif|for|while|print)$/.test(part)) return <span key={i} className="text-purple-600 dark:text-purple-400 font-bold">{part}</span>;
                if (/^[\[\]\{\}\(\),:]$/.test(part)) return <span key={i} className="text-gray-500 dark:text-gray-500 font-bold">{part}</span>;
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

const ShowcaseCard: React.FC<{ item: ShowcaseItem, currentUser: User, onLike: (id: string, likes: string[]) => void, onClone: (code: string) => void }> = ({ item, currentUser, onLike, onClone }) => {
    const isLiked = item.likes.includes(currentUser.uid);
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg">
            <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <img 
                            src={item.userAvatarUrl || `https://i.pravatar.cc/40?u=${item.userUid}`} 
                            alt={item.userName} 
                            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
                        />
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-tight line-clamp-1" title={item.title}>{item.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">by {item.userName} • {item.createdAt}</p>
                        </div>
                    </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{item.description}</p>
                
                <div className="bg-gray-900 dark:bg-black rounded-lg p-3 font-mono text-xs text-gray-300 h-32 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-1 bg-gray-900/80 rounded-bl-lg">
                        <CodeIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="whitespace-pre-wrap break-all">
                        <MiniSyntaxHighlighter text={item.codeContent.slice(0, 300) + (item.codeContent.length > 300 ? '...' : '')} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
                </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                    <button 
                        onClick={() => onLike(item.id, item.likes)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${isLiked ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        <HeartIcon className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                        <span>{item.likes.length}</span>
                    </button>
                </div>
                
                <button 
                    onClick={() => onClone(item.codeContent)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 dark:bg-gray-700 hover:bg-pink-600 dark:hover:bg-pink-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                    <CopyIcon className="h-3.5 w-3.5" />
                    <span>Clone to Playground</span>
                </button>
            </div>
        </div>
    );
};

const Showcase: React.FC<ShowcaseProps> = ({ currentUser, setActiveTab }) => {
    const { showcaseItems, isLoadingShowcase, showcaseError, fetchShowcaseItems } = useData();
    const [searchTerm, setSearchTerm] = useState('');

    const handleLike = useCallback(async (id: string, currentLikes: string[]) => {
        try {
            await api.toggleShowcaseLike(id, currentUser.uid, currentLikes);
            await fetchShowcaseItems();
        } catch (error) {
            console.error("Failed to like item:", error);
        }
    }, [currentUser.uid, fetchShowcaseItems]);

    const handleClone = useCallback((code: string) => {
        const event = new CustomEvent('open-in-playground', { detail: code });
        window.dispatchEvent(event);
        setActiveTab('playground');
    }, [setActiveTab]);

    const filteredItems = showcaseItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoadingShowcase) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    if (showcaseError) {
        return <div className="text-center p-8 text-red-500">{showcaseError}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Code Showcase</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Discover and share awesome Python snippets created by the club.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <input 
                        type="text" 
                        placeholder="Search snippets..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <CodeIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No code snippets found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Be the first to publish your code from the Playground!</p>
                    <button 
                        onClick={() => setActiveTab('playground')}
                        className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                    >
                        Go to Playground
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => (
                        <ShowcaseCard 
                            key={item.id} 
                            item={item} 
                            currentUser={currentUser} 
                            onLike={handleLike}
                            onClone={handleClone}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Showcase;
