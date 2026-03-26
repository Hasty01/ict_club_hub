
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { User, Tab } from '../types';
import AiTutor from './AiTutor';
import DailyTipModal from './PythonTipModal';
import { useData } from '../DataContext';

const Feed = lazy(() => import('./Feed'));
const Activities = lazy(() => import('./Activities'));
const Attendance = lazy(() => import('./Attendance'));
const ProjectsBoard = lazy(() => import('./ProjectsBoard'));
const Profile = lazy(() => import('./Profile'));
const Members = lazy(() => import('./Members'));
const CodePlayground = lazy(() => import('./CodePlayground'));
const Resources = lazy(() => import('./Resources'));
const Chat = lazy(() => import('./Chat'));
const Showcase = lazy(() => import('./Showcase'));
const Suggestions = lazy(() => import('./Suggestions'));
const Challenges = lazy(() => import('./Challenges'));
const RoadmapView = lazy(() => import('./RoadmapView'));
const Community = lazy(() => import('./Community'));
const AdminTools = lazy(() => import('./AdminTools'));


type Theme = 'light' | 'dark';

interface DashboardProps {
  currentUser: User;
  onUpdateUserProfile: (user: User) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  theme: Theme;
}

const LoadingIndicator: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
    </div>
);

// A simple wrapper to control visibility without unmounting the component
const TabPanel: React.FC<{ active: boolean; children: React.ReactNode; className?: string }> = ({ active, children, className }) => (
    <div className={`${active ? 'block' : 'hidden'} ${className || ''}`}>
        {children}
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ currentUser, onUpdateUserProfile, activeTab, setActiveTab, theme }) => {
  const [showTipModal, setShowTipModal] = useState(false);
  const { featureFlags } = useData();

  useEffect(() => {
      // Check if we have shown the tip today
      // Key updated to 'last_daily_tip_date' for consistency
      const lastTipDate = localStorage.getItem('last_daily_tip_date');
      const today = new Date().toDateString();

      if (lastTipDate !== today) {
          // Add a small delay so it doesn't pop up instantly over the UI rendering
          const timer = setTimeout(() => {
              setShowTipModal(true);
              localStorage.setItem('last_daily_tip_date', today);
          }, 1500);
          return () => clearTimeout(timer);
      }
  }, []);

  useEffect(() => {
      const disabledTabs = new Set<Tab>();
      if (!featureFlags.showFeed) disabledTabs.add('feed');
      if (!featureFlags.showActivities) disabledTabs.add('activities');
      if (!featureFlags.showAttendance) disabledTabs.add('attendance');
      if (!featureFlags.showProjects) disabledTabs.add('projects');
      if (!featureFlags.showResources) disabledTabs.add('resources');
      if (!featureFlags.showChat) disabledTabs.add('chat');
      if (!featureFlags.showShowcase) disabledTabs.add('showcase');
      if (!featureFlags.showSuggestions) disabledTabs.add('suggestions');
      if (!featureFlags.showChallenges) disabledTabs.add('challenges');
      if (!featureFlags.showRoadmap) disabledTabs.add('roadmap');
      if (!featureFlags.showCommunity) disabledTabs.add('community');
      if (!featureFlags.showPlayground) disabledTabs.add('playground');

      if (disabledTabs.has(activeTab)) {
          setActiveTab(featureFlags.showFeed ? 'feed' : 'profile');
      }
  }, [activeTab, featureFlags, setActiveTab]);

  return (
    <div className={(activeTab === 'chat' || activeTab === 'playground') ? 'h-full' : ''}>
      <Suspense fallback={<LoadingIndicator />}>
        <TabPanel active={activeTab === 'feed' && featureFlags.showFeed}>
            <Feed currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'activities' && featureFlags.showActivities}>
            <Activities currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'attendance' && featureFlags.showAttendance}>
            <Attendance currentUser={currentUser} isVisible={activeTab === 'attendance'} />
        </TabPanel>
        <TabPanel active={activeTab === 'projects' && featureFlags.showProjects}>
            <ProjectsBoard currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'playground' && featureFlags.showPlayground} className="h-full">
            <CodePlayground theme={theme} currentUser={currentUser} setActiveTab={setActiveTab} />
        </TabPanel>
        <TabPanel active={activeTab === 'showcase' && featureFlags.showShowcase}>
            <Showcase currentUser={currentUser} setActiveTab={setActiveTab} />
        </TabPanel>
        <TabPanel active={activeTab === 'profile'}>
            <Profile currentUser={currentUser} onUpdateUserProfile={onUpdateUserProfile} />
        </TabPanel>
        <TabPanel active={activeTab === 'resources' && featureFlags.showResources}>
            <Resources currentUser={currentUser} setActiveTab={setActiveTab} />
        </TabPanel>
        <TabPanel active={activeTab === 'chat' && featureFlags.showChat} className="h-full">
            <Chat currentUser={currentUser} setActiveTab={setActiveTab} theme={theme} />
        </TabPanel>
        <TabPanel active={activeTab === 'suggestions' && featureFlags.showSuggestions}>
            <Suggestions currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'challenges' && featureFlags.showChallenges}>
            <Challenges currentUser={currentUser} />
        </TabPanel>
        {/* FIX: Removed invalid 'bottom_roadmap' comparison as it is not a valid member of the Tab type union. */}
        <TabPanel active={activeTab === 'roadmap' && featureFlags.showRoadmap}>
            <RoadmapView currentUser={currentUser} />
        </TabPanel>
        <TabPanel active={activeTab === 'community' && featureFlags.showCommunity}>
            <Community currentUser={currentUser} />
        </TabPanel>
        {currentUser.role === 'PATRON' && (
            <TabPanel active={activeTab === 'members'}>
                <Members currentUser={currentUser} />
            </TabPanel>
        )}
        {currentUser.role === 'PATRON' && (
            <TabPanel active={activeTab === 'admin'}>
                <AdminTools currentUser={currentUser} />
            </TabPanel>
        )}
      </Suspense>
      
      {/* Floating AI Tutor Widget */}
      <AiTutor currentUser={currentUser} />

      {/* Daily Coding Tip Modal (Python on odd days, JS on even days) */}
      <DailyTipModal isOpen={showTipModal} onClose={() => setShowTipModal(false)} />
    </div>
  );
};

export default Dashboard;
