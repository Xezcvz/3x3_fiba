import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMatches, getNews, getTeams, getStats } from '../services/api';
import MatchCard from '../components/MatchCard';
import NewsCard from '../components/NewsCard';
import StatusBadge from '../components/StatusBadge';
import ApiErrorNotice from '../components/ApiErrorNotice';
import useLiveUpdates from '../hooks/useLiveUpdates';
import {
  Trophy,
  Flame,
  Calendar,
  Award,
  ChevronRight,
  TrendingUp,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function Home() {
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchData = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const [liveRes, upcomingRes, resultsRes, newsRes, teamsRes, statsRes] = await Promise.all([
        getMatches({ status: 'live' }),
        getMatches({ status: 'upcoming', limit: 4 }),
        getMatches({ status: 'finished', limit: 4 }),
        getNews({ limit: 3 }),
        getTeams(),
        getStats(),
      ]);

      setLiveMatches(liveRes.data);
      setUpcomingMatches(upcomingRes.data);
      setRecentResults(resultsRes.data);
      setNewsList(newsRes.data);
      setTeams(teamsRes.data);
      setStats(statsRes.data);
      setLoadError(false);
    } catch (err) {
      console.error('Error fetching home data:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useLiveUpdates(() => fetchData({ showLoading: false }));

  const getGroupTeams = (group) => teams
    .filter((team) => team.category === 'รุ่น A' && team.group === group)
    .sort((a, b) => (b.stats?.pts || 0) - (a.stats?.pts || 0) || (b.stats?.diff || 0) - (a.stats?.diff || 0))
    .slice(0, 4);

  return (
    <div className="space-y-12 pb-16">

      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-900 text-white shadow-xl shadow-primary-500/15">
        {/* Abstract background graphics */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-primary-400/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-20 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 py-12 sm:py-16 lg:py-20 flex flex-col lg:flex-row items-center justify-between gap-10">

          <div className="max-w-2xl space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-primary-100 text-xs font-semibold border border-white/20">
              <Flame className="w-4 h-4 text-amber-300" />
              <span>NVC 3×3 Basketball Club • อัปเดตผลทุกแมตช์แบบเรียลไทม์</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight sm:leading-snug">
              NVC 3×3 Basketball
              <span className="block text-primary-200 mt-1">Club Tournament</span>
            </h1>

            <p className="text-sm sm:text-base text-primary-100 max-w-xl leading-relaxed">
              ติดตามตารางแข่งขัน ผลคะแนนสดแบบเรียลไทม์ และตารางคะแนน · กติกา FIBA 3×3 ชนะเมื่อทำได้ 21 แต้ม หรือหมดเวลา 10 นาที
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to="/schedule"
                className="px-6 py-3 rounded-xl bg-white text-primary-700 font-bold text-sm shadow-md hover:bg-primary-50 hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>ดูตารางแข่งขัน</span>
              </Link>
              <Link
                to="/results"
                className="px-6 py-3 rounded-xl bg-primary-800/80 hover:bg-primary-800 text-white font-semibold text-sm border border-primary-400/30 transition-all flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>ผลการแข่งขัน & ตารางคะแนน</span>
              </Link>
            </div>
          </div>

          {/* Quick tournament stats counter — synced with real API */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full sm:w-auto flex-shrink-0">

            {/* Tile 1: Total teams (real from API) */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 text-center">
              {stats === null ? (
                <span className="block text-3xl sm:text-4xl font-black opacity-50 animate-pulse">—</span>
              ) : (
                <span className="block text-3xl sm:text-4xl font-black">{stats.teamCount}</span>
              )}
              <span className="text-xs text-primary-100 font-medium mt-1">ทีมร่วมชิงชัย</span>
            </div>

            {/* Tile 2: Number of groups (distinct from team data) */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 text-center">
              {teams.length === 0 ? (
                <span className="block text-3xl sm:text-4xl font-black opacity-50 animate-pulse">—</span>
              ) : (
                <span className="block text-3xl sm:text-4xl font-black">
                  {[...new Set(teams.map((t) => t.group).filter(Boolean))].length}
                </span>
              )}
              <span className="text-xs text-primary-100 font-medium mt-1">
                สาย ({[...new Set(teams.map((t) => t.group).filter(Boolean))].sort().join(', ') || 'A & B'})
              </span>
            </div>

            {/* Tile 3: Live matches count (real from API) */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 text-center">
              {stats === null ? (
                <span className="block text-3xl sm:text-4xl font-black opacity-50 animate-pulse">—</span>
              ) : stats.liveMatches > 0 ? (
                <span className="block text-3xl sm:text-4xl font-black text-emerald-300 animate-pulse">
                  {stats.liveMatches}
                </span>
              ) : (
                <span className="block text-3xl sm:text-4xl font-black">0</span>
              )}
              <span className="text-xs text-primary-100 font-medium mt-1">แมตช์กำลังแข่งสด</span>
            </div>

            {/* Tile 4: % matches completed (real from API) */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 text-center">
              {stats === null ? (
                <span className="block text-3xl sm:text-4xl font-black opacity-50 animate-pulse">—</span>
              ) : (
                <span className="block text-3xl sm:text-4xl font-black">
                  {stats.totalMatches > 0
                    ? `${Math.round((stats.finishedMatches / stats.totalMatches) * 100)}%`
                    : '0%'}
                </span>
              )}
              <span className="text-xs text-primary-100 font-medium mt-1">
                แมตช์แข่งจบแล้ว ({stats?.finishedMatches ?? '?'}/{stats?.totalMatches ?? '?'})
              </span>
            </div>

          </div>

        </div>
      </section>

      {loadError && <ApiErrorNotice onRetry={() => fetchData()} />}

      {/* 2. Live Matches Spotlight (If any match is live) */}
      {liveMatches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse-dot" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                กำลังแข่งขันสด (LIVE MATCH)
              </h2>
            </div>
            <Link to="/results" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              <span>ดูตารางผลทั้งหมด</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {liveMatches.map((m) => (
              <div key={m.id} className="relative rounded-2xl border-2 border-emerald-400 bg-white shadow-md overflow-hidden">
                <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    กำลังแข่งขันสดในคอร์ต
                  </span>
                  <span>{m.round}</span>
                </div>
                <MatchCard match={m} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Upcoming Matches Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary-600" />
              <span>แมตช์การแข่งขันเร็วๆ นี้</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">ตารางนัดถัดไปที่คุณไม่ควรพลาด</p>
          </div>
          <Link
            to="/schedule"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3.5 py-2 rounded-xl transition-colors"
          >
            <span>ดูตารางทั้งหมด</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : loadError ? null : upcomingMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400">
            ยังไม่มีแมตช์เร็วๆ นี้
          </div>
        )}
      </section>

      {/* 4. Latest Results and Standings Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Results Col (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-6 h-6 text-primary-600" />
              <span>ผลการแข่งขันล่าสุด</span>
            </h2>
            <Link to="/results" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              <span>ผลทั้งหมด</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loadError ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {recentResults.slice(0, 4).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Standings Snippet (1 span) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <span>ตารางคะแนนย่อ</span>
            </h2>
            <Link to="/results" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
              ดูเต็ม
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <p className="text-xs font-bold text-slate-500">รุ่น A · ชนะ / แพ้ / คะแนนจัดอันดับ</p>
            {['A', 'B', 'C'].map((group) => {
              const groupTeams = getGroupTeams(group);
              return (
                <div key={group} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <div className="text-xs font-bold text-primary-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>กลุ่ม {group}</span>
                    <span className="text-[10px] text-slate-400">ช / พ / แต้ม</span>
                  </div>
                  <div className="space-y-1.5">
                    {groupTeams.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-slate-400">ยังไม่มีทีมในกลุ่มนี้</p>
                    ) : groupTeams.map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-4 font-bold text-slate-400 text-center">{index + 1}</span>
                          <span className="font-semibold text-slate-700 truncate">{team.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono font-bold text-slate-600 flex-shrink-0">
                          <span className="text-emerald-600">{team.stats?.won ?? 0}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-500">{team.stats?.lost ?? 0}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{team.stats?.pts ?? 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <Link
              to="/teams"
              className="block text-center text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 py-2 rounded-xl transition-colors"
            >
              ดูสถิติทีมทั้งหมด
            </Link>
          </div>
        </div>

      </section>

      {/* 5. Tournament News Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              ข่าวสารและประกาศการแข่งขัน
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              อัปเดตข่าวสาร กฎระเบียบ และบรรยากาศการแข่งขันล่าสุด
            </p>
          </div>
          <Link
            to="/news"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            <span>อ่านข่าวทั้งหมด</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {newsList.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      </section>

    </div>
  );
}
