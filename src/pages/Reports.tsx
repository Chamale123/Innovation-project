import React, { useState, useEffect } from 'react';
import { Download, FileText, Filter, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Reports() {
  const [stats, setStats] = useState<any>(null);
  const [filterDept, setFilterDept] = useState('All');
  const [activeTab, setActiveTab] = useState<'Students' | 'Lecturers'>('Students');

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setStats(d));
  }, []);

  if (!stats) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const filteredData = stats.studentStats.filter((s: any) => {
    if (filterDept !== 'All' && s.department !== filterDept) return false;
    if (activeTab === 'Students' && s.role !== 'Student') return false;
    if (activeTab === 'Lecturers' && s.role !== 'Lecturer') return false;
    return true;
  });

  const exportCSV = () => {
    const headers = activeTab === 'Students' 
      ? ['Name', 'Matriculation', 'Department', 'Attendance %', 'Eligible', 'Risk Level']
      : ['Name', 'Staff ID', 'Department', 'Attendance %'];
      
    const rows = filteredData.map((s: any) => activeTab === 'Students' ? [
      s.name,
      s.matriculationNumber,
      s.department,
      `${s.percentage}%`,
      s.eligible ? 'Yes' : 'No',
      s.riskLevel
    ] : [
      s.name,
      s.matriculationNumber,
      s.department,
      `${s.percentage}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `USET_Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('USET Smart Campus Attendance Report', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Report Type: ${activeTab}`, 14, 30);
    doc.text(`Department Filter: ${filterDept}`, 14, 36);

    const tableData = filteredData.map((s: any) => activeTab === 'Students' ? [
      s.name,
      s.matriculationNumber,
      s.department,
      `${s.percentage}%`,
      s.eligible ? 'Yes' : 'No',
      s.riskLevel
    ] : [
      s.name,
      s.matriculationNumber,
      s.department,
      `${s.percentage}%`
    ]);

    (doc as any).autoTable({
      startY: 45,
      head: [activeTab === 'Students' 
        ? ['Name', 'ID', 'Dept', 'Attendance', 'Eligible', 'Risk Level']
        : ['Name', 'Staff ID', 'Dept', 'Attendance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`USET_Attendance_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportEligiblePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Exam Eligibility List', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 30);
    doc.text(`Department Filter: ${filterDept}`, 14, 36);

    const eligibleStudents = filteredData.filter((s: any) => s.eligible && s.role === 'Student');
    
    const tableData = eligibleStudents.map((s: any) => [
      s.name,
      s.matriculationNumber,
      s.department,
      `${s.percentage}%`
    ]);

    (doc as any).autoTable({
      startY: 45,
      head: [['Name', 'Matriculation', 'Dept', 'Attendance']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    doc.save(`Eligible_Students_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Generate and export academic attendance records</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'Students' && (
            <button onClick={exportEligiblePDF} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors shadow-sm">
              <CheckCircle className="w-4 h-4" />
              Eligible List (PDF)
            </button>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <FileText className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 relative">
          <button
            onClick={() => setActiveTab('Students')}
            className={`whitespace-nowrap pb-4 px-1 font-medium text-sm transition-colors relative ${
              activeTab === 'Students'
                ? 'text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Student Reports
            {activeTab === 'Students' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('Lecturers')}
            className={`whitespace-nowrap pb-4 px-1 font-medium text-sm transition-colors relative ${
              activeTab === 'Lecturers'
                ? 'text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Lecturer Reports
            {activeTab === 'Lecturers' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        </nav>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
            <Filter className="w-4 h-4" />
            Filters:
          </div>
          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all shadow-sm"
          >
            <option value="All">All Departments</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Civil">Civil</option>
            <option value="Electrical">Electrical</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">{activeTab === 'Students' ? 'ID / Matriculation' : 'Staff ID'}</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Attendance %</th>
                {activeTab === 'Students' && (
                  <>
                    <th className="px-5 py-3">Exam Eligibility</th>
                    <th className="px-5 py-3">Risk Level</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((student: any) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{student.name}</td>
                  <td className="px-5 py-3 font-mono text-gray-600">{student.matriculationNumber}</td>
                  <td className="px-5 py-3 text-gray-600">{student.department}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${student.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${student.percentage}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-900">{student.percentage}%</span>
                      <span className="text-gray-500 text-xs">({student.attended}/{student.total})</span>
                    </div>
                  </td>
                  {activeTab === 'Students' && (
                    <>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {student.eligible ? 'Eligible' : 'Not Eligible'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-800' : 
                          student.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-800' : 
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {student.riskLevel}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'Students' ? 6 : 4} className="px-5 py-8 text-center text-gray-500">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
