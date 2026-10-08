import React, { useEffect, useState } from 'react';
import { getMatches, getTeams, getTournamentBracket } from '../services/api';
import { categoryLabel } from '../utils/category-label';
import MatchCard from '../components/MatchCard';
import FibaBracket from '../components/FibaBracket';
import ApiErrorNotice from '../components/ApiErrorNotice';
import useLiveUpdates from '../hooks/useLiveUpdates';
import { Calendar, Filter, Search, RotateCcw, Trophy, LayoutList, GitFork } from 'lucide-react';

export default function Schedule() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Active Division for FIBA Bracket & Filter: 'รุ่น A' | 'รุ่น B'
  const [activeCategory, setActiveCategory] = useState('รุ่น A');

  // View Mode: 'bracket' (FIBA Bracket) | 'list' (Match List)
  const [viewMode, setViewMode] = useState('bracket');

  // Filters
  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [groupFilter, setGroupFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTeams();
  }, [activeCategory]);

  useEffect(() => {
    fetchBracketData(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    fetchMatches();
  }, [activeCategory, statusFilter, groupFilter, venueFilter, teamFilter]);

  useLiveUpdates(() => Promise.all([
    fetchMatches({ showLoading: false }),
    fetchBracketData(activeCategory),
    fetchTeams(),
  ]));

  const fetchBracketData = async (cat = activeCategory) => {
    try {
      const res = await getTournamentBracket(cat);
      setBracketData(res.data);
      setLoadError(false);
    } catch (err) {
      console.error('Error fetching bracket:', err);
      setLoadError(true);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await getTeams({ category: activeCategory });
      setTeams(res.data);
      setLoadError(false);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    }
  };

  const fetchMatches = async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      const params = {};
      if (activeCategory && activeCategory !== 'all') params.category = activeCategory;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (groupFilter && groupFilter !== 'all') params.group = groupFilter;
      if (venueFilter && venueFilter !== 'all') params.venue = venueFilter;
      if (teamFilter) params.teamId = teamFilter;

      const res = await getMatches(params);
      setMatches(res.data);
      setLoadError(false);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // Filter with client search query
  const filteredMatches = matches.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const homeName = m.homeTeam?.name?.toLowerCase() || '';
    const awayName = m.awayTeam?.name?.toLowerCase() || '';
    const venue = m.venue?.toLowerCase() || '';
    const round = m.round?.toLowerCase() || '';
    return homeName.includes(q) || awayName.includes(q) || venue.includes(q) || round.includes(q);
  });

  const resetFilters = () => {
    setStatusFilter('all');
    setGroupFilter('all');
    setTeamFilter('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2.5 py-1 rounded-md mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>ตารางการแข่งขัน & ผังทัวร์นาเมนต์</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            โปรแกรมและสายการแข่งขัน NVC 3×3
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ดูผังสายโยงทัวร์นาเมนต์สไตล์ FIBA 3×3 หรือเลือกดูตารางแข่งขันรายแมตช์
          </p>
        </div>

        {/* View Mode Toggle (Bracket vs List) */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl self-start md:self-center border border-slate-200/60 shadow-xs">
          <button
            onClick={() => setViewMode('bracket')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              viewMode === 'bracket'
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md shadow-primary-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>🏆 สายโยง FIBA (Bracket)</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            <span>📋 รายการแมตช์ (List)</span>
          </button>
        </div>
      </div>

      {loadError && <ApiErrorNotice onRetry={() => Promise.all([
        fetchMatches(), fetchBracketData(activeCategory), fetchTeams(),
      ])} />}

      {/* Conditionally Render Bracket View or List View */}
      {viewMode === 'bracket' ? (
        <FibaBracket
          bracketData={bracketData}
          onRefresh={() => fetchBracketData(activeCategory)}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      ) : (
        <>
          {/* Status Filter Tabs & Division switcher */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
              {[
                { id: 'upcoming', label: 'เร็วๆ นี้' },
                { id: 'live', label: 'แข่งสด' },
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'finished', label: 'แข่งจบแล้ว' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    statusFilter === tab.id
                      ? 'bg-white text-primary-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Division Switcher in List View */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
              {['รุ่น A', 'รุ่น B', 'all'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    activeCategory === cat
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'ทุกรุ่น' : categoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อทีม หรือ สนาม..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>

              {/* Court Filter (2 Courts: สนาม 1 / สนาม 2) */}
              <div>
                <select
                  value={venueFilter}
                  onChange={(e) => setVenueFilter(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-700 font-semibold"
                >
                  <option value="all">📍 ทุกสนาม (2 สนาม)</option>
                  <option value="สนาม 1">🏟️ สนาม 1 (Court 1)</option>
                  <option value="สนาม 2">🏟️ สนาม 2 (Court 2)</option>
                </select>
              </div>

              {/* Group Filter (3 Groups: A, B, C) */}
              <div>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-700 font-medium"
                >
                  <option value="all">ทุกกลุ่ม (3 กลุ่ม)</option>
                  <option value="A">กลุ่ม A (Pool A)</option>
                  <option value="B">กลุ่ม B (Pool B)</option>
                  <option value="C">กลุ่ม C (Pool C)</option>
                </select>
              </div>

              {/* Team Filter */}
              <div>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-700 font-medium"
                >
                  <option value="">ทุกทีม ({teams.length} ทีม)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (กลุ่ม {t.group})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters */}
              <div className="flex items-center">
                <button
                  onClick={resetFilters}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>ล้างตัวกรอง</span>
                </button>
              </div>

        </div>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : loadError ? null : filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">ไม่พบตารางการแข่งขันตามเงื่อนไขที่เลือก</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            ลองปรับเปลี่ยนตัวกรอง หรือคลิก "ล้างตัวกรอง" เพื่อแสดงแมตช์ทั้งหมด
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl text-xs font-semibold hover:bg-primary-100 transition-colors"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}
      </>
      )}

    </div>
  );
}
