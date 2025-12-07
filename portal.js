import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  where
} from 'firebase/firestore';
import { 
  BookOpen, 
  Users, 
  GraduationCap, 
  Upload, 
  LogOut, 
  TrendingUp, 
  Search, 
  Bell, 
  Menu, 
  X,
  FileText,
  User,
  CheckCircle,
  AlertCircle,
  School,
  Lock,
  Mail,
  Phone,
  Shield,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  PlusCircle,
  Save,
  Filter,
  UserPlus,
  RefreshCw,
  List,
  Database,
  Printer,
  Sparkles,
  Lightbulb,
  BrainCircuit,
  Key
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const apiKey = ""; // API Key provided by environment

// --- TYPES & INTERFACES ---
type UserRole = 'student' | 'teacher' | 'admin' | null;
type ActiveSection = 'dashboard' | 'profile' | 'transcripts';

interface TeacherCredentials {
  username: string;
  password: string;
}

interface StudentResult {
  id?: string;
  studentName: string;
  studentId: string;
  level: string;      
  className: string;  
  subject: string;
  score: number;
  grade: string;
  term: string;
  year: string;
  createdAt?: any;
}

interface Student {
  id?: string;
  name: string;
  studentId: string;
  level: string;
  className: string;
  email?: string;
  createdAt?: any;
}

interface UserProfile {
  id?: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  studentId?: string; // Optional, for students
}

// --- CONSTANTS ---
const ACADEMIC_LEVELS: Record<string, string[]> = {
  "ZJC": ["1A", "1B", "2A", "2B"],
  "O Level": ["3 Sciences", "3 Commercials", "3 Arts", "4 Sciences", "4 Commercials", "4 Arts"],
  "A Level": ["Lower 6 Sciences", "Lower 6 Commercials", "Lower 6 Arts", "Upper 6 Sciences", "Upper 6 Commercials", "Upper 6 Arts"]
};

const O_LEVEL_SUBJECTS: Record<string, string[]> = {
  "ZJC": [
    "English", "Shona", "Heritage", "Combined Science", "Computer Science", 
    "Geography", "FRS", "History", "Mathematics", "Accounts", "Agriculture"
  ],
  "Sciences": [
    "Mathematics", "Heritage", "Combined Science", "Computer Science", "English", 
    "Physics", "Biology", "Agriculture", "Geography", "Chemistry"
  ],
  "Commercials": [
    "Mathematics", "English", "Heritage", "Combined Science", "Computer Science", 
    "Geography", "Accounts", "Business Studies", "Economics"
  ],
  "Arts": [
    "Mathematics", "English", "Heritage", "Combined Science", "Shona", 
    "History", "Sociology", "FRS", "Literature in English", "Literature in Shona"
  ]
};

const A_LEVEL_SUBJECTS: Record<string, string[]> = {
  "Sciences": [
    "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", 
    "Geography", "Agriculture"
  ],
  "Commercials": [
    "Mathematics", "Accounts", "Business Studies", "Economics", 
    "Computer Science", "Geography"
  ],
  "Arts": [
    "History", "Sociology", "FRS", "Literature in English", 
    "Literature in Shona", "Geography", "Shona"
  ]
};

const ALL_POSSIBLE_SUBJECTS = Array.from(new Set([
  ...O_LEVEL_SUBJECTS["ZJC"],
  ...O_LEVEL_SUBJECTS["Sciences"],
  ...O_LEVEL_SUBJECTS["Commercials"],
  ...O_LEVEL_SUBJECTS["Arts"],
  ...A_LEVEL_SUBJECTS["Sciences"],
  ...A_LEVEL_SUBJECTS["Commercials"],
  ...A_LEVEL_SUBJECTS["Arts"],
  "Art & Design"
])).sort();

// --- UTILS ---
const calculateGrade = (score: number) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
};

const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return 'text-green-600 bg-green-50';
  if (grade.startsWith('B')) return 'text-blue-600 bg-blue-50';
  if (grade.startsWith('C')) return 'text-yellow-600 bg-yellow-50';
  if (grade.startsWith('D')) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
};

const getSubjectsForClass = (className: string) => {
  if (!className) return ALL_POSSIBLE_SUBJECTS;
  const normalizedClass = className.toLowerCase();
  
  if (normalizedClass.includes('lower 6') || normalizedClass.includes('upper 6')) {
    if (normalizedClass.includes('sciences')) return A_LEVEL_SUBJECTS["Sciences"];
    if (normalizedClass.includes('commercials')) return A_LEVEL_SUBJECTS["Commercials"];
    if (normalizedClass.includes('arts')) return A_LEVEL_SUBJECTS["Arts"];
  } else {
    if (normalizedClass.includes('sciences')) return O_LEVEL_SUBJECTS["Sciences"];
    if (normalizedClass.includes('commercials')) return O_LEVEL_SUBJECTS["Commercials"];
    if (normalizedClass.includes('arts')) return O_LEVEL_SUBJECTS["Arts"];
  }
  if (normalizedClass.startsWith('1') || normalizedClass.startsWith('2')) {
    return O_LEVEL_SUBJECTS["ZJC"];
  }
  return ALL_POSSIBLE_SUBJECTS;
};

// --- GEMINI API HELPER ---
const callGemini = async (prompt: string) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate analysis at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to AI service. Please try again later.";
  }
};

// --- COMPONENTS ---

// 1. LOGIN COMPONENT
const LoginScreen = ({ 
  onLogin, 
  teacherCredentials 
}: { 
  onLogin: (role: UserRole, name: string) => void,
  teacherCredentials: TeacherCredentials 
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simulate network delay
    setTimeout(() => {
      let finalName = username;
      let success = false;

      // AUTHENTICATION LOGIC
      if (selectedRole === 'student') {
        // Students: Any ID for demo (in real app check DB)
        finalName = username || 'Alex Johnson';
        success = true; 
      } else if (selectedRole === 'admin') {
        // Admin: Hardcoded for demo/safety, in real app use Firebase Auth claims
        if (username === 'STAFF' && password === '@STAFF-001') {
          finalName = 'STAFF';
          success = true;
        } else {
          setError('Invalid Admin credentials.');
        }
      } else if (selectedRole === 'teacher') {
        // Teacher: Check against dynamic credentials from Firestore
        if (username === teacherCredentials.username && password === teacherCredentials.password) {
          finalName = teacherCredentials.username;
          success = true;
        } else {
          setError('Invalid Teacher username or password.');
        }
      }

      if (success) {
        onLogin(selectedRole, finalName);
      }
      setLoading(false);
    }, 800);
  };

  const getRoleIcon = (role: UserRole) => {
    if (role === 'student') return <GraduationCap size={32} />;
    if (role === 'teacher') return <BookOpen size={32} />;
    if (role === 'admin') return <Users size={32} />;
    return <School size={32} />;
  };

  const getRoleColor = (role: UserRole) => {
    if (role === 'student') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (role === 'teacher') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (role === 'admin') return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-blue-600 bg-blue-50';
  };

  const getPasswordLabel = () => {
    if (selectedRole === 'student') return 'Password (Student ID)';
    if (selectedRole === 'admin') return 'Password';
    return 'Password (Shared Key)';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        {/* Left Side - Brand */}
        <div className="w-full md:w-1/2 bg-blue-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#FFFFFF" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,79.6,-46.3C87.4,-33.5,90.1,-18,88.4,-3.3C86.7,11.4,80.5,25.3,71.5,37.1C62.5,48.9,50.7,58.6,38,66.1C25.3,73.6,11.7,78.9,-1.2,81C-14.1,83.1,-27.6,82,-39.7,75.2C-51.8,68.4,-62.5,55.9,-70.3,42.1C-78.1,28.3,-83,13.2,-81.3,-1C-79.6,-15.2,-71.3,-28.5,-61.6,-39.7C-51.9,-50.9,-40.8,-60,-28.9,-68.3C-17,-76.6,-4.2,-84.1,4.9,-92.6L14,-101.1L44.7,-76.4Z" transform="translate(100 100)" />
            </svg>
          </div>
          <div className="relative z-10">
            <School className="w-16 h-16 mb-6" />
            <h1 className="text-4xl font-bold mb-4">Shungu High School</h1>
            <p className="text-blue-200 text-lg">Secure Access Portal</p>
          </div>
          <div className="relative z-10 text-sm text-blue-300">
            &copy; 2025 Shungu Education Systems. <br/>Authorized personnel only.
          </div>
        </div>

        {/* Right Side - Login Flow */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
          
          {!selectedRole ? (
            // ROLE SELECTION VIEW
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Select Portal</h2>
              <p className="text-slate-500 mb-8">Choose your role to sign in securely.</p>

              <div className="space-y-4">
                <button onClick={() => setSelectedRole('student')} className="w-full p-4 border border-slate-200 rounded-xl flex items-center hover:border-blue-500 hover:bg-blue-50 transition-all group">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <GraduationCap size={24} />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="font-semibold text-slate-800">Student</h3>
                  </div>
                </button>

                <button onClick={() => setSelectedRole('teacher')} className="w-full p-4 border border-slate-200 rounded-xl flex items-center hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="font-semibold text-slate-800">Teacher</h3>
                  </div>
                </button>

                <button onClick={() => setSelectedRole('admin')} className="w-full p-4 border border-slate-200 rounded-xl flex items-center hover:border-purple-500 hover:bg-purple-50 transition-all group">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Users size={24} />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="font-semibold text-slate-800">Administrator</h3>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            // LOGIN FORM VIEW
            <div className="animate-fade-in">
              <button 
                onClick={() => { setSelectedRole(null); setUsername(''); setPassword(''); setError(''); }}
                className="flex items-center text-sm text-slate-400 hover:text-slate-600 mb-6 transition-colors"
              >
                <X size={16} className="mr-1" /> Cancel
              </button>

              <div className="flex items-center mb-6">
                <div className={`p-3 rounded-xl mr-4 ${getRoleColor(selectedRole)}`}>
                  {getRoleIcon(selectedRole)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 capitalize">{selectedRole} Login</h2>
                  <p className="text-slate-500 text-sm">Please enter your credentials.</p>
                </div>
              </div>

              {error && (
                 <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">
                    <AlertCircle size={16} className="mr-2" />
                    {error}
                 </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username (Name)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                    placeholder={
                      selectedRole === 'teacher' ? teacherCredentials.username :
                      selectedRole === 'admin' ? 'STAFF' : 
                      'Alex Johnson'
                    }
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{getPasswordLabel()}</label>
                  <input 
                    type="password" 
                    required
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                    placeholder={
                      selectedRole === 'teacher' ? teacherCredentials.password :
                      selectedRole === 'admin' ? '@STAFF-001' : 
                      'e.g. ST-2024-001'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                 <p className="text-xs text-slate-400">
                   <Lock size={12} className="inline mr-1" />
                   Secure Connection • 256-bit Encryption
                 </p>
                 {selectedRole === 'student' && (
                    <p className="text-xs text-blue-500 mt-2 bg-blue-50 p-2 rounded">
                      <strong>Demo Tip:</strong> Use name <u>Alex Johnson</u> to view sample data.
                    </p>
                 )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. PROFILE SECTION (EDITABLE)
const ProfileSection = ({ 
  profile, 
  onSave 
}: { 
  profile: UserProfile, 
  onSave: (data: Partial<UserProfile>) => void 
}) => {
  const [formData, setFormData] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone || "+1 (555) 000-0000"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if current user is admin
  const isAdmin = profile.role === 'admin';

  const handleSubmit = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">My Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold mx-auto mb-4">
              {formData.name.charAt(0)}
            </div>
            <h3 className="font-bold text-lg text-slate-800">{formData.name}</h3>
            <p className="text-slate-500 capitalize mb-6">{profile.role}</p>
            
            <div className="text-left space-y-3 pt-6 border-t border-slate-100">
              <div className="flex items-center text-sm text-slate-600">
                <Shield size={16} className="mr-3 text-slate-400" />
                <span>ID: <span className="font-mono text-slate-800">{profile.studentId || 'STAFF-ID'}</span></span>
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <CheckCircle size={16} className="mr-3 text-green-500" />
                <span>Account Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Form */}
        <div className="md:col-span-2">
          <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                <User size={20} className="mr-2 text-blue-600" />
                Personal Details
              </h3>
              {success && <span className="text-sm text-green-600 font-medium">Changes saved!</span>}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className={`w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${!isAdmin ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                    value={formData.name}
                    onChange={(e) => isAdmin && setFormData({...formData, name: e.target.value})}
                    readOnly={!isAdmin}
                    title={!isAdmin ? "Only administrators can edit names." : ""}
                  />
                  {!isAdmin && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      <Lock size={14} />
                    </div>
                  )}
                </div>
                {!isAdmin && <p className="text-xs text-slate-400 mt-1">Name editing is restricted to administrators.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email" 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input 
                    type="tel" 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-white p-8 rounded-xl border border-red-100 shadow-sm">
             <h3 className="font-bold text-lg text-red-600 mb-4 flex items-center">
              <Lock size={20} className="mr-2" />
              Security
            </h3>
            <button className="text-red-600 font-medium text-sm hover:underline border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. TRANSCRIPTS SECTION
const TranscriptsSection = ({ results, studentId }: { results: StudentResult[], studentId: string }) => {
  const myResults = useMemo(() => results.filter(r => r.studentId === studentId), [results, studentId]);

  // Group by Year then Term
  const groupedResults = useMemo(() => {
    const grouped: Record<string, Record<string, StudentResult[]>> = {};
    
    myResults.forEach(r => {
      if (!grouped[r.year]) grouped[r.year] = {};
      if (!grouped[r.year][r.term]) grouped[r.year][r.term] = [];
      grouped[r.year][r.term].push(r);
    });

    return grouped;
  }, [myResults]);

  // Helper to calculate average for a specific term list
  const getTermAverage = (termResults: StudentResult[]) => {
    if (termResults.length === 0) return 0;
    const total = termResults.reduce((acc, curr) => acc + curr.score, 0);
    return (total / termResults.length).toFixed(1);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <h2 className="text-2xl font-bold text-slate-800">Academic Transcripts</h2>
        <button 
          onClick={() => window.print()}
          className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          <Printer size={16} className="mr-2" /> Print Official Record
        </button>
      </div>

      {Object.keys(groupedResults).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-100">
          <FileText size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500">No academic records found for this student ID.</p>
        </div>
      ) : (
        // Sort years descending (newest first)
        Object.keys(groupedResults).sort((a, b) => Number(b) - Number(a)).map(year => (
          <div key={year} className="space-y-6">
            {/* Sort terms (Term 1, Term 2, Term 3) */}
            {Object.keys(groupedResults[year]).sort().map(term => {
              const termData = groupedResults[year][term];
              const termAverage = getTermAverage(termData);
              
              return (
                <div key={`${year}-${term}`} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-black">
                  {/* Transcript Header */}
                  <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center print:bg-white">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 uppercase tracking-wide">{term}, {year}</h3>
                      <p className="text-sm text-slate-500 print:text-black">Shungu High School Official Result</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold mb-1">Term Average</p>
                      <div className="text-2xl font-bold text-blue-600 print:text-black">{termAverage}%</div>
                    </div>
                  </div>

                  {/* Transcript Body */}
                  <div className="p-0">
                    <table className="w-full text-left">
                      <thead className="bg-white text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                        <tr>
                          <th className="p-4 pl-6 w-1/2">Subject</th>
                          <th className="p-4 text-center">Score</th>
                          <th className="p-4 text-center">Grade</th>
                          <th className="p-4 pr-6 text-right">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {termData.map((result) => (
                          <tr key={result.id}>
                            <td className="p-4 pl-6 font-medium text-slate-800">{result.subject}</td>
                            <td className="p-4 text-center font-mono text-slate-600">{result.score}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${getGradeColor(result.grade)} print:text-black print:bg-transparent print:border print:border-black`}>
                                {result.grade}
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-right text-xs text-slate-400 italic print:text-black">
                              {result.score >= 50 ? 'Pass' : 'Fail'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Transcript Footer */}
                  <div className="bg-slate-50 p-4 border-t border-slate-200 text-center print:bg-white print:mt-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Valid without seal if viewed online</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
};

// 4. STUDENT DASHBOARD
const StudentDashboard = ({ results, studentId }: { results: StudentResult[], studentId: string }) => {
  // Filter by ID instead of Name for better reliability
  const myResults = results.filter(r => r.studentId === studentId);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  
  const gpa = useMemo(() => {
    if (myResults.length === 0) return 0.0;
    const points = myResults.reduce((acc, curr) => {
      if (curr.score >= 90) return acc + 4.0;
      if (curr.score >= 80) return acc + 3.0;
      if (curr.score >= 70) return acc + 2.0;
      if (curr.score >= 60) return acc + 1.0;
      return acc;
    }, 0);
    return (points / myResults.length).toFixed(2);
  }, [myResults]);

  const recentResults = [...myResults].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const handleGetAdvice = async () => {
    if (recentResults.length === 0) return;
    setAiLoading(true);
    
    // Construct prompt
    const gradesSummary = recentResults.slice(0, 5).map(r => `${r.subject}: ${r.score}% (${r.grade})`).join(', ');
    const prompt = `I am a student. Here are my recent grades: ${gradesSummary}. Act as an encouraging academic counselor. Provide 3 specific, actionable study tips based on my weakest subjects, and 1 general motivation tip. Keep it concise and friendly.`;
    
    const advice = await callGemini(prompt);
    setAiAdvice(advice);
    setAiLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Cumulative GPA</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">{gpa}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-4 text-xs text-green-600 flex items-center font-medium">
            <TrendingUp size={12} className="mr-1" /> +0.2 from last term
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Subjects</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">{myResults.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Latest Grade</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">{recentResults[0]?.grade || '-'}</h3>
              <p className="text-xs text-slate-400">{recentResults[0]?.subject || 'No Data'}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Study Coach Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BrainCircuit size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center mb-4">
            <Sparkles className="mr-2 text-yellow-300" />
            <h3 className="text-xl font-bold">AI Study Coach</h3>
          </div>
          
          {!aiAdvice ? (
            <div>
              <p className="mb-4 text-indigo-100">Need personalized advice on how to improve your grades? Ask our AI coach!</p>
              <button 
                onClick={handleGetAdvice}
                disabled={aiLoading || recentResults.length === 0}
                className="px-6 py-2 bg-white text-indigo-600 font-bold rounded-full shadow-md hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                {aiLoading ? "Analyzing..." : "✨ Get Smart Study Tips"}
              </button>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg text-sm leading-relaxed border border-white/20">
                {aiAdvice.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">{line}</p>
                ))}
              </div>
              <button 
                onClick={() => setAiAdvice(null)}
                className="mt-4 text-xs text-indigo-200 hover:text-white underline"
              >
                Close Advice
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Academic Records</h3>
          <button className="text-blue-600 text-sm font-medium hover:text-blue-700">Download PDF</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Subject</th>
                <th className="p-4 font-semibold">Term</th>
                <th className="p-4 font-semibold">Score</th>
                <th className="p-4 font-semibold">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myResults.length > 0 ? (
                myResults.map((result) => (
                  <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{result.subject}</td>
                    <td className="p-4 text-slate-600 text-sm">{result.term} {result.year}</td>
                    <td className="p-4 font-mono text-slate-700">{result.score}%</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${getGradeColor(result.grade)}`}>
                        {result.grade}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">No results found yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 5. TEACHER DASHBOARD (REFACTORED FOR BULK ENTRY)
const TeacherDashboard = ({ 
  results,
  students,
  onSubmitResult,
  onUpdateResult
}: { 
  results: StudentResult[];
  students: Student[];
  onSubmitResult: (data: Omit<StudentResult, 'id' | 'createdAt'>) => void;
  onUpdateResult: (id: string, data: Partial<StudentResult>) => void;
  onDeleteResult: (id: string) => void;
}) => {
  const currentYearStr = new Date().getFullYear().toString();

  // --- STATE FOR SELECTION ---
  const [selectedLevel, setSelectedLevel] = useState('ZJC');
  const [selectedClass, setSelectedClass] = useState('1A');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics'); // Default
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState(currentYearStr);

  // --- STATE FOR BULK MARKS ---
  // marks: { [studentId]: score_string }
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // --- AI INSIGHTS STATE ---
  const [aiLoading, setAiLoading] = useState(false);
  const [classInsights, setClassInsights] = useState<string | null>(null);

  // 1. FILTER STUDENTS by Class & Sort Alphabetically then by ID
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.level === selectedLevel && s.className === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name) || a.studentId.localeCompare(b.studentId));
  }, [students, selectedLevel, selectedClass]);

  // 2. FETCH EXISTING MARKS for this specific context
  useEffect(() => {
    const existingMarks: Record<string, string> = {};
    
    // Find results that match current filters
    const relevantResults = results.filter(r => 
      r.level === selectedLevel &&
      r.className === selectedClass &&
      r.subject === selectedSubject &&
      r.term === selectedTerm &&
      r.year === selectedYear
    );

    relevantResults.forEach(r => {
      existingMarks[r.studentId] = r.score.toString();
    });

    setMarks(existingMarks);
  }, [results, selectedLevel, selectedClass, selectedSubject, selectedTerm, selectedYear]);

  // 3. HANDLE INPUT CHANGE
  const handleMarkChange = (studentId: string, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  // 4. BULK SAVE
  const handleBulkSave = async () => {
    setLoading(true);
    const promises: Promise<any>[] = [];

    // Loop through all students in the class
    classStudents.forEach(student => {
      const scoreStr = marks[student.studentId];
      if (!scoreStr) return; // Skip empty marks

      const scoreNum = Number(scoreStr);
      const grade = calculateGrade(scoreNum);

      // Check if result already exists
      const existingResult = results.find(r => 
        r.studentId === student.studentId &&
        r.subject === selectedSubject &&
        r.term === selectedTerm &&
        r.year === selectedYear
      );

      const payload = {
        studentName: student.name,
        studentId: student.studentId,
        level: selectedLevel,
        className: selectedClass,
        subject: selectedSubject,
        term: selectedTerm,
        year: selectedYear,
        score: scoreNum,
        grade: grade
      };

      if (existingResult) {
        // Update existing
        if (existingResult.score !== scoreNum) { // Only update if changed
           promises.push(onUpdateResult(existingResult.id!, payload));
        }
      } else {
        // Create new
        promises.push(onSubmitResult(payload));
      }
    });

    await Promise.all(promises);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };
  
  // 5. GET AI CLASS INSIGHTS
  const handleGetClassInsights = async () => {
    setAiLoading(true);
    
    // Compile anonymous performance data
    const performanceData = classStudents.map(student => {
      const score = marks[student.studentId];
      return score ? parseInt(score) : null;
    }).filter(s => s !== null);
    
    if (performanceData.length === 0) {
      setClassInsights("No marks entered yet to analyze.");
      setAiLoading(false);
      return;
    }
    
    const average = (performanceData.reduce((a, b) => a! + b!, 0)! / performanceData.length).toFixed(1);
    const highest = Math.max(...performanceData as number[]);
    const lowest = Math.min(...performanceData as number[]);
    
    const prompt = `I am a teacher. I have just entered marks for ${selectedClass} ${selectedSubject}. 
    Class Stats: Average: ${average}%, Highest: ${highest}%, Lowest: ${lowest}%. 
    Total students marked: ${performanceData.length}.
    Please provide a brief, professional analysis of this performance. Suggest 2 specific teaching strategies I could use to help the lower performing students in this specific subject.`;
    
    const insight = await callGemini(prompt);
    setClassInsights(insight);
    setAiLoading(false);
  };

  const activeSubjects = useMemo(() => getSubjectsForClass(selectedClass), [selectedClass]);
  
  // Year options
  const yearOptions = useMemo(() => {
    const cy = new Date().getFullYear();
    const yrs = [];
    for (let i = -1; i < 10; i++) yrs.push((cy - i).toString());
    return yrs;
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <List className="mr-2 text-blue-600" size={24} />
            Class Result Entry
          </h2>
          {success && (
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center">
              <CheckCircle size={16} className="mr-2" /> Results Published!
            </div>
          )}
        </div>

        {/* --- FILTERS ROW --- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Level</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={selectedLevel}
              onChange={e => { setSelectedLevel(e.target.value); setSelectedClass(ACADEMIC_LEVELS[e.target.value][0]); }}
            >
              {Object.keys(ACADEMIC_LEVELS).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Class</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
            >
              {ACADEMIC_LEVELS[selectedLevel].map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Subject</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
            >
              {activeSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Term</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
              <option>Term 1</option><option>Term 2</option><option>Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Year</label>
            <select className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* --- AI INSIGHTS BUTTON --- */}
        <div className="mb-4">
           <button 
             onClick={handleGetClassInsights}
             disabled={aiLoading}
             className="flex items-center text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50"
           >
             <Sparkles size={16} className="mr-1" />
             {aiLoading ? 'Generating Insights...' : 'Generate AI Class Insights'}
           </button>
           
           {classInsights && (
             <div className="mt-3 p-4 bg-purple-50 border border-purple-100 rounded-lg text-sm text-slate-700 animate-fade-in relative">
               <div className="absolute top-2 right-2">
                 <button onClick={() => setClassInsights(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
               </div>
               <div className="flex items-start">
                 <Lightbulb className="mr-3 text-purple-500 flex-shrink-0 mt-0.5" size={18} />
                 <div className="whitespace-pre-line">{classInsights}</div>
               </div>
             </div>
           )}
        </div>

        {/* --- BULK ENTRY TABLE --- */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold">
              <tr>
                <th className="p-3 border-r border-slate-200 w-16 text-center">#</th>
                <th className="p-3 border-r border-slate-200">Student Name</th>
                <th className="p-3 border-r border-slate-200">Student ID</th>
                <th className="p-3 w-32 text-center">Mark (0-100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.length > 0 ? (
                classStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-400 text-sm border-r border-slate-100">{index + 1}</td>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-100">{student.name}</td>
                    <td className="p-3 text-slate-500 font-mono text-sm border-r border-slate-100">{student.studentId}</td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        min="0" 
                        max="100"
                        className="w-full p-2 border border-slate-200 rounded text-center font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={marks[student.studentId] || ''}
                        onChange={(e) => handleMarkChange(student.studentId, e.target.value)}
                        placeholder="-"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No students registered in {selectedClass}. 
                    <br/>
                    <span className="text-xs">Ask an admin to register students first.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- SAVE BUTTON --- */}
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleBulkSave}
            disabled={loading || classStudents.length === 0}
            className="flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? (
              <>Processing...</>
            ) : (
              <>
                <Save className="mr-2" size={20} />
                Publish Results
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// 6. ADMIN DASHBOARD
const AdminDashboard = ({ 
  results, 
  students,
  teacherCredentials, // ADDED PROP
  onAddStudent,
  onUpdateStudent,
  onUpdateTeacherAuth // ADDED PROP
}: { 
  results: StudentResult[], 
  students: Student[],
  teacherCredentials: TeacherCredentials, // ADDED
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt'>) => void,
  onUpdateStudent: (id: string, data: Partial<Student>) => void,
  onUpdateTeacherAuth: (data: TeacherCredentials) => void // ADDED
}) => {
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    level: 'ZJC',
    className: '1A',
    email: ''
  });
  // New state for Teacher Auth form
  const [teacherAuthForm, setTeacherAuthForm] = useState({
    username: teacherCredentials.username,
    password: teacherCredentials.password
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Update teacher form when prop changes
  useEffect(() => {
    setTeacherAuthForm(teacherCredentials);
  }, [teacherCredentials]);

  // Update class dropdown when level changes
  useEffect(() => {
    const validClasses = ACADEMIC_LEVELS[formData.level] || [];
    if (!validClasses.includes(formData.className)) {
      setFormData(prev => ({ ...prev, className: validClasses[0] || '' }));
    }
  }, [formData.level]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (editingStudentId) {
      await onUpdateStudent(editingStudentId, formData);
      setEditingStudentId(null);
    } else {
      await onAddStudent(formData);
    }
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setFormData({ name: '', studentId: '', level: 'ZJC', className: '1A', email: '' });
  };
  
  // Handler for saving teacher auth changes
  const handleTeacherAuthSave = async () => {
    setLoading(true);
    await onUpdateTeacherAuth(teacherAuthForm);
    setLoading(false);
    setSuccess(true); // Re-using success state for simplicity
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleEditClick = (student: Student) => {
    setEditingStudentId(student.id!);
    setFormData({
      name: student.name,
      studentId: student.studentId,
      level: student.level,
      className: student.className,
      email: student.email || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setFormData({ name: '', studentId: '', level: 'ZJC', className: '1A', email: '' });
  };

  const searchedStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const classTabs = useMemo(() => {
    const tabs = ['All'];
    Object.entries(ACADEMIC_LEVELS).forEach(([level, classes]) => {
      classes.forEach(cls => {
        tabs.push(`${level} - ${cls}`);
      });
    });
    return tabs;
  }, []);

  const displayedStudents = useMemo(() => {
    if (activeTab === 'All') return searchedStudents;
    return searchedStudents.filter(s => `${s.level} - ${s.className}` === activeTab);
  }, [activeTab, searchedStudents]);

  const sortedStudents = useMemo(() => {
    return [...displayedStudents].sort((a, b) => a.name.localeCompare(b.name));
  }, [displayedStudents]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs uppercase font-bold">Total Students</p>
          <h3 className="text-2xl font-bold text-slate-800">{students.length}</h3>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <p className="text-slate-500 text-xs uppercase font-bold">Total Results</p>
          <h3 className="text-2xl font-bold text-slate-800">{results.length}</h3>
        </div>
        {/* ... other stats */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Student Registration Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 flex items-center">
                {editingStudentId ? <Edit2 size={20} className="mr-2 text-blue-600" /> : <UserPlus size={20} className="mr-2 text-blue-600" />}
                {editingStudentId ? 'Edit Student' : 'Register Student'}
              </h3>
              {editingStudentId && <button onClick={handleCancelEdit} className="text-xs text-slate-500 hover:text-blue-600">Cancel</button>}
            </div>

            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center text-sm">
                <CheckCircle size={16} className="mr-2" />
                Action successful!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" required className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student ID</label>
                <input type="text" required className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} placeholder="e.g. ST-2024-001" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                  <select className="w-full p-2.5 border border-slate-200 rounded-lg" value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})}>
                    {Object.keys(ACADEMIC_LEVELS).map(lvl => (<option key={lvl} value={lvl}>{lvl}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                  <select className="w-full p-2.5 border border-slate-200 rounded-lg" value={formData.className} onChange={e => setFormData({...formData, className: e.target.value})}>
                    {ACADEMIC_LEVELS[formData.level]?.map(cls => (<option key={cls} value={cls}>{cls}</option>))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading} className={`w-full text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 mt-2 ${editingStudentId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? 'Saving...' : editingStudentId ? 'Update Account' : 'Create Account'}
              </button>
            </form>
          </div>
          
          {/* TEACHER ACCESS SETTINGS CARD */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-fit">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
              <Key size={20} className="mr-2 text-blue-600" />
              Teacher Access Settings
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update the shared credentials for all teachers.
            </p>
            
            <div className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Teacher Username</label>
                 <input 
                   type="text" 
                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                   value={teacherAuthForm.username}
                   onChange={e => setTeacherAuthForm({...teacherAuthForm, username: e.target.value})}
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Teacher Password</label>
                 <input 
                   type="text" 
                   className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                   value={teacherAuthForm.password}
                   onChange={e => setTeacherAuthForm({...teacherAuthForm, password: e.target.value})}
                 />
              </div>
              <button 
                onClick={handleTeacherAuthSave}
                disabled={loading}
                className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-900 transition-colors disabled:opacity-50 text-sm"
              >
                Update Credentials
              </button>
            </div>
          </div>
        </div>

        {/* Student Directory Table with TABS */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden h-[600px]">
          <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">Student Directory</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              {classTabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-4">Student</th>
                  <th className="p-4">Level</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">ID</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStudents.length > 0 ? sortedStudents.map((student) => (
                  <tr key={student.id} className={`hover:bg-slate-50 ${editingStudentId === student.id ? 'bg-blue-50' : ''}`}>
                    <td className="p-4 font-medium text-slate-800"><div className="flex items-center"><div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3">{student.name.charAt(0)}</div>{student.name}</div></td>
                    <td className="p-4 text-sm text-slate-600">{student.level}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">{student.className}</span></td>
                    <td className="p-4 text-sm font-mono text-slate-500">{student.studentId}</td>
                    <td className="p-4 text-right"><button onClick={() => handleEditClick(student)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"><Edit2 size={16} /></button></td>
                  </tr>
                )) : <tr><td colSpan={5} className="p-8 text-center text-slate-400"><div className="flex flex-col items-center justify-center py-8"><Users size={48} className="text-slate-200 mb-4" /><p>No students found in {activeTab}.</p></div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// 7. MAIN APP LAYOUT
const App = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  
  // State for Teacher Credentials
  const [teacherCredentials, setTeacherCredentials] = useState<TeacherCredentials>({
    username: 'SHS-STAFF',
    password: '@TEACHER-SECURE-25'
  });

  // --- AUTH & DATA LOGIC ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try { await signInWithCustomToken(auth, __initial_auth_token); } 
        catch (e) { await signInAnonymously(auth); }
      } else { await signInAnonymously(auth); }
    };
    initAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, setUser);
    return () => unsubscribeAuth();
  }, []);

  // Fetch or Create User Profile
  useEffect(() => {
    if (!user || !activeRole) return;

    const fetchProfile = async () => {
      setLoading(true);
      const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid);
      
      const unsubscribe = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        } else {
          // Initialize default profile based on role if it doesn't exist
          const defaultProfile = {
            id: user.uid,
            name: activeRole === 'student' ? 'Alex Johnson' : activeRole === 'teacher' ? 'Mrs. Davis' : 'System Admin',
            role: activeRole,
            email: `${activeRole}@shungu.edu`,
            phone: '',
            studentId: activeRole === 'student' ? 'ST-2024-001' : 'STAFF-001'
          };
          setDoc(profileRef, defaultProfile); // Use setDoc instead of addDoc for specific ID
        }
        setLoading(false);
      });
      return unsubscribe;
    };

    fetchProfile();
  }, [user, activeRole]);

  // Fetch Results, Students AND Teacher Credentials
  useEffect(() => {
    if (!user) return;
    const resultsRef = collection(db, 'artifacts', appId, 'public', 'data', 'results');
    const unsubResults = onSnapshot(resultsRef, (s) => setResults(s.docs.map(d => ({id: d.id, ...d.data()} as StudentResult))));
    const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    const unsubStudents = onSnapshot(studentsRef, (s) => setStudents(s.docs.map(d => ({id: d.id, ...d.data()} as Student))));
    
    // FETCH TEACHER AUTH SETTINGS
    const teacherAuthRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'teacher_auth');
    const unsubTeacherAuth = onSnapshot(teacherAuthRef, (snap) => {
      if (snap.exists()) {
        setTeacherCredentials(snap.data() as TeacherCredentials);
      } else {
        // Init default if missing
        setDoc(teacherAuthRef, { username: 'SHS-STAFF', password: '@TEACHER-SECURE-25' });
      }
    });

    return () => { unsubResults(); unsubStudents(); unsubTeacherAuth(); };
  }, [user]);

  const handleLogin = (role: UserRole, name: string) => {
    setActiveRole(role);
    setActiveSection('dashboard');
  };

  const handleLogout = () => {
    setActiveRole(null);
    setUserProfile(null);
    setSidebarOpen(false);
    setActiveSection('dashboard');
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.uid);
    await updateDoc(profileRef, data);
  };

  const handleUploadResult = async (data: any) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'results'), { ...data, createdAt: serverTimestamp() });
  };

  const handleUpdateResult = async (id: string, data: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'results', id), data);
  };

  const handleDeleteResult = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'results', id));
  };

  const handleAddStudent = async (student: any) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...student, createdAt: serverTimestamp() });
  };

  const handleUpdateStudent = async (id: string, data: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id), data);
  };
  
  const handleUpdateTeacherAuth = async (data: TeacherCredentials) => {
    if (!user) return;
    const teacherAuthRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'teacher_auth');
    await setDoc(teacherAuthRef, data); // setDoc overwrites or creates
  };

  if (loading && !userProfile && activeRole) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div></div>;

  if (!activeRole) return <LoginScreen onLogin={handleLogin} teacherCredentials={teacherCredentials} />;

  const renderContent = () => {
    if (activeSection === 'profile') return <ProfileSection profile={userProfile!} onSave={handleUpdateProfile} />;
    if (activeSection === 'transcripts') return <TranscriptsSection results={results} studentId={userProfile?.studentId || ''} />;
    if (activeRole === 'student') return <StudentDashboard results={results} studentId={userProfile?.studentId || ''} />;
    if (activeRole === 'teacher') return <TeacherDashboard results={results} students={students} onSubmitResult={handleUploadResult} onUpdateResult={handleUpdateResult} onDeleteResult={handleDeleteResult} />;
    if (activeRole === 'admin') return <AdminDashboard results={results} students={students} teacherCredentials={teacherCredentials} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onUpdateTeacherAuth={handleUpdateTeacherAuth} />;
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex text-slate-800">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-center space-x-3 mb-10 text-blue-600">
            <School size={32} />
            <span className="font-bold text-xl text-slate-800">Shungu Portal</span>
          </div>
          <nav className="flex-1 space-y-2">
            <button onClick={() => { setActiveSection('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeSection === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <div className="mr-3">{activeRole === 'student' ? <GraduationCap size={20} /> : activeRole === 'teacher' ? <BookOpen size={20} /> : <Users size={20} />}</div> Dashboard
            </button>
            {activeRole === 'student' && <button onClick={() => { setActiveSection('transcripts'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeSection === 'transcripts' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><FileText size={20} className="mr-3" /> Transcripts</button>}
             <button onClick={() => { setActiveSection('profile'); setSidebarOpen(false); }} className={`w-full flex items-center p-3 rounded-lg font-medium transition-colors ${activeSection === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><User size={20} className="mr-3" /> Profile</button>
          </nav>
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">{userProfile?.name?.charAt(0) || 'U'}</div>
              <div className="ml-3"><p className="text-sm font-semibold">{userProfile?.name}</p><p className="text-xs text-slate-500 capitalize">{activeRole}</p></div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"><LogOut size={16} className="mr-2" /> Sign Out</button>
          </div>
        </div>
        {/* Database Status Indicator */}
        <div className="p-4 border-t border-blue-800 bg-blue-950 mt-auto">
          <div className="flex items-center text-blue-200 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
            <span>Live Database Active</span>
          </div>
          <p className="text-[10px] text-blue-400 mt-1 pl-4">Data is stored securely in the cloud.</p>
        </div>
      </aside>
      <main className="flex-1 h-screen overflow-y-auto">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <button className="md:hidden mr-4 text-slate-500" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
              <h2 className="text-xl font-bold text-slate-800 capitalize">{activeSection === 'dashboard' ? `${activeRole} Dashboard` : activeSection}</h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all" />
              </div>
            </div>
          </div>
        </header>
        <div className="p-6 md:p-8 max-w-7xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;