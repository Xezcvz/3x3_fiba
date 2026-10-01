import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTeams } from '../services/api';
import TeamCard from '../components/TeamCard';
import { useAuth } from '../context/AuthContext';
import { Users, Search, Plus, Shield } from 'lucide-react';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchTeams();
  }, [categoryFilter, groupFilter]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (groupFilter !== 'all') params.group = groupFilter;
      const res = await getTeams(params);
      setTeams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.coach && t.coach.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 pb-16">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2.5 py-1 rounded-md mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>สโมสรและทีมแข่งขัน 24 ทีม</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            ทีมทั้งหมดในทัวร์นาเมนต์
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            รายชื่อทีมบาสเกตบอล 3×3 ที่เข้าร่วมการแข่งขัน NVC 3×3 Basketball Club (รุ่น A & รุ่น B)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {isAuthenticated && (
            <Link
              to="/admin/teams"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>จัดการทีม (Admin)</span>
            </Link>
          )}

          {/* Division (Category) Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'all', label: 'ทุกรุ่น' },
              { id: 'รุ่น A', label: 'รุ่น A' },
              { id: 'รุ่น B', label: 'รุ่น B' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  categoryFilter === tab.id
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Group Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'all', label: 'ทุกกลุ่ม' },
              { id: 'A', label: 'กลุ่ม A' },
              { id: 'B', label: 'กลุ่ม B' },
              { id: 'C', label: 'กลุ่ม C' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setGroupFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  groupFilter === tab.id
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสโมสร, จังหวัด, หรือโค้ช..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 text-slate-400">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">ไม่พบทีมที่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      )}

    </div>
  );
}
