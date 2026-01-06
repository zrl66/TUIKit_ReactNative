/**
 * TUIKit Application
 * Main App Entry with Navigation
 */

import React, { useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { CustomToastContainer, i18n, I18nextProvider } from 'react-native-tuikit-atomic-x';

// Initialize i18n (side effect import)
console.log('[App] i18n initialized, current language:', i18n.language);

// App Pages
import { LoginPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { ProfilePage } from './pages/Profile';

// Live Module Pages (from react-native-tuikit-live)
import {
  LiveHomePage,
  LiveListPage,
  LiveAudiencePage,
  AnchorPage,
  LiveEndPage,
} from 'react-native-tuikit-live';

type PageName =
  | 'login'
  | 'home'
  | 'profile'
  | 'liveHome'
  | 'liveList'
  | 'liveAudience'
  | 'anchor'
  | 'liveEnd';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentPage, setCurrentPage] = useState<PageName>('login');
  const [liveAudienceLiveID, setLiveAudienceLiveID] = useState<string>('');
  const [liveEndLiveID, setLiveEndLiveID] = useState<string>('');

  // Navigation handlers
  const handleLoginSuccess = () => {
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setCurrentPage('login');
  };

  const handleNavigateToLive = () => {
    setCurrentPage('liveHome');
  };

  const handleNavigateToProfile = () => {
    setCurrentPage('profile');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  const handleJumpToList = () => {
    setCurrentPage('liveList');
  };

  const handleBackToLiveHome = () => {
    setCurrentPage('liveHome');
  };

  const handleJumpToLiveAudience = (liveID: string) => {
    setLiveAudienceLiveID(liveID);
    setCurrentPage('liveAudience');
  };

  const handleBackFromLiveAudience = () => {
    setCurrentPage('liveList');
  };

  const handleCreateLive = () => {
    setCurrentPage('anchor');
  };

  const handleBackFromAnchor = () => {
    setCurrentPage('liveList');
  };

  const handleEndLive = (liveID?: string) => {
    setLiveEndLiveID(liveID || '');
    setCurrentPage('liveEnd');
  };

  const handleBackFromLiveEnd = () => {
    setCurrentPage('liveList');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;

      case 'home':
        return (
          <HomePage
            onNavigateToLive={handleNavigateToLive}
            onNavigateToProfile={handleNavigateToProfile}
          />
        );

      case 'profile':
        return (
          <ProfilePage
            onBack={handleBackToHome}
            onLogout={handleLogout}
          />
        );

      case 'liveHome':
        return (
          <LiveHomePage
            onJumpToList={handleJumpToList}
            onBack={handleBackToHome}
          />
        );

      case 'liveList':
        return (
          <LiveListPage
            onBack={handleBackToLiveHome}
            onJoinSuccess={handleJumpToLiveAudience}
            onCreateLive={handleCreateLive}
          />
        );

      case 'liveAudience':
        return (
          <LiveAudiencePage
            liveID={liveAudienceLiveID}
            onBack={handleBackFromLiveAudience}
          />
        );

      case 'anchor':
        return (
          <AnchorPage
            onBack={handleBackFromAnchor}
            onEndLive={handleEndLive}
          />
        );

      case 'liveEnd':
        return (
          <LiveEndPage
            liveID={liveEndLiveID}
            onBack={handleBackFromLiveEnd}
          />
        );

      default:
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        {renderPage()}
        <Toast />
        <CustomToastContainer />
      </SafeAreaProvider>
    </I18nextProvider>
  );
}

export default App;
