import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, CheckCircle2, AlertCircle, Clock, WifiOff, RefreshCw } from 'lucide-react';

const socket = io();

export default function LiveFeed() {
  const [feed, setFeed] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setFeed(d.recentActivity));
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d));

    socket.on('attendance:new', (record) => {
      setFeed(prev => [record, ...prev].slice(0, 50));
    });

    return () => {
      socket.off('attendance:new');
    };
  }, []);

  const simulateScan = async () => {
    if (users.length === 0) return toast.error('No users available to scan');
    
    const user = users[Math.floor(Math.random() * users.length)];
    const payload = {
      user_id: user.matriculationNumber,
      device_id: `USET-LAB-${Math.floor(Math.random() * 3) + 1}`,
      timestamp: new Date().toISOString()
    };

    if (isOffline) {
      setOfflineQueue(prev => [...prev, payload]);
      toast.success(`Offline scan saved`);
      return;
    }

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Scan failed');
      toast.success(`Fingerprint scan successful`);
    } catch (e) {
      toast.error('Failed to process scan');
    }
  };

  const syncOfflineData = async () => {
    if (offlineQueue.length === 0) return toast.info('No offline data to sync');
    
    try {
      const res = await fetch('/api/sync-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: offlineQueue })
      });
      if (res.ok) {
        toast.success(`Successfully synced ${offlineQueue.length} offline records`);
        setOfflineQueue([]);
        fetch('/api/stats').then(r => r.json()).then(d => setFeed(d.recentActivity));
      }
    } catch (e) {
      toast.error('Sync failed');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Live Feed</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time attendance monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm transition-colors hover:bg-gray-50">
            <input 
              type="checkbox" 
              checked={isOffline} 
              onChange={(e) => setIsOffline(e.target.checked)} 
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            {isOffline ? <WifiOff className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            Simulate Offline Mode
          </label>
          
          {offlineQueue.length > 0 && !isOffline && (
            <button
              onClick={syncOfflineData}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Sync {offlineQueue.length} Records
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          {feed.length > 0 && (
            <motion.div 
              key={feed[0].id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-2 ${feed[0].status === 'present' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Latest Scan</h2>
              
              <div className="relative w-32 h-32 mx-auto mb-4">
                <img 
                  src={feed[0].user?.profilePic || `https://i.pravatar.cc/150?u=${feed[0].user_id}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover rounded-full border-4 border-white shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <div className={`absolute bottom-0 right-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center ${feed[0].status === 'present' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                  {feed[0].status === 'present' ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-white" />}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900">{feed[0].user?.name || 'Unknown User'}</h3>
              <p className="text-gray-500 font-mono text-sm mt-1">{feed[0].user_id}</p>
              
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4 text-gray-400" />
                {new Date(feed[0].timestamp).toLocaleTimeString()}
              </div>
            </motion.div>
          )}

          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Hardware Simulators</h2>
            <p className="text-sm text-gray-500 mb-6">Test the system without physical devices</p>
            <div className="space-y-4">
              <button 
                onClick={() => simulateScan()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Fingerprint className="w-5 h-5" />
                Trigger Fingerprint Scan
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent Scans</h2>
            <span className="text-xs font-medium text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200">
              {feed.length} records today
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">Time</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">User</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Device</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {feed.map((record) => (
                    <motion.tr 
                      key={record.id}
                      initial={{ opacity: 0, backgroundColor: '#eef2ff' }}
                      animate={{ opacity: 1, backgroundColor: '#ffffff' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <img 
                            src={record.user?.profilePic || `https://i.pravatar.cc/150?u=${record.user_id}`} 
                            alt="" 
                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{record.user?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500 font-mono">{record.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 font-mono text-xs">{record.device_id}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          record.status === 'present' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {record.status === 'present' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {record.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {feed.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-gray-500">
                      <Fingerprint className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>Waiting for fingerprint scans...</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
