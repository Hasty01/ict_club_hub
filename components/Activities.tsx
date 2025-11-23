
import React, { useCallback, useState, useMemo } from 'react';
import { Activity, User } from '../types';
import * as api from '../services/apiService';
import AddActivityForm from './AddActivityForm';
import ActivityCard from './ActivityCard';
import CalendarView from './CalendarView';
import { useData } from '../DataContext';
import { CalendarIcon } from './icons/CalendarIcon';
import { ViewListIcon } from './icons/ViewListIcon';
import ConfirmationModal from './ConfirmationModal';

interface ActivitiesProps {
  currentUser: User;
}

type FilterType = 'UPCOMING' | 'PAST' | 'ALL';

interface RSVPActionState {
    isOpen: boolean;
    activityId: string;
    activityTitle: string;
    isJoining: boolean;
}

const Activities: React.FC<ActivitiesProps> = ({ currentUser }) => {
  const { activities, isLoadingActivities, activitiesError, fetchActivities } = useData();
  const [filter, setFilter] = useState<FilterType>('UPCOMING');
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  
  // RSVP Confirmation State
  const [rsvpState, setRsvpState] = useState<RSVPActionState>({
      isOpen: false,
      activityId: '',
      activityTitle: '',
      isJoining: false
  });

  const handleAddActivity = useCallback(async (newActivity: Omit<Activity, 'id' | 'rsvpUserIds'>) => {
    await api.addActivity(newActivity);
    await fetchActivities(); // Refetch from context
  }, [fetchActivities]);

  const initiateRSVP = useCallback((activityId: string, isJoining: boolean) => {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      setRsvpState({
          isOpen: true,
          activityId,
          activityTitle: activity.title,
          isJoining
      });
  }, [activities]);

  const confirmRSVP = useCallback(async () => {
      try {
          await api.toggleRSVP(rsvpState.activityId, currentUser.uid, rsvpState.isJoining);
          await fetchActivities();
      } catch (error) {
          console.error("RSVP failed", error);
          alert("Failed to update RSVP status.");
      } finally {
          setRsvpState(prev => ({ ...prev, isOpen: false }));
      }
  }, [rsvpState.activityId, rsvpState.isJoining, currentUser.uid, fetchActivities]);

  const filteredAndSortedActivities = useMemo(() => {
    // Get today's date in EAT (YYYY-MM-DD)
    const todayEAT = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Kampala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());

    const filtered = activities.filter(activity => {
        // activity.date is YYYY-MM-DD string
        if (filter === 'UPCOMING') {
            return activity.date >= todayEAT;
        }
        if (filter === 'PAST') {
            return activity.date < todayEAT;
        }
        return true; // 'ALL'
    });

    // Sort logic using string comparison (works for YYYY-MM-DD)
    return filtered.sort((a, b) => {
        if (filter === 'UPCOMING') {
            // Upcoming: Soonest first (Ascending)
            return a.date.localeCompare(b.date);
        } else {
            // Past or All: Newest first (Descending)
            return b.date.localeCompare(a.date);
        }
    });
  }, [activities, filter]);

  const renderListContent = () => {
    if (isLoadingActivities) {
        return <p className="text-center text-gray-500 dark:text-gray-400 animate-pulse">Loading activities...</p>;
    }
    if (activitiesError) {
        return <p className="text-center text-red-500 dark:text-red-400 py-4 bg-red-50 dark:bg-red-900/10 rounded-lg">{`Error fetching activities: ${activitiesError}`}</p>;
    }
    if (filteredAndSortedActivities.length > 0) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedActivities.map((activity) => (
                    <ActivityCard 
                        key={activity.id} 
                        activity={activity} 
                        currentUser={currentUser}
                        onToggleRSVP={initiateRSVP}
                    />
                ))}
            </div>
        );
    }
    
    let emptyMessage = "No activities found.";
    if (filter === 'UPCOMING') emptyMessage = "No upcoming activities scheduled.";
    if (filter === 'PAST') emptyMessage = "No past activities found.";
    
    return <p className="text-center text-gray-500 dark:text-gray-400 py-10 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">{emptyMessage}</p>;
  };

  const getTitle = () => {
      if (viewMode === 'CALENDAR') return 'Activity Calendar';
      if (filter === 'UPCOMING') return 'Upcoming Activities';
      if (filter === 'PAST') return 'Past Activities';
      return 'All Activities';
  };

  return (
    <div>
        {currentUser.role === 'PATRON' && <AddActivityForm onAddActivity={handleAddActivity} />}

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                 <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">
                    {getTitle()}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                    {viewMode === 'LIST' 
                        ? `Showing ${filter.toLowerCase()} events` 
                        : 'Monthly overview of club events'}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                 {/* View Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                            viewMode === 'LIST'
                                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                        title="List View"
                    >
                         <ViewListIcon />
                    </button>
                    <button
                        onClick={() => setViewMode('CALENDAR')}
                        className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                            viewMode === 'CALENDAR'
                                ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                        title="Calendar View"
                    >
                        <CalendarIcon />
                    </button>
                </div>

                {/* Filter Controls - Only visible in List Mode */}
                {viewMode === 'LIST' && (
                    <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl overflow-x-auto">
                         {(['UPCOMING', 'PAST', 'ALL'] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                                    filter === f
                                        ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                {f.charAt(0) + f.slice(1).toLowerCase()}
                            </button>
                         ))}
                    </div>
                )}
            </div>
        </div>

        {viewMode === 'LIST' ? renderListContent() : <CalendarView activities={activities} />}

        <ConfirmationModal
            isOpen={rsvpState.isOpen}
            onClose={() => setRsvpState(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmRSVP}
            title={rsvpState.isJoining ? "Join Activity" : "Cancel RSVP"}
            message={`Are you sure you want to ${rsvpState.isJoining ? "join" : "leave"} "${rsvpState.activityTitle}"?`}
            confirmText={rsvpState.isJoining ? "Confirm Join" : "Confirm Leave"}
            isDangerous={!rsvpState.isJoining}
        />
    </div>
  );
};

export default Activities;
