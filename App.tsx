import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { User, Tab } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import SignUp from './components/SignUp';
import Welcome from './components/Welcome';
import PatronLogin from './components/PatronLogin';
import PatronSignUp from './components/PatronSignUp';
import PendingApprovalModal from './components/PendingApprovalModal';
import * as api from './services/apiService';
import { supabase } from './services/supabaseClient';
import { MenuIcon } from './components/icons/MenuIcon';
import { DataProvider } from './DataContext';

type View = 'welcome' | 'login' | 'signup' | 'dashboard' | 'patronLogin' | 'patronSignUp';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  // Initialize theme from localStorage or default to 'dark'
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
        return (localStorage.getItem('app_theme') as Theme) || 'dark';
    }
    return 'dark';
  });

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('welcome');
  const [isLoading, setIsLoading] = useState(true);
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  // Initialize activeTab from localStorage or default to 'feed'
  const [activeTab, setActiveTab] = useState<Tab>(() => {
      if (typeof window !== 'undefined') {
          const savedTab = localStorage.getItem('active_tab') as Tab;
          const validTabs: Tab[] = ['feed', 'activities', 'attendance', 'projects', 'profile', 'members', 'playground', 'resources'];
          return validTabs.includes(savedTab) ? savedTab : 'feed';
      }
      return 'feed';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const currentUser = session?.user;
          if (currentUser) {
              const userProfile = await api.getUserProfile(currentUser.id);
              
              if (userProfile && userProfile.status === 'APPROVED') {
                  setUser(userProfile);
                  setView('dashboard');
                  
                  // Run attendance marking in background to prevent blocking the UI load
                  api.markAttendanceOnLogin(userProfile.uid)
                    .catch(err => console.warn("Background attendance check failed:", err));

              } else {
                  // If user has a session but no approved profile, log them out.
                  // This handles pending users or users whose profiles were removed.
                  if (session) {
                    if (userProfile && userProfile.status === 'PENDING') {
                        setShowPendingModal(true);
                    }
                    // Ensure we clean up the session so they don't get stuck
                    await api.logout();
                  }
                  setUser(null);
                  setView('welcome');
              }
          } else {
              setUser(null);
              setView('welcome');
          }
        } catch (error) {
            console.error("An error occurred during authentication state change:", error);
            // In case of any error, reset to a safe, logged-out state.
            setUser(null);
            setView('welcome');
        } finally {
            setIsLoading(false);
        }
      }
    );

    // Cleanup the listener on component unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async (email: string, password?: string) => {
    try {
        // The onAuthStateChange listener will handle setting the user and view on success.
        const loggedInUser = await api.login(email, password);
        if (loggedInUser.status !== 'APPROVED') {
            await api.logout(); // Ensure session is cleared if pending approval
            throw new Error('Your account is pending approval.');
        }
    } catch (error: any) {
        console.error("Login failed:", error);
        throw error;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
        await api.logout();
        localStorage.removeItem('active_tab'); // Clear tab preference on logout
    } catch (error) {
        console.error("Logout failed:", error);
    } finally {
        // Force clear state to ensure UI updates even if API fails
        setUser(null);
        setView('welcome');
        setActiveTab('feed');
    }
  }, []);

  const handleSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & {password: string}) => {
    await api.signUp(newUser);
  }, []);

  const handlePatronSignUp = useCallback(async (newUser: Omit<User, 'uid' | 'role' | 'status' | 'avatarUrl'> & {password: string}) => {
    await api.signUpAsPatron(newUser);
  }, []);
  
  const handleUpdateUserProfile = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);


  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
        const newTheme = prevTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('app_theme', newTheme);
        return newTheme;
    });
  }, []);
  
  const handleTabChange = useCallback((tab: Tab) => {
      setActiveTab(tab);
      localStorage.setItem('active_tab', tab);
  }, []);
  
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prevState => !prevState);
  }, []);

  const handleSidebarCollapseToggle = useCallback(() => {
    setIsSidebarCollapsed(prevState => !prevState);
  }, []);

  const appClasses = useMemo(() => {
    const classList = ['min-h-screen', 'font-sans', 'transition-colors', 'duration-300'];
    if (theme === 'light') {
      classList.push('bg-gray-100', 'text-gray-800');
    } else {
      classList.push('bg-gray-900', 'text-gray-200', 'dark');
    }
    return classList.join(' ');
  }, [theme]);

  // Render a visible loading state instead of null to avoid "blank white screen" issues
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500"></div>
      </div>
    );
  }

  const renderContent = () => {
    if (view === 'dashboard' && user) {
      return (
        <DataProvider currentUser={user}>
          <div className="flex min-h-screen">
            <Sidebar
              user={user}
              onLogout={handleLogout}
              theme={theme}
              onToggleTheme={toggleTheme}
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              isOpen={isSidebarOpen}
              onClose={handleSidebarToggle}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleSidebarCollapseToggle}
            />
            <div className="flex-1 flex flex-col w-full">
               {/* Mobile Header */}
              <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between p-4 sticky top-0 z-10">
                <button onClick={handleSidebarToggle} className="text-gray-600 dark:text-gray-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Open menu">
                  <MenuIcon />
                </button>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                  ICT Club Hub
                </h1>
                <div className="w-6 h-6"></div> 
              </header>
              <main className="flex-1 p-4 sm:p-6 lg:p-8 h-screen overflow-y-auto">
                <Dashboard
                  activeTab={activeTab}
                  currentUser={user}
                  onUpdateUserProfile={handleUpdateUserProfile}
                  theme={theme}
                />
              </main>
            </div>
          </div>
        </DataProvider>
      );
    }
    if (view === 'signup') {
      return <SignUp onSignUp={handleSignUp} onNavigateToLogin={() => setView('login')} />;
    }
    if (view === 'login') {
      return <Login onLogin={handleLogin} onNavigateToSignUp={() => setView('signup')} onNavigateToPatronLogin={() => setView('patronLogin')} />;
    }
    if (view === 'patronLogin') {
      return <PatronLogin onLogin={handleLogin} onNavigateToLogin={() => setView('login')} onNavigateToSignUp={() => setView('patronSignUp')} />;
    }
    if (view === 'patronSignUp') {
        return <PatronSignUp onSignUp={handlePatronSignUp} onNavigateToLogin={() => setView('patronLogin')} />;
    }
    return <Welcome onNavigateToLogin={() => setView('login')} onNavigateToPatronLogin={() => setView('patronLogin')} />;
  };

  return (
    <div className={appClasses}>
      {renderContent()}
      <PendingApprovalModal 
        isOpen={showPendingModal} 
        onClose={() => setShowPendingModal(false)} 
      />
    </div>
  );
};

export default App;