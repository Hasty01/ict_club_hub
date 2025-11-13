import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Activity, AttendanceRecord, FeedItem, ProjectData, User, Resource, Notification } from './types';
import * as api from './services/apiService';

// Define the shape of the context state
interface IDataContext {
  // Data
  activities: Activity[];
  attendance: AttendanceRecord[];
  feedItems: FeedItem[];
  projectData: ProjectData | null;
  allUsers: User[];
  resources: Resource[];
  notifications: Notification[];

  // Loading states
  isLoadingActivities: boolean;
  isLoadingAttendance: boolean;
  isLoadingFeed: boolean;
  isLoadingProjects: boolean;
  isLoadingUsers: boolean;
  isLoadingResources: boolean;
  isLoadingNotifications: boolean;
  isInitialLoading: boolean;

  // Error states
  activitiesError: string | null;
  attendanceError: string | null;
  feedItemsError: string | null;
  projectDataError: string | null;
  allUsersError: string | null;
  resourcesError: string | null;
  notificationsError: string | null;

  // Refetch functions
  fetchActivities: () => Promise<void>;
  fetchAttendance: () => Promise<void>;
  fetchFeedItems: () => Promise<void>;
  fetchProjectData: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchResources: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

// Create the context with a default value
const DataContext = createContext<IDataContext | undefined>(undefined);

// Create a provider component
export const DataProvider: React.FC<{ children: ReactNode; currentUser: User }> = ({ children, currentUser }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [rawResources, setRawResources] = useState<Omit<Resource, 'uploaderName' | 'uploaderAvatarUrl'>[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [feedItemsError, setFeedItemsError] = useState<string | null>(null);
  const [projectDataError, setProjectDataError] = useState<string | null>(null);
  const [allUsersError, setAllUsersError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
      const data = await api.getActivities();
      setActivities(data);
    } catch (e: any) {
      console.error("Failed to fetch activities", e);
      setActivitiesError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    setIsLoadingAttendance(true);
    setAttendanceError(null);
    try {
      const data = await api.getAttendance(currentUser.uid);
      setAttendance(data);
    } catch (e: any) {
      console.error("Failed to fetch attendance", e);
      setAttendanceError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [currentUser.uid]);
  
  const fetchFeedItems = useCallback(async () => {
    setIsLoadingFeed(true);
    setFeedItemsError(null);
    try {
      const data = await api.getFeedItems();
      setFeedItems(data);
    } catch (e: any) {
      console.error("Failed to fetch feed items", e);
      setFeedItemsError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  const fetchProjectData = useCallback(async () => {
    setIsLoadingProjects(true);
    setProjectDataError(null);
    try {
      const data = await api.getProjectData();
      setProjectData(data);
    } catch (e: any) {
      console.error("Failed to fetch project data", e);
      setProjectDataError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);
  
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setAllUsersError(null);
    try {
      const data = await api.getUsers();
      setAllUsers(data);
    } catch (e: any) {
      console.error("Failed to fetch users", e);
      setAllUsersError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    setIsLoadingResources(true);
    setResourcesError(null);
    try {
      const data = await api.getResources();
      setRawResources(data);
    } catch (e: any) {
      console.error("Failed to fetch resources", e);
      setResourcesError(e.message || 'An unknown error occurred.');
      setIsLoadingResources(false); // Ensure loading stops on error
    }
  }, []);
  
  const fetchNotifications = useCallback(async () => {
    if (currentUser.role !== 'PATRON') {
        setNotifications([]);
        setIsLoadingNotifications(false);
        return;
    }
    setIsLoadingNotifications(true);
    setNotificationsError(null);
    try {
        const data = await api.getNotifications(currentUser.uid);
        setNotifications(data);
    } catch (e: any) {
        console.error("Failed to fetch notifications", e);
        setNotificationsError(e.message);
    } finally {
        setIsLoadingNotifications(false);
    }
  }, [currentUser.uid, currentUser.role]);

  // Effect to perform the client-side join for resources
  useEffect(() => {
    if (isLoadingUsers || resourcesError) { // Don't process if users are loading or there was an error fetching resources
      return; 
    }

    const userMap: Map<string, User> = new Map(allUsers.map(user => [user.uid, user]));

    const enrichedResources = rawResources.map(resource => {
      const uploader = userMap.get(resource.uploaderUid);
      return {
        ...resource,
        uploaderName: uploader?.name || 'Unknown User',
        uploaderAvatarUrl: uploader?.avatarUrl,
      };
    });
    
    setResources(enrichedResources);
    setIsLoadingResources(false); // Mark final resources as loaded
  }, [rawResources, allUsers, isLoadingUsers, resourcesError]);
  
  
  // Fetch all data when the provider mounts (i.e., when the user logs in)
  useEffect(() => {
    if (currentUser) {
      Promise.all([
        fetchActivities(),
        fetchAttendance(),
        fetchFeedItems(),
        fetchProjectData(),
        fetchUsers(),
        fetchNotifications(),
      ]).then(() => {
        // After users are fetched, resources can be fetched and joined
        fetchResources();
      });
    }
  }, [currentUser, fetchActivities, fetchAttendance, fetchFeedItems, fetchProjectData, fetchUsers, fetchResources, fetchNotifications]);

  const value = {
    activities,
    attendance,
    feedItems,
    projectData,
    allUsers,
    resources,
    notifications,
    isLoadingActivities,
    isLoadingAttendance,
    isLoadingFeed,
    isLoadingProjects,
    isLoadingUsers,
    isLoadingResources,
    isLoadingNotifications,
    activitiesError,
    attendanceError,
    feedItemsError,
    projectDataError,
    allUsersError,
    resourcesError,
    notificationsError,
    isInitialLoading: isLoadingActivities || isLoadingAttendance || isLoadingFeed || isLoadingProjects || isLoadingUsers || isLoadingResources || isLoadingNotifications,
    fetchActivities,
    fetchAttendance,
    fetchFeedItems,
    fetchProjectData,
    fetchUsers,
    fetchResources,
    fetchNotifications,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

// Create a custom hook for easy access to the context
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};