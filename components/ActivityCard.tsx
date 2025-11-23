
import React from 'react';
import { Activity } from '../types';

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Kampala',
      timeZoneName: 'short'
    }).format(date);
  } catch (error) {
    return dateString;
  }
};

const ActivityCard: React.FC<{ activity: Activity }> = ({ activity }) => (
  <div className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:-translate-y-1 hover:border-pink-200 dark:hover:border-pink-900/50 relative overflow-hidden">
    {/* Decorative gradient blob on hover */}
    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-full blur-xl"></div>
    
    <div className="relative z-10">
        <div className="flex justify-between items-start mb-4 gap-3">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{activity.title}</h3>
        <span className="flex-shrink-0 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-100 dark:border-purple-800">
            {formatDate(activity.date)}
        </span>
        </div>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-750 p-2 rounded-lg inline-flex">
            <svg className="w-4 h-4 mr-2 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span className="font-medium">{activity.location}</span>
        </div>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm line-clamp-3 group-hover:line-clamp-none transition-all duration-300">{activity.description}</p>
    </div>
  </div>
);

export default React.memo(ActivityCard);
