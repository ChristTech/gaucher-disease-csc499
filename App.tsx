
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import StatCard from './components/StatCard';
import RecentPredictionsTable from './components/RecentPredictionsTable';
import PredictionsChart from './components/PredictionsChart';
import NewPredictionModal from './components/NewPredictionModal';
import NewPredictionForm from './components/NewPredictionForm';
import PatientRecords from './components/PatientRecords';
import Settings from './components/Settings';
import AuthPortal from './components/AuthPortal';
import { Plus, Bell, Activity, LogOut, Search, User as UserIcon } from 'lucide-react';
import { User, Prediction, RiskLevel } from './types';
import { getStoredData, setStoredData, INITIAL_DOCTORS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredData('gp_current_user', null));
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => getStoredData('gp_users', INITIAL_DOCTORS));
  const [predictions, setPredictions] = useState<Prediction[]>(() => getStoredData('gp_predictions', []));

  useEffect(() => {
    setStoredData('gp_current_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    setStoredData('gp_users', registeredUsers);
  }, [registeredUsers]);

  useEffect(() => {
    setStoredData('gp_predictions', predictions);
  }, [predictions]);

  const handleRegister = (user: User) => {
    // Check if a user with this email already exists (login by email)
    const existingUser = registeredUsers.find(
      u => u.email.toLowerCase() === user.email.toLowerCase()
    );
    if (existingUser) {
      // Log in as the existing user to preserve their prediction history
      setCurrentUser(existingUser);
    } else {
      // New user — register and log in
      setRegisteredUsers(prev => [...prev, user]);
      setCurrentUser(user);
    }
    setActiveTab('Dashboard');
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('Dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const savePrediction = (prediction: Prediction) => {
    setPredictions(prev => [prediction, ...prev]);
  };

  const updatePrediction = (updated: Prediction) => {
    setPredictions(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // Notification logic for doctors: Only relevant to their assigned cases
  const pendingReviews = predictions.filter(p => p.reviewingDoctorId === currentUser?.id && p.status === 'Pending Review');
  const userNotifications = currentUser?.role === 'Doctor' ? pendingReviews.length : 0;

  // Filter data strictly by role
  const visiblePredictions = predictions.filter(p => {
    if (currentUser?.role === 'User') return p.userId === currentUser.id;
    if (currentUser?.role === 'Doctor') return p.reviewingDoctorId === currentUser.id;
    return false;
  });

  const stats = {
    total: visiblePredictions.length,
    highRisk: visiblePredictions.filter(p => p.riskLevel === RiskLevel.HIGH).length,
    avgConfidence: visiblePredictions.length > 0 
      ? Math.round(visiblePredictions.reduce((acc, p) => acc + p.riskScore, 0) / visiblePredictions.length) 
      : 0
  };

  if (!currentUser) {
    return <AuthPortal onRegister={handleRegister} onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'New Prediction':
        return (
          <div className="pb-24 lg:pb-0 animate-in fade-in duration-500">
            <NewPredictionForm 
              currentUser={currentUser} 
              onSavePrediction={savePrediction} 
            />
          </div>
        );
      case 'Settings':
        return (
          <div className="pb-24 lg:pb-0 animate-in fade-in duration-500">
            <Settings currentUser={currentUser} onLogout={handleLogout} />
          </div>
        );
      case 'Patient Records':
        return (
          <div className="pb-24 lg:pb-0 animate-in fade-in duration-500">
            <PatientRecords 
              predictions={predictions} 
              currentUser={currentUser} 
              onUpdatePrediction={updatePrediction}
            />
          </div>
        );
      case 'Analytics':
        // Guard: patients cannot access analytics directly (e.g. via URL manipulation)
        if (currentUser.role !== 'Doctor') {
          setActiveTab('Dashboard');
          return null;
        }
        return (
          <div className="space-y-6 pb-24 lg:pb-0 animate-in fade-in duration-500">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Diagnostic Trends</h2>
              <p className="text-slate-500 mb-6 text-sm">Cases assigned to you over time.</p>
              <div className="h-[300px] md:h-[400px]">
                <PredictionsChart predictions={visiblePredictions} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center py-10">
                <h3 className="font-bold text-slate-900 mb-2 text-sm uppercase tracking-widest text-slate-400">Mean Precision</h3>
                <div className="text-6xl font-black text-cyan-600 mb-1">{stats.avgConfidence}%</div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Model Confidence Index</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-3xl text-white flex flex-col justify-center">
                 <h3 className="font-bold mb-4 flex items-center gap-2">
                   <Activity className="w-4 h-4 text-cyan-400" /> System Status
                 </h3>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">ML Engine</span>
                     <span className="text-emerald-400 font-bold">Operational</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">Total Cases Assigned</span>
                     <span className="text-emerald-400 font-bold">{stats.total}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">Pending Reviews</span>
                     <span className={`font-bold ${stats.total - visiblePredictions.filter(p => p.status === 'Reviewed').length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                       {stats.total - visiblePredictions.filter(p => p.status === 'Reviewed').length}
                     </span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">High Risk Cases</span>
                     <span className={`font-bold ${stats.highRisk > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{stats.highRisk}</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        );
      case 'Dashboard':
      default:
        return (
          <div className="pb-24 lg:pb-0 animate-in fade-in duration-500">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard label={currentUser.role === 'Doctor' ? "Assigned Cases" : "My Assessments"} value={stats.total.toLocaleString()} trend={visiblePredictions.length > 2} />
              <StatCard label="Critical Alerts" value={stats.highRisk} highlight={stats.highRisk > 0} />
              <div className="hidden sm:block">
                <StatCard label="AI Reliability" value={`${stats.avgConfidence}%`} />
              </div>
            </section>

            {currentUser.role === 'Doctor' && pendingReviews.length > 0 && (
              <div className="mb-8 p-5 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-inner">
                    <Activity className="w-6 h-6 text-indigo-100 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase tracking-wider">Action Required</p>
                    <p className="text-xs text-indigo-100 opacity-90">{pendingReviews.length} diagnostic cases awaiting professional clinical review.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('Patient Records')} 
                  className="w-full md:w-auto bg-white text-indigo-600 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform active:scale-95"
                >
                  Start Review
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentPredictionsTable currentUser={currentUser} predictions={predictions} />
              </div>
              <div className="lg:col-span-1">
                <PredictionsChart predictions={visiblePredictions} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row overflow-x-hidden">
      <div className="hidden lg:block">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>

      <main className="flex-1 p-4 md:p-8 transition-all duration-300 lg:ml-64 relative">
        <header className="flex justify-between items-center mb-6 md:mb-10">
          <div className="flex items-center gap-3">
             <div className="lg:hidden w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-cyan-400" />
             </div>
             <div>
               <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">
                 {activeTab}
               </h1>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${currentUser.role === 'Doctor' ? 'bg-indigo-400' : 'bg-cyan-400'}`} />
                  <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">
                    {currentUser.role === 'Doctor' ? `Dr. ${currentUser.name}` : `${currentUser.name}`} • 2026 Portal
                  </p>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <button className="p-3 bg-white text-slate-400 hover:text-slate-600 rounded-2xl border border-slate-100 shadow-sm relative transition-transform active:scale-90">
               <Bell className="w-5 h-5 md:w-6 md:h-6" />
               {userNotifications > 0 && (
                 <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-4 border-slate-50 text-[9px] text-white flex items-center justify-center font-black">
                   {userNotifications}
                 </span>
               )}
             </button>
             
             {currentUser.role === 'User' && activeTab !== 'New Prediction' && (
              <button 
                onClick={() => setActiveTab('New Prediction')}
                className="hidden sm:flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all text-[10px]"
              >
                <Plus className="w-4 h-4" />
                <span>New Assessment</span>
              </button>
            )}

            <button 
              onClick={handleLogout} 
              className="p-3 bg-white text-rose-500 hover:bg-rose-50 rounded-2xl border border-slate-100 shadow-sm transition-transform active:scale-90"
              title="Logout"
            >
               <LogOut className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>

        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} />
      </main>
    </div>
  );
};

export default App;
