import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTeamById } from '../services/api';
import MatchCard from '../components/MatchCard';
import ApiErrorNotice from '../components/ApiErrorNotice';
import useLiveUpdates from '../hooks/useLiveUpdates';
import { Shield, MapPin, User, ArrowLeft, Calendar, Award, Trophy, Info } from 'lucide-react';

export default function TeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchTeam = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getTeamById(id);
      setTeam(res.data);
      setLoadError(false);
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.status !== 404);
      if (err.response?.status === 404) setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useLiveUpdates(() => fetchTeam({ showLoading: false }));

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลทีม...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="py-20 text-center">
        {loadError ? <ApiErrorNotice onRetry={() => fetchTeam()} /> : <h2 className="text-xl font-bold text-slate-800">ไม่พบข้อมูลทีมนี้</h2>}
        <Link to="/teams" className="mt-4 inline-flex items-center gap-2 text-primary-600 font-semibold text-sm">
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้ารวมทีม</span>
        </Link>
      </div>
    );
  }

  const upcomingMatches = team.matches?.filter((m) => m.status === 'upcoming') || [];
  const finishedMatches = team.matches?.filter((m) => m.status === 'finished') || [];
  const liveMatches = team.matches?.filter((m) => m.status === 'live') || [];

  return (
    <div className="space-y-8 pb-16">
      
      {/* Back button */}
      <div>
        <Link
          to="/teams"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปรายชื่อทีมทั้งหมด</span>
        </Link>
      </div>

      {/* Team Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-primary-50 border-2 border-primary-100 flex-shrink-0 flex items-center justify-center p-2 shadow-sm overflow-hidden">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <Shield className="w-12 h-12 text-primary-600" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary-100 text-primary-700">
                สาย {team.group || 'A'}
              </span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {team.city || 'ประเทศไทย'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              {team.name}
            </h1>

            {team.description && (
              <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                {team.description}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600 font-medium">
              {team.coach && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <User className="w-3.5 h-3.5 text-primary-500" />
                  <span>หัวหน้าผู้ฝึกสอน: {team.coach}</span>
                </div>
              )}
              {team.city && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-primary-500" />
                  <span>ที่ตั้งสโมสร: {team.city}</span>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Live Matches if any */}
      {liveMatches.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span>แมตช์ที่กำลังแข่งขันสดขณะนี้</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Schedule */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            <span>โปรแกรมการแข่งขันของทีม</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">{upcomingMatches.length} แมตช์</span>
        </div>

        {upcomingMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcomingMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
            ไม่มีโปรแกรมนัดถัดไป
          </div>
        )}
      </section>

      {/* Finished Results */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            <span>ผลการแข่งขันที่ผ่านมา</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">{finishedMatches.length} แมตช์</span>
        </div>

        {finishedMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {finishedMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
            ยังไม่มีบันทึกผลการแข่งขันที่จบลง
          </div>
        )}
      </section>

    </div>
  );
}
