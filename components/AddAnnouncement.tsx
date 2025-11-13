import React, { useState } from 'react';
import { User } from '../types';
import { generateAnnouncement } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';

interface AddAnnouncementProps {
    currentUser: User;
    onAddAnnouncement: (data: { title: string, message: string }) => Promise<void>;
}

const AddAnnouncement: React.FC<AddAnnouncementProps> = ({ currentUser, onAddAnnouncement }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New state for AI feature
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            alert('Please fill out both title and message.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onAddAnnouncement({ title, message });
            setTitle('');
            setMessage('');
        } catch (error) {
            alert('Failed to post announcement.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // New handler for AI generation
    const handleGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        setAiError(null);
        try {
            const { title: generatedTitle, message: generatedMessage } = await generateAnnouncement(aiPrompt);
            setTitle(generatedTitle);
            setMessage(generatedMessage);
        } catch (error: any) {
            setAiError(error.message || 'An unknown error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };


    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex items-start space-x-4">
                 <img src={currentUser.avatarUrl || `https://i.pravatar.cc/40?u=${currentUser.username}`} alt={currentUser.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                <form onSubmit={handleSubmit} className="space-y-3 flex-grow">
                    <input
                        id="announcement-title"
                        type="text"
                        placeholder="Announcement Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    />
                    <textarea
                        id="announcement-message"
                        placeholder="What's on your mind?"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                    ></textarea>
                    <div className="text-right">
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 dark:focus:ring-offset-gray-800 transition-all">
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>

             {/* AI Assistant Section */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                    <SparklesIcon /> AI Assistant
                </h4>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., 'announce a pizza party next friday'"
                        className="flex-grow w-full p-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                        disabled={isGenerating}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerate(); } }}
                    />
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating || !aiPrompt.trim()}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg shadow-md hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
                    </button>
                </div>
                {aiError && <p className="mt-2 text-xs text-red-500 dark:text-red-400">{aiError}</p>}
            </div>

        </div>
    );
};

export default AddAnnouncement;