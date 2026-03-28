import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, LogOut, Menu, X } from 'lucide-react';

const socket = io();

export default function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    socket.on('sms:sent', (data) => {
      toast.info(`SMS Alert Sent to ${data.to}: ${data.message}`);
    });

    return () => {
      socket.off('sms:sent');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <Toaster position="top-right" />
      
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-gray-900">USET Campus</h1>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {[
              { to: '/', label: 'Dashboard' },
              { to: '/students', label: 'Students' },
              { to: '/lecturers', label: 'Lecturers' },
              { to: '/live', label: 'Live Feed' },
              { to: '/reports', label: 'Reports' },
            ].map((link) => (
              <NavLink 
                key={link.to}
                to={link.to} 
                className={({ isActive }) => `relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "text-indigo-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.div 
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-indigo-50 rounded-lg -z-10 border border-indigo-100"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
              AD
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">Admin</span>
          </div>
          <button 
            onClick={onLogout} 
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Sign Out</span>
          </button>
          <button 
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-200 overflow-hidden"
          >
            <nav className="flex flex-col p-4 space-y-2">
              {[
                { to: '/', label: 'Dashboard' },
                { to: '/students', label: 'Students' },
                { to: '/lecturers', label: 'Lecturers' },
                { to: '/live', label: 'Live Feed' },
                { to: '/reports', label: 'Reports' },
              ].map((link) => (
                <NavLink 
                  key={link.to}
                  to={link.to} 
                  className={({ isActive }) => `px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
