import React, { useCallback } from 'react';
import { Activity, User } from '../types';
import * as api from '../services/apiService';
import AddActivityForm from './AddActivityForm';
import ActivityCard from './ActivityCard';
import { useData } from '../DataContext';

interface ActivitiesProps {
  currentUser: User;
}

const Activities: React.FC<ActivitiesProps> = ({ currentUser }) => {
  const { activities, isLoadingActivities, activitiesError, fetchActivities } = useData();

  const handleAddActivity = useCallback(async (newActivity: Omit<Activity, 'id'>) => {
    await api.addActivity(newActivity);
    await fetchActivities(); // Refetch from context
  }, [fetchActivities]);

  const renderContent = () => {
    if (isLoadingActivities) {
        return <p className="text-center text-gray-500 dark:text-gray-400">Loading activities...</p>;
    }
    if (activitiesError) {
        return <p className="text-center text-red-500 dark:text-red-400 py-4">{`Error fetching activities: ${activitiesError}`}</p>;
    }
    if (activities.length > 0) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                ))}
            </div>
        );
    }
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">No activities have been added yet.</p>;
  };


  return (
    <div>
        {currentUser.role === 'PATRON' && <AddActivityForm onAddActivity={handleAddActivity} />}

        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Upcoming Activities</h2>
        {renderContent()}
    </div>
  );
};

export default Activities;
