import React, { useCallback, useState, useMemo } from 'react';
import { Activity, User } from '../types';
import * as api from '../services/apiService';
import AddActivityForm from './AddActivityForm';
import ActivityCard from './ActivityCard';
import { useData } from '../DataContext';

interface ActivitiesProps {
  currentUser: User;
}

type FilterType = 'UPCOMING' | 'PAST' | 'ALL';

const Activities: React.FC<ActivitiesProps> = ({ currentUser }) => {
  const { activities, isLoadingActivities, activitiesError, fetchActivities } = useData();
  const [filter, setFilter] = useState<FilterType>('UPCOMING');

  const handleAddActivity = useCallback(async (newActivity: Omit<Activity, 'id'>) => {
    await api.addActivity(newActivity);
    await fetchActivities(); // Refetch from context
  }, [fetchActivities]);

  const filteredAndSortedActivities = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to midnight for accurate date comparison

    const filtered = activities.filter(activity => {
        const activityDate = new Date(activity.date);
        // Ensure the activity date is treated as local time or UTC consistently depending on your input method.
        // Assuming standard YYYY-MM-DD from input type="date", it parses as UTC usually, 
        // but for simple day comparison:
        const activityDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());

        if (filter === 'UPCOMING') {
            return activityDay >= today;
        }
        if (filter === 'PAST') {
            return activityDay < today;
        }
        return true; // 'ALL'
    });

    // Sort logic
    return filtered.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();

        if (filter === 'UPCOMING') {
            // Upcoming: Soonest first (Ascending)
            return dateA - dateB;
        } else {
            // Past or All: Newest first (Descending)
            return dateB - dateA;
        }
    });
  }, [activities, filter]);

  const renderContent = () => {
    if (isLoadingActivities) {
        return <p className="text-center text-gray-500 dark:text-gray-400">Loading activities...</p>;
    }
    if (activitiesError) {
        return <p className="text-center text-red-500 dark:text-red-400 py-4">{`Error fetching activities: ${activitiesError}`}</p>;
    }
    if (filteredAndSortedActivities.length > 0) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedActivities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                ))}
            </div>
        );
    }
    
    let emptyMessage = "No activities found.";
    if (filter === 'UPCOMING') emptyMessage = "No upcoming activities scheduled.";
    if (filter === 'PAST') emptyMessage = "No past activities found.";
    
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">{emptyMessage}</p>;
  };

  return (
    <div>
        {currentUser.role === 'PATRON' && <AddActivityForm onAddActivity={handleAddActivity} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                {filter === 'UPCOMING' ? 'Upcoming Activities' : filter === 'PAST' ? 'Past Activities' : 'All Activities'}
            </h2>

            {/* Filter Controls */}
            <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg self-start sm:self-auto">
                <button
                    onClick={() => setFilter('UPCOMING')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        filter === 'UPCOMING'
                            ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                >
                    Upcoming
                </button>
                <button
                    onClick={() => setFilter('PAST')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        filter === 'PAST'
                            ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                >
                    Past
                </button>
                 <button
                    onClick={() => setFilter('ALL')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        filter === 'ALL'
                            ? 'bg-white dark:bg-gray-600 text-pink-600 dark:text-pink-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                >
                    All
                </button>
            </div>
        </div>

        {renderContent()}
    </div>
  );
};

export default Activities;