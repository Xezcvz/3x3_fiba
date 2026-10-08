import React, { useCallback, useEffect, useState } from 'react';
import { getMatches, getTeams } from '../services/api';
import MatchCard from '../components/MatchCard';
import ApiErrorNotice from '../components/ApiErrorNotice';
import useLiveUpdates from '../hooks/useLiveUpdates';
import { Award, Trophy, TrendingUp, Filter } from 'lucide-react';

export default function Results() {
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('รุ่น A');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchData = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const matchParams = { status: 'finished' };
      if (selectedCategory !== 'all') matchParams.category = selectedCategory;
      if (selectedGroup !== 'all') matchParams.group = selectedGroup;

      const teamParams = {};
      if (selectedCategory !== 'all') teamParams.category = selectedCategory;
      if (selectedGroup !== 'all') teamParams.group = selectedGroup;

      const [matchesRes, teamsRes] = await Promise.all([
        getMatches(matchParams),
        getTeams(teamParams),
      ]);

      setResults(matchesRes.data);
      setTeams(teamsRes.data);
      setLoadError(false);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedGroup]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useLiveUpdates(() => fetchData({ showLoading: false }));

  const groupKeys = ['A', 'B', 'C'].filter(
    (g) => selectedGroup === 'all' || selectedGroup === g
  );

  const getTeamsInGroup = (groupLetter, category) => {
    return teams
      .filter((team) => team.group === groupLetter && team.category === category)
      .sort((a, b) => (b.stats?.pts || 0) - (a.stats?.pts || 0) || (b.stats?.diff || 0) - (a.stats?.diff || 0));
  };

  const standingsGroups = (selectedCategory === 'all' ? ['รุ่น A', 'รุ่น B'] : [selectedCategory])
    .flatMap((category) => groupKeys.map((group) => ({ category, group })));

  const groupColors = {
    A: { header: 'from-blue-600 to-indigo-700', badge: 'bg-blue-100 text-blue-700' },
    B: { header: 'from-rose-600 to-red-700', badge: 'bg-rose-100 text-rose-700' },
    C: { header: 'from-emerald-600 to-teal-700', badge: 'bg-emerald-100 text-emerald-700' },
  };

  return (
    <div className="space-y-10 pb-16">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2.5 py-1 rounded-md mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>ผลการแข่งขัน & สถิติ 3×3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            สรุปผลการแข่งขันและตารางคะแนน
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            รายงานคะแนนย้อนหลัง สถิติ และอันดับคะแนนรอบแบ่งกลุ่ม 3 กลุ่ม (กลุ่มละ 4 ทีม)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Division (Category) Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'รุ่น A', label: 'รุ่น A (12 ทีม)' },
              { id: 'รุ่น B', label: 'รุ่น B (12 ทีม)' },
              { id: 'all', label: 'ทุกรุ่น' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Group Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'all', label: 'ทุกกลุ่ม' },
              { id: 'A', label: 'กลุ่ม A' },
              { id: 'B', label: 'กลุ่ม B' },
              { id: 'C', label: 'กลุ่ม C' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedGroup(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  selectedGroup === tab.id
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

      {loadError && <ApiErrorNotice onRetry={() => fetchData()} />}

      {/* Standings Tables Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-bold text-slate-800">
              ตารางคะแนนรอบแบ่งกลุ่ม ({selectedCategory})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            * อันดับ 1-2 และอันดับ 3 ที่ดีที่สุด 2 ทีม ได้สิทธิ์ผ่านเข้าสู่รอบ 8 ทีม
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {standingsGroups.map(({ category, group }) => {
            const groupTeams = getTeamsInGroup(group, category);
            const styling = groupColors[group] || { header: 'from-slate-700 to-slate-800' };

            return (
              <div key={`${category}-${group}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className={`px-5 py-3.5 bg-gradient-to-r ${styling.header} text-white flex items-center justify-between`}>
                  <span className="font-bold text-sm">{category} · กลุ่ม {group}</span>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-medium">
                    {loading ? 'กำลังโหลด…' : `${groupTeams.length} ทีม`}
                  </span>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3 text-center">#</th>
                        <th className="py-2.5 px-3">ทีม</th>
                        <th className="py-2.5 px-2 text-center">แข่ง</th>
                        <th className="py-2.5 px-2 text-center text-emerald-600">ชนะ</th>
                        <th className="py-2.5 px-2 text-center text-rose-500">แพ้</th>
                        <th className="py-2.5 px-2 text-center">+/-</th>
                        <th className="py-2.5 px-3 text-center font-bold text-primary-700">แต้ม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan="7" role="status" className="py-8 text-center text-slate-400 text-xs">
                            กำลังโหลดข้อมูลทีมและตารางคะแนน…
                          </td>
                        </tr>
                      ) : loadError ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-rose-500 text-xs">
                            โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่
                          </td>
                        </tr>
                      ) : groupTeams.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                            ยังไม่มีทีมในกลุ่ม {group}
                          </td>
                        </tr>
                      ) : (
                        groupTeams.map((team, idx) => (
                          <tr key={team.id} className={`hover:bg-primary-50/40 transition-colors ${idx < 2 ? 'bg-emerald-50/30' : ''}`}>
                            <td className="py-3 px-3 text-center font-bold text-slate-500">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] ${
                                idx === 0 ? 'bg-amber-400 text-slate-900 font-black' : idx === 1 ? 'bg-slate-200 text-slate-700 font-bold' : 'text-slate-400'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                                {team.logoUrl ? (
                                  <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-primary-100 text-primary-600 text-[10px] font-bold flex items-center justify-center">
                                    {team.name.substring(0, 2)}
                                  </div>
                                )}
                              </div>
                              <span className="truncate max-w-[100px] sm:max-w-none text-xs">{team.name}</span>
                            </td>
                            <td className="py-3 px-2 text-center text-slate-600 font-medium">{team.stats?.played || 0}</td>
                            <td className="py-3 px-2 text-center font-bold text-emerald-600">{team.stats?.won || 0}</td>
                            <td className="py-3 px-2 text-center font-bold text-rose-500">{team.stats?.lost || 0}</td>
                            <td className="py-3 px-2 text-center font-mono text-slate-500 text-xs">
                              {team.stats?.diff > 0 ? `+${team.stats.diff}` : team.stats?.diff || 0}
                            </td>
                            <td className="py-3 px-3 text-center font-black text-primary-700 bg-primary-50/50">
                              {team.stats?.pts || 0}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Finished Matches List */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-bold text-slate-800">ผลการแข่งขันทุกนัด</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {loading ? 'กำลังโหลดผลการแข่งขัน…' : `ทั้งหมด ${results.length} แมตช์`}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : loadError ? null : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {results.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400">
            ยังไม่มีผลการแข่งขันที่จบลง
          </div>
        )}
      </section>

    </div>
  );
}
