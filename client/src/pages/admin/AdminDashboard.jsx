import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getMatches } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import ApiErrorNotice from '../../components/ApiErrorNotice';
import useLiveUpdates from '../../hooks/useLiveUpdates';
import {
  Shield,
  Users,
  Calendar,
  Award,
  Newspaper,
  Activity,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Shuffle,
} from 'lucide-react';

export default function AdminDashboard() {
  const { admin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchDashboardData = async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      const [statsRes, matchesRes] = await Promise.all([
        getStats(),
        getMatches({ limit: 5 }),
      ]);
      setStats(statsRes.data);
      setRecentMatches(matchesRes.data);
      setLoadError(false);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);
  useLiveUpdates(() => fetchDashboardData({ showLoading: false }));

  return (
    <div className="space-y-8 pb-16">
      {loadError && <ApiErrorNotice onRetry={() => fetchDashboardData()} />}
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-primary-500/15 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>แผงควบคุมระบบ (Administrator Portal)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ยินดีต้อนรับ, {admin?.name || admin?.username || 'ผู้ดูแลระบบ'}
          </h1>
          <p className="text-sm text-primary-100 mt-1 max-w-xl">
            จัดการการแข่งขันแบบครบวงจร ตั้งแต่ข้อมูลทีม โปรแกรมแข่งขัน รายงานคะแนนสด ไปจนถึงข่าวสารประชาสัมพันธ์
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/admin/matches"
            className="px-4 py-2.5 bg-white text-primary-700 hover:bg-primary-50 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>จัดการตารางแข่ง</span>
          </Link>
          <Link
            to="/admin/teams"
            className="px-4 py-2.5 bg-primary-800/80 hover:bg-primary-800 text-white rounded-xl text-xs sm:text-sm font-semibold border border-primary-400/30 transition-all flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>จัดการทีม</span>
          </Link>
          <Link
            to="/admin/draw"
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5"
          >
            <Shuffle className="w-4 h-4" />
            <span>จัดสาย</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">ทีมทั้งหมด</span>
            <span className="block text-2xl font-black text-slate-800 mt-0.5">
              {stats?.teamCount ?? '-'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">กำลังแข่งสด</span>
            <span className="block text-2xl font-black text-emerald-600 mt-0.5">
              {stats?.liveMatches ?? '-'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">แมตช์ทั้งหมด</span>
            <span className="block text-2xl font-black text-slate-800 mt-0.5">
              {stats?.totalMatches ?? '-'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">ข่าวประชาสัมพันธ์</span>
            <span className="block text-2xl font-black text-slate-800 mt-0.5">
              {stats?.newsCount ?? '-'}
            </span>
          </div>
        </div>

      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <Link
          to="/admin/matches"
          className="group p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800 group-hover:text-primary-600 transition-colors">
              ตารางแข่ง & ผลคะแนน 3×3
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              เพิ่มตารางแข่ง อัปเดตคะแนนสด 3×3 (1pt/2pt, ฟาวล์ทีม) และบันทึกผลการแข่งขัน
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary-600">
            <span>จัดการแมตช์</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/draw"
          className="group p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Shuffle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800 group-hover:text-indigo-600 transition-colors">
              ระบบจัดสาย & ผังแข่ง
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              สุ่มจับสายอัตโนมัติ (Auto Draw), สลับทีมเอง (Manual), และดูผังทัวร์นาเมนต์
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
            <span>จัดสายแข่งขัน</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/teams"
          className="group p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800 group-hover:text-primary-600 transition-colors">
              จัดการทีม 3×3
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              เพิ่มทีมบาส 3×3 กำหนดสาย (สาย A/B) ใส่โลโก้ ผู้ฝึกสอน และข้อมูลทีม
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary-600">
            <span>จัดการทีม</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/news"
          className="group p-5 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Newspaper className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-800 group-hover:text-primary-600 transition-colors">
              ข่าวสารและประกาศ
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              เผยแพร่ข่าวสาร คำประกาศจากฝ่ายจัดการแข่งขัน กฎระเบียบ และผลการแข่งขัน
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary-600">
            <span>จัดการข่าว</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

      </div>

      {/* Recent Matches Management Snapshot */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              แมตช์การแข่งขันล่าสุดในระบบ
            </h2>
            <p className="text-xs text-slate-400">ตรวจสอบและอัปเดตผลคะแนนแบบรวดเร็ว</p>
          </div>
          <Link
            to="/admin/matches"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            ดูทั้งหมด
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">วัน-เวลา</th>
                <th className="py-3 px-4">รอบ / สาย</th>
                <th className="py-3 px-4">ทีมเหย้า vs ทีมเยือน</th>
                <th className="py-3 px-4 text-center">สกอร์</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentMatches.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-xs">
                    {new Date(m.matchDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">{m.round}</td>
                  <td className="py-3 px-4 text-slate-800">
                    <span className="font-semibold">{m.homeTeam?.name}</span>
                    <span className="text-slate-400 mx-2">vs</span>
                    <span className="font-semibold">{m.awayTeam?.name}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                    {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/admin/matches?edit=${m.id}`}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      แก้ไข
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
