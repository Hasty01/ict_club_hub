
import React, { useState, useEffect, useCallback } from 'react';
import { FeedItem, User, FeedItemType } from '../types';
import * as api from '../services/apiService';
import AddAnnouncement from './AddAnnouncement';
import FeedItemCard from './FeedItemCard';
import { useData } from '../DataContext';

interface FeedProps {
  currentUser: User;
}

const Feed: React.FC<FeedProps> = ({ currentUser }) => {
  const { feedItems: items, isLoadingFeed, feedItemsError, fetchFeedItems } = useData();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    if(!isLoadingFeed) {
        const timer = setTimeout(() => setIsMounted(true), 100);
        return () => clearTimeout(timer);
    }
  }, [isLoadingFeed]);

  const handleAddAnnouncement = useCallback(async (data: { title: string, message: string, type: FeedItemType }) => {
    await api.addFeedItem({ ...data }, currentUser.uid);
    await fetchFeedItems();
  }, [fetchFeedItems, currentUser.uid]);

  if (isLoadingFeed) {
    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading club updates...</p>
        </div>
    );
  }
  
  if (feedItemsError) {
      return (
          <div className="p-8 text-center">
              <div className="inline-block p-4 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Oops!</h3>
              <p className="text-gray-500 dark:text-gray-400">{`Error loading feed: ${feedItemsError}`}</p>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <header className="mb-8 text-center sm:text-left">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">
            Activity Feed
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Latest news, announcements, and updates from the club.
          </p>
      </header>
      
      {currentUser.role === 'PATRON' && (
        <div className="mb-8 transform transition-all hover:-translate-y-1 duration-300">
            <AddAnnouncement 
                currentUser={currentUser}
                onAddAnnouncement={handleAddAnnouncement}
            />
        </div>
      )}

      <div className="space-y-6">
        {items.length === 0 ? (
             <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="text-gray-300 dark:text-gray-600 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h2m-4 3h2m-4 3h2m-4 3h2m-4 3h2" />
                    </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No announcements yet.</p>
             </div>
        ) : (
            items.map((item, index) => (
            <div
                key={item.id}
                className={`transform transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 75}ms` }}
            >
                <FeedItemCard item={item} />
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Feed;
