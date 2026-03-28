import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Bell, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const socket = io();

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => {
    fetchStats();
    socket.on('attendance:new', fetchStats);
    socket.on('users:updated', fetchStats);
    return () => {
      socket.off('attendance:new');
      socket.off('users:updated');
    };
  }, []);

  if (!stats) return <div className="p-6">Loading...</div>;

  const atRiskStudents = stats.studentStats.filter((s: any) => s.riskLevel === 'High' || s.riskLevel === 'Medium');

  // Compute chart data
  const deptData = stats.studentStats.reduce((acc: any, student: any) => {
    const dept = student.department || 'Unknown';
    if (!acc[dept]) acc[dept] = { name: dept, total: 0, count: 0 };
    acc[dept].total += student.percentage;
    acc[dept].count += 1;
    return acc;
  }, {});
  
  const deptChartData = Object.values(deptData).map((d: any) => ({
    name: d.name,
    attendance: Math.round(d.total / d.count)
  }));

  const levelData = stats.studentStats.reduce((acc: any, student: any) => {
    const level = student.level ? `Level ${student.level}` : 'Unknown';
    if (!acc[level]) acc[level] = { name: level, total: 0, count: 0 };
    acc[level].total += student.percentage;
    acc[level].count += 1;
    return acc;
  }, {});

  const levelChartData = Object.values(levelData).map((d: any) => ({
    name: d.name,
    attendance: Math.round(d.total / d.count)
  })).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const handleNotifyStudents = async () => {
    try {
      const res = await fetch('/api/notify/low-attendance', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sent warnings to ${data.notified} at-risk students.`);
      }
    } catch (e) {
      toast.error('Failed to send notifications');
    }
  };

  const handleNotifyParents = async () => {
    try {
      const res = await fetch('/api/notify/parents', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sent daily updates to ${data.notified} parents.`);
      }
    } catch (e) {
      toast.error('Failed to send notifications');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Academic Year 2026/2027</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -2 }} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Students</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalStudents}</div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Eligible for Exams</div>
          <div className="text-3xl font-bold text-emerald-600">{stats.studentStats.filter((s: any) => s.eligible).length}</div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">At-Risk Students</div>
          <div className="text-3xl font-bold text-rose-600">{atRiskStudents.length}</div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Lecturers</div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalLecturers}</div>
        </motion.div>
      </div>

      {/* Communications Panel */}
      <div className="bg-gradient-to-r from-indigo-900 to-violet-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-6 h-6 text-indigo-300" />
          <h2 className="text-xl font-semibold">Communications & Alerts</h2>
        </div>
        <p className="text-indigo-200 text-sm mb-6 max-w-2xl">
          Send automated SMS and email alerts to students and parents regarding attendance status and exam eligibility.
        </p>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleNotifyStudents}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <AlertTriangle className="w-4 h-4" />
            Warn At-Risk Students
          </button>
          <button 
            onClick={handleNotifyParents}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm border border-white/10"
          >
            <MessageSquare className="w-4 h-4" />
            Send Daily Parent Updates
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">Average Attendance by Department</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Attendance']}
                />
                <Bar dataKey="attendance" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {deptChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.attendance >= 75 ? '#10B981' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 tracking-tight">Average Attendance by Level</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Attendance']}
                />
                <Bar dataKey="attendance" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {levelChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.attendance >= 75 ? '#6366F1' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Risk Predictions</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">Student</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">ID</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Attendance</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {atRiskStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      No students currently at risk.
                    </td>
                  </tr>
                ) : (
                  atRiskStudents.map((student: any) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{student.name}</td>
                      <td className="px-5 py-3 font-mono text-gray-600">{student.matriculationNumber}</td>
                      <td className="px-5 py-3 font-medium text-rose-600">{student.percentage}%</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                          {student.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Recent Activity</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-700">Time</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">User</th>
                  <th className="px-5 py-3 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-gray-500">
                      No recent scans yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentActivity.slice(0, 10).map((record: any) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{record.user?.name || 'Unknown'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
