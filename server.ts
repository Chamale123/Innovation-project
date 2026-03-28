import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- DATA MODELS ---
interface User {
  id: string;
  matriculationNumber: string; // e.g., 26EME153
  name: string;
  role: 'Student' | 'Lecturer';
  department: 'Mechanical' | 'Civil' | 'Electrical';
  contact: string;
  email: string;
  profilePic: string;
  parentContact?: string;
  parentEmail?: string;
  level?: '100' | '200' | '300' | '400';
  courseTitle?: string;
  courseCode?: string;
}

interface AttendanceRecord {
  id: string;
  user_id: string; // Maps to matriculationNumber
  method: 'fingerprint';
  device_id: string;
  timestamp: string;
  status: 'present' | 'late';
}

const TOTAL_CLASSES = 40; // Semester total for 75% rule

const db = {
  users: [] as User[],
  attendance: [] as AttendanceRecord[],
};

// --- SEED DATA ---
db.users.push(
  { id: '1', matriculationNumber: '26EME153', name: 'Fatou Jallow', role: 'Student', department: 'Mechanical', contact: '+220 123 4567', email: 'fatou@uset.edu.gm', profilePic: 'https://i.pravatar.cc/150?u=fatou', parentContact: '+220 999 0001', parentEmail: 'parent.fatou@gmail.com', level: '100' },
  { id: '2', matriculationNumber: '26ECE101', name: 'Omar Touray', role: 'Student', department: 'Civil', contact: '+220 765 4321', email: 'omar@uset.edu.gm', profilePic: 'https://i.pravatar.cc/150?u=omar', parentContact: '+220 999 0002', parentEmail: 'parent.omar@gmail.com', level: '200' },
  { id: '3', matriculationNumber: '26EEE099', name: 'Aisha Ceesay', role: 'Student', department: 'Electrical', contact: '+220 999 8888', email: 'aisha@uset.edu.gm', profilePic: 'https://i.pravatar.cc/150?u=aisha', parentContact: '+220 999 0003', parentEmail: 'parent.aisha@gmail.com', level: '300' },
  { id: '4', matriculationNumber: 'LEC-M01', name: 'Dr. Lamin', role: 'Lecturer', department: 'Mechanical', contact: '+220 111 2222', email: 'lamin@uset.edu.gm', profilePic: 'https://i.pravatar.cc/150?u=lamin', courseTitle: 'Calculus I', courseCode: 'MATH 101' }
);

// Seed historical attendance removed to start with empty recent activity

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // --- HELPER FUNCTIONS ---
  const processAttendance = (data: any) => {
    const { user_id, device_id, timestamp } = data;
    const user = db.users.find(u => u.matriculationNumber === user_id);
    
    if (!user) throw new Error('User not found');

    const recordTime = new Date(timestamp || Date.now());
    const hour = recordTime.getHours();
    const minutes = recordTime.getMinutes();
    
    // Logic: Before 8:15 is present, after is late
    const status = (hour > 8 || (hour === 8 && minutes > 15)) ? 'late' : 'present';

    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substring(7),
      user_id,
      method: 'fingerprint',
      device_id: device_id || 'UNKNOWN-DEVICE',
      timestamp: recordTime.toISOString(),
      status,
    };

    db.attendance.push(newRecord);
    
    // Emit real-time update
    io.emit('attendance:new', { ...newRecord, user });

    // Simulate SMS Notification
    if (status === 'late') {
      io.emit('sms:sent', { to: user.contact, message: `USET Alert: ${user.name} arrived late at ${recordTime.toLocaleTimeString()}.` });
    }

    if (user.role === 'Student' && user.parentContact) {
      io.emit('sms:sent', { 
        to: user.parentContact, 
        message: `USET Alert: Your child ${user.name} has arrived at school at ${recordTime.toLocaleTimeString()}. Status: ${status}.` 
      });
    }

    return newRecord;
  };

  // --- API ENDPOINTS ---
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Users CRUD
  app.get('/api/users', (req, res) => res.json(db.users));
  app.post('/api/users', (req, res) => {
    const { matriculationNumber } = req.body;
    if (db.users.some(u => u.matriculationNumber === matriculationNumber)) {
      return res.status(400).json({ error: 'Matriculation Number / Staff ID already exists' });
    }
    const newUser: User = { id: Math.random().toString(36).substring(7), ...req.body };
    db.users.push(newUser);
    io.emit('users:updated', db.users);
    res.status(201).json(newUser);
  });
  app.delete('/api/users/:id', (req, res) => {
    db.users = db.users.filter(u => u.id !== req.params.id);
    io.emit('users:updated', db.users);
    res.status(204).send();
  });

  // IoT Attendance Endpoints
  app.post('/api/attendance', (req, res) => {
    try {
      const record = processAttendance(req.body);
      res.status(201).json({ success: true, record });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  const getStats = () => {
    const students = db.users.filter(u => u.role === 'Student');
    const lecturers = db.users.filter(u => u.role === 'Lecturer');
    
    const studentStats = students.map(student => {
      const attended = db.attendance.filter(a => a.user_id === student.matriculationNumber).length;
      const percentage = Math.round((attended / TOTAL_CLASSES) * 100);
      
      let riskLevel = 'Low';
      if (percentage < 60) riskLevel = 'High';
      else if (percentage < 75) riskLevel = 'Medium';

      return {
        ...student,
        attended,
        total: TOTAL_CLASSES,
        percentage,
        eligible: percentage >= 75,
        riskLevel
      };
    });

    const recentActivity = db.attendance
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50)
      .map(record => ({
        ...record,
        user: db.users.find(u => u.matriculationNumber === record.user_id)
      }));

    return {
      totalStudents: students.length,
      totalLecturers: lecturers.length,
      studentStats,
      recentActivity
    };
  };

  // Notification Endpoints
  app.post('/api/notify/low-attendance', (req, res) => {
    const stats = getStats();
    const atRisk = stats.studentStats.filter(s => s.percentage < 75);
    
    atRisk.forEach(s => {
      io.emit('sms:sent', { 
        to: s.contact, 
        message: `URGENT: ${s.name}, your attendance is ${s.percentage}%. You must attend classes to be eligible for exams.` 
      });
    });
    
    res.json({ success: true, notified: atRisk.length });
  });

  app.post('/api/notify/parents', (req, res) => {
    const stats = getStats();
    let notified = 0;
    
    stats.studentStats.forEach(s => {
      const user = db.users.find(u => u.matriculationNumber === s.matriculationNumber);
      if (user && user.parentContact) {
        const status = s.percentage >= 75 ? 'Good' : 'At Risk';
        io.emit('sms:sent', { 
          to: user.parentContact, 
          message: `Parent Update: ${s.name}'s current attendance is ${s.percentage}%. Status: ${status}.` 
        });
        notified++;
      }
    });
    
    res.json({ success: true, notified });
  });

  // Offline Sync Endpoint (Bulk)
  app.post('/api/sync-offline', (req, res) => {
    const records: any[] = req.body.records;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Expected array of records' });
    
    const processed = [];
    for (const rec of records) {
      try {
        processed.push(processAttendance(rec));
      } catch (e) {
        console.error('Sync error for record:', rec, e);
      }
    }
    res.json({ success: true, synced: processed.length });
  });

  // Analytics & AI Predictions
  app.get('/api/stats', (req, res) => {
    res.json(getStats());
  });

  // Serve Frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}
startServer();
