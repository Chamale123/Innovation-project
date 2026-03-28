import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface User {
  id: string;
  matriculationNumber: string;
  name: string;
  role: 'Student' | 'Lecturer';
  department: 'Mechanical' | 'Civil' | 'Electrical';
  contact: string;
  email: string;
  profilePic?: string;
}

export default function Lecturers() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    role: 'Lecturer',
    department: 'Mechanical',
  });

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data.filter((u: User) => u.role === 'Lecturer'));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePic: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, role: 'Lecturer' };
      if (!payload.profilePic && payload.matriculationNumber) {
        payload.profilePic = `https://i.pravatar.cc/150?u=${payload.matriculationNumber}`;
      }
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Lecturer registered successfully');
        setIsModalOpen(false);
        setFormData({ role: 'Lecturer', department: 'Mechanical' });
        fetchUsers();
      } else {
        toast.error(data.error || 'Failed to register lecturer');
      }
    } catch (error) {
      toast.error('Failed to register lecturer');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      toast.success('Lecturer deleted');
      fetchUsers();
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Failed to delete lecturer');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.matriculationNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Lecturers</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-sm font-medium"
        >
          Register Lecturer
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or Staff ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="border border-gray-300 rounded-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 font-medium text-gray-700">Staff ID</th>
              <th className="px-4 py-2 font-medium text-gray-700">Department</th>
              <th className="px-4 py-2 font-medium text-gray-700">Email</th>
              <th className="px-4 py-2 font-medium text-gray-700">Contact</th>
              <th className="px-4 py-2 font-medium text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2 font-mono text-gray-600">{user.matriculationNumber}</td>
                <td className="px-4 py-2 text-gray-600">{user.department}</td>
                <td className="px-4 py-2 text-gray-600">{user.email}</td>
                <td className="px-4 py-2 text-gray-600">{user.contact}</td>
                <td className="px-4 py-2 text-right">
                  <button 
                    onClick={() => setDeleteConfirmId(user.id)} 
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-center text-gray-500">No lecturers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-semibold">Register New Lecturer</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500" onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID Number</label>
                  <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500" onChange={e => setFormData({...formData, matriculationNumber: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo (Optional)</label>
                  <input type="file" accept="image/*" className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500 bg-white file:mr-4 file:py-1.5 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={handlePhotoUpload} />
                  <p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate from Staff ID. Max size: 5MB.</p>
                  {formData.profilePic && formData.profilePic.startsWith('data:image') && (
                    <img src={formData.profilePic} alt="Preview" className="mt-3 w-16 h-16 object-cover rounded-full border border-gray-200 shadow-sm" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500" onChange={e => setFormData({...formData, department: e.target.value as any})}>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="Electrical">Electrical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input required type="email" className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500" onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input required type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:border-blue-500" onChange={e => setFormData({...formData, contact: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 text-sm hover:underline">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-sm hover:bg-blue-700">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-gray-500 text-sm mb-6">Are you sure you want to delete this lecturer? This action cannot be undone.</p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)} 
                  className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(deleteConfirmId)} 
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-rose-200"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
