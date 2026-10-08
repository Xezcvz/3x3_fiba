import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { categoryLabel } from '../../utils/category-label';
import {
  getMatches,
  getTeams,
  createMatch,
  updateMatch,
  deleteMatch,
  resetMatchScores,
  resetAllMatches,
  seedTournament24,
} from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { useModal } from '../../context/ModalContext';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Clock,
  MapPin,
  ArrowLeft,
  Activity,
  RotateCcw,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

export default function ManageMatches() {
  const { confirm, alert: showAlert } = useModal();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const editQueryHandledRef = useRef(false);

  // Reset Menu State
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [resetting, setResetting] = useState(false);
  const resetMenuRef = useRef(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState(null);

  // Form Fields
  const [category, setCategory] = useState('รุ่น A');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [venue, setVenue] = useState('สนาม 1');
  const [status, setStatus] = useState('upcoming');
  const [round, setRound] = useState('รอบแบ่งกลุ่ม กลุ่ม A');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  // Table Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const eligibleTeams = teams.filter((team) => team.category === category);

  // 3x3 Match Stats
  const [onePtHome, setOnePtHome] = useState('');
  const [onePtAway, setOnePtAway] = useState('');
  const [twoPtHome, setTwoPtHome] = useState('');
  const [twoPtAway, setTwoPtAway] = useState('');
  const [foulsHome, setFoulsHome] = useState('');
  const [foulsAway, setFoulsAway] = useState('');
  const [winReason, setWinReason] = useState('21pts'); // 21pts | 10min | overtime

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [matchesRes, teamsRes] = await Promise.all([
        getMatches(),
        getTeams(),
      ]);
      setMatches(matchesRes.data);
      setTeams(teamsRes.data);
      setLoadError('');

      // Check if `?edit=id` is in query string
      const editId = searchParams.get('edit');
      if (editId && !editQueryHandledRef.current) {
        editQueryHandledRef.current = true;
        const found = matchesRes.data.find((m) => m.id === parseInt(editId, 10));
        if (found) {
          openEditModal(found);
        }
      }
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.data?.message || 'โหลดข้อมูลการแข่งขันไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentMatchId(null);
    const eligible = teams.filter((team) => team.category === 'รุ่น A');
    setHomeTeamId(eligible[0]?.id || '');
    setAwayTeamId(eligible[1]?.id || '');
    // Default to tomorrow 18:00 in ISO format local
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const localDateTime = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000);
    setMatchDate(localDateTime.toISOString().slice(0, 16));
    setCategory('รุ่น A');
    setVenue('สนาม 1');
    setStatus('upcoming');
    setRound('รอบแบ่งกลุ่ม กลุ่ม A');
    setHomeScore('');
    setAwayScore('');
    setOnePtHome(''); setOnePtAway('');
    setTwoPtHome(''); setTwoPtAway('');
    setFoulsHome(''); setFoulsAway('');
    setWinReason('21pts');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (match) => {
    setIsEditing(true);
    setCurrentMatchId(match.id);
    setHomeTeamId(match.homeTeamId);
    setAwayTeamId(match.awayTeamId);

    // Format matchDate for datetime-local input
    const d = new Date(match.matchDate);
    const pad = (n) => String(n).padStart(2, '0');
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setMatchDate(localIso);

    setCategory(match.category || 'รุ่น A');
    setVenue(match.venue || 'สนาม 1');
    setStatus(match.status || 'upcoming');
    setRound(match.round || 'รอบแบ่งกลุ่ม กลุ่ม A');
    setHomeScore(match.homeScore !== null ? match.homeScore : '');
    setAwayScore(match.awayScore !== null ? match.awayScore : '');

    const q = match.quarterScoresObj || {};
    setOnePtHome(q.onePtHome ?? ''); setOnePtAway(q.onePtAway ?? '');
    setTwoPtHome(q.twoPtHome ?? ''); setTwoPtAway(q.twoPtAway ?? '');
    setFoulsHome(q.foulsHome ?? ''); setFoulsAway(q.foulsAway ?? '');
    setWinReason(q.winReason || '21pts');

    setFormError('');
    setIsModalOpen(true);
  };

  const handleCalculate3x3 = () => {
    // 3x3 score = 1-point shots + (2-point shots * 2)
    const h = (Number(onePtHome) || 0) + ((Number(twoPtHome) || 0) * 2);
    const a = (Number(onePtAway) || 0) + ((Number(twoPtAway) || 0) * 2);
    if (onePtHome !== '' || twoPtHome !== '') setHomeScore(h);
    if (onePtAway !== '' || twoPtAway !== '') setAwayScore(a);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!homeTeamId || !awayTeamId) {
      setFormError('กรุณาเลือกทีมเจ้าบ้านและทีมเยือน');
      return;
    }
    if (Number(homeTeamId) === Number(awayTeamId)) {
      setFormError('ทีมเหย้าและทีมเยือนต้องไม่ใช่ทีมเดียวกัน');
      return;
    }

    const selectedHomeTeam = teams.find((team) => team.id === Number(homeTeamId));
    const selectedAwayTeam = teams.find((team) => team.id === Number(awayTeamId));
    if (round.includes('รอบแบ่งกลุ่ม') && selectedHomeTeam?.group !== selectedAwayTeam?.group) {
      setFormError('แมตช์รอบแบ่งกลุ่มต้องเลือกทีมจากกลุ่มเดียวกัน');
      return;
    }
    const hasBreakdown = [onePtHome, onePtAway, twoPtHome, twoPtAway].some((value) => value !== '');
    if (status === 'upcoming' && (homeScore !== '' || awayScore !== '' || hasBreakdown)) {
      setFormError('แมตช์ที่ยังไม่เริ่มต้องไม่มีคะแนน กรุณาลบคะแนนหรือเปลี่ยนสถานะแมตช์');
      return;
    }
    if (status === 'live' && (homeScore === '' || awayScore === '')) {
      setFormError('แมตช์สดต้องใส่คะแนนทั้งสองทีมก่อนบันทึก');
      return;
    }
    if (status === 'finished' && (homeScore === '' || awayScore === '') && !hasBreakdown) {
      setFormError('แมตช์ที่จบแล้วต้องใส่คะแนนทั้งสองทีม หรือกรอกรายละเอียดแต้ม 1/2 คะแนน');
      return;
    }
    if (hasBreakdown && [onePtHome, onePtAway, twoPtHome, twoPtAway].some((value) => value === '')) {
      setFormError('กรุณากรอกรายละเอียดแต้ม 1 และ 2 คะแนนให้ครบทั้งสองทีม หรือเว้นว่างทั้งหมด');
      return;
    }

    const derivedHomeScore = hasBreakdown ? Number(onePtHome) + Number(twoPtHome) * 2 : null;
    const derivedAwayScore = hasBreakdown ? Number(onePtAway) + Number(twoPtAway) * 2 : null;
    if (hasBreakdown && homeScore !== '' && Number(homeScore) !== derivedHomeScore) {
      setFormError(`คะแนนทีมเจ้าบ้านไม่ตรงกับรายละเอียดแต้ม (${derivedHomeScore} แต้ม)`);
      return;
    }
    if (hasBreakdown && awayScore !== '' && Number(awayScore) !== derivedAwayScore) {
      setFormError(`คะแนนทีมเยือนไม่ตรงกับรายละเอียดแต้ม (${derivedAwayScore} แต้ม)`);
      return;
    }
    if (status === 'finished' && Number(homeScore || derivedHomeScore) === Number(awayScore || derivedAwayScore)) {
      setFormError('แมตช์ 3×3 ที่จบแล้วต้องมีผู้ชนะ คะแนนทั้งสองทีมจึงห้ามเสมอกัน');
      return;
    }

    setSaving(true);
    const statsData = {
      onePtHome: onePtHome !== '' ? Number(onePtHome) : null,
      onePtAway: onePtAway !== '' ? Number(onePtAway) : null,
      twoPtHome: twoPtHome !== '' ? Number(twoPtHome) : null,
      twoPtAway: twoPtAway !== '' ? Number(twoPtAway) : null,
      foulsHome: foulsHome !== '' ? Number(foulsHome) : null,
      foulsAway: foulsAway !== '' ? Number(foulsAway) : null,
      winReason,
    };

    const payload = {
      homeTeamId: parseInt(homeTeamId, 10),
      awayTeamId: parseInt(awayTeamId, 10),
      category,
      matchDate,
      venue,
      status,
      round,
      homeScore: homeScore !== '' ? Number(homeScore) : (derivedHomeScore ?? null),
      awayScore: awayScore !== '' ? Number(awayScore) : (derivedAwayScore ?? null),
      quarterScores: statsData,
    };

    try {
      if (isEditing) {
        await updateMatch(currentMatchId, payload);
      } else {
        await createMatch(payload);
      }
      setIsModalOpen(false);
      setFormError('');
      if (searchParams.has('edit')) {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('edit');
        setSearchParams(nextSearchParams, { replace: true });
      }
      await fetchInitialData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (matchItem) => {
    const homeName = matchItem.homeTeam?.name || 'ทีมเจ้าบ้าน';
    const awayName = matchItem.awayTeam?.name || 'ทีมเยือน';
    
    const isConfirmed = await confirm({
      title: 'ยืนยันการลบแมตช์การแข่งขัน',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบแมตช์ระหว่าง:\n"${homeName}" VS "${awayName}"?\n\nข้อมูลและคะแนนที่บันทึกไว้จะถูกลบออกจากระบบอย่างถาวร`,
      confirmText: 'ลบแมตช์นี้',
      cancelText: 'ยกเลิก',
      type: 'danger',
    });

    if (isConfirmed) {
      try {
        await deleteMatch(matchItem.id);
        setMatches((prev) => prev.filter((m) => m.id !== matchItem.id));
        await showAlert({
          title: 'ลบสำเร็จ',
          message: 'ลบข้อมูลแมตช์การแข่งขันเรียบร้อยแล้ว',
          type: 'success',
        });
      } catch (err) {
        await showAlert({
          title: 'เกิดข้อผิดพลาด',
          message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบแมตช์',
          type: 'error',
        });
      }
    }
  };

  // Close reset menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resetMenuRef.current && !resetMenuRef.current.contains(e.target)) {
        setShowResetMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset Handlers
  const handleResetScores = async () => {
    const targetText = categoryFilter === 'all' ? 'ทุกรุ่น (24 ทีม)' : categoryFilter;
    const isConfirmed = await confirm({
      title: '🔄 ยืนยันรีเซ็ตผลคะแนนการแข่งขัน',
      message: `คุณต้องการรีเซ็ตผลคะแนนของ [${targetText}] ใช่หรือไม่?\n\n• คะแนนทุกแมตช์จะถูกล้างออก\n• สถานะจะกลับเป็น "เร็วๆ นี้" (upcoming)\n• ตารางแข่งขันและคู่แข่งขันยังคงอยู่เหมือนเดิม`,
      confirmText: 'รีเซ็ตคะแนน',
      cancelText: 'ยกเลิก',
      type: 'warning',
    });

    if (!isConfirmed) return;

    try {
      setResetting(true);
      const res = await resetMatchScores(categoryFilter);
      await showAlert({
        title: 'รีเซ็ตสำเร็จ',
        message: res.data?.message || 'รีเซ็ตผลคะแนนเรียบร้อยแล้ว',
        type: 'success',
      });
      await fetchInitialData();
    } catch (err) {
      await showAlert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || 'ไม่สามารถรีเซ็ตผลคะแนนได้',
        type: 'error',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleResetAllMatches = async () => {
    const targetText = categoryFilter === 'all' ? 'ทุกรุ่น (24 ทีม)' : categoryFilter;
    const isConfirmed = await confirm({
      title: '⚠️ ยืนยันล้างตารางแข่งขันทั้งหมด',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบแมตช์ทั้งหมดของ [${targetText}]?\n\nการกระทำนี้จะลบตารางการแข่งขันและคะแนนทั้งหมดอย่างถาวร ไม่สามารถกู้คืนได้!`,
      confirmText: 'ล้างตารางแข่งขัน',
      cancelText: 'ยกเลิก',
      type: 'danger',
    });

    if (!isConfirmed) return;

    try {
      setResetting(true);
      const res = await resetAllMatches(categoryFilter);
      await showAlert({
        title: 'ล้างตารางสำเร็จ',
        message: res.data?.message || 'ล้างตารางแข่งขันเรียบร้อยแล้ว',
        type: 'success',
      });
      await fetchInitialData();
    } catch (err) {
      await showAlert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || 'ไม่สามารถล้างตารางแข่งขันได้',
        type: 'error',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleSeed24Schedule = async () => {
    const isConfirmed = await confirm({
      title: '⚡ สร้างตารางแข่งขัน 24 ทีมใหม่ (36 แมตช์)',
      message: 'ระบบจะสร้างทีมและตารางการแข่งขัน 24 ทีม (รุ่น A = 12 ทีม, รุ่น B = 12 ทีม) แบ่งกลุ่ม A, B, C กลุ่มละ 4 ทีม สลับสนาม 1 และสนาม 2 ครบทั้ง 36 แมตช์',
      confirmText: 'สร้างตารางแข่ง 24 ทีม',
      cancelText: 'ยกเลิก',
      type: 'info',
    });

    if (!isConfirmed) return;

    try {
      setResetting(true);
      const res = await seedTournament24();
      await showAlert({
        title: 'สำเร็จ 🎉',
        message: res.data?.message || 'สร้างตารางแข่งขัน 24 ทีมเรียบร้อยแล้ว',
        type: 'success',
      });
      await fetchInitialData();
    } catch (err) {
      await showAlert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || 'ไม่สามารถสร้างตารางแข่งขันได้',
        type: 'error',
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับไปแดชบอร์ด</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            จัดการตารางแข่งขันและอัปเดตผลคะแนน
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เพิ่มตารางแข่งขันใหม่ ปรับสถานะแมตช์สด (LIVE) และบันทึกสถิติการยิงแบบ 3×3
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Reset Dropdown */}
          <div className="relative" ref={resetMenuRef}>
            <button
              type="button"
              onClick={() => setShowResetMenu((prev) => !prev)}
              disabled={resetting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all border border-slate-200 shadow-xs disabled:opacity-50"
              title="ตัวเลือกรีเซ็ตตารางและคะแนน"
            >
              <RotateCcw className={`w-4 h-4 text-slate-600 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'กำลังประมวลผล...' : 'รีเซ็ต'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showResetMenu && (
              <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-fadeIn space-y-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">ตัวเลือกรีเซ็ตตารางแข่งขัน</p>
                  <p className="text-[11px] text-slate-500">
                    สำหรับ {categoryFilter === 'all' ? 'ทุกรุ่น (24 ทีม)' : categoryFilter}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetMenu(false);
                    handleResetScores();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-medium transition-colors flex items-start gap-2.5"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-800">รีเซ็ตเฉพาะผลคะแนน</span>
                    <span className="text-[11px] text-slate-500">
                      ล้างคะแนน ปรับสถานะเป็น &quot;เร็วๆ นี้&quot; ทุกแมตช์
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetMenu(false);
                    handleResetAllMatches();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-50 text-slate-700 hover:text-rose-800 text-xs font-medium transition-colors flex items-start gap-2.5"
                >
                  <Trash2 className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-rose-600">ล้างตารางแข่งขันทั้งหมด</span>
                    <span className="text-[11px] text-slate-500">
                      ลบแมตช์ทั้งหมดของ {categoryFilter === 'all' ? 'ทุกรุ่น' : categoryFilter}
                    </span>
                  </div>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setShowResetMenu(false);
                    handleSeed24Schedule();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 text-xs font-medium transition-colors flex items-start gap-2.5"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-indigo-700">สร้างตารางแข่ง 24 ทีมใหม่</span>
                    <span className="text-[11px] text-slate-500">สุ่มแบ่งกลุ่ม A, B, C ครบ 36 แมตช์ 2 สนาม</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md shadow-primary-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มแมตช์ใหม่</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs for Category & Court */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        {/* Division Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1">รุ่น:</span>
          {['all', 'รุ่น A', 'รุ่น B'].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === c
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c === 'all' ? 'ทุกรุ่น' : categoryLabel(c)}
            </button>
          ))}
        </div>

        {/* Court Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1">สนาม:</span>
          {['all', 'สนาม 1', 'สนาม 2'].map((v) => (
            <button
              key={v}
              onClick={() => setVenueFilter(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                venueFilter === v
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {v === 'all' ? 'ทุกสนาม (2 สนาม)' : v}
            </button>
          ))}
        </div>
      </div>

      {/* Matches Table Card */}
      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center justify-between gap-3 text-sm text-rose-800">
          <span>{loadError}</span>
          <button type="button" onClick={() => fetchInitialData()} className="font-bold underline">ลองอีกครั้ง</button>
        </div>
      )}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">วันและเวลา</th>
                <th className="py-3.5 px-4">รอบแข่งขัน</th>
                <th className="py-3.5 px-4">ทีมเจ้าบ้าน</th>
                <th className="py-3.5 px-4 text-center">ผลคะแนน</th>
                <th className="py-3.5 px-4">ทีมเยือน</th>
                <th className="py-3.5 px-4">สนามแข่งขัน</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && <tr><td colSpan="8" className="py-12 text-center text-slate-400">กำลังโหลดแมตช์…</td></tr>}
              {!loading && !loadError && matches
                .filter((m) => categoryFilter === 'all' || m.category === categoryFilter)
                .filter((m) => venueFilter === 'all' || (m.venue && m.venue.includes(venueFilter)))
                .map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                    {new Date(m.matchDate).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    {new Date(m.matchDate).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} น.
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                      {m.round}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {m.homeTeam?.name || 'TBD · ทีมเจ้าบ้าน'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-black text-slate-700 text-base">
                    {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : 'VS'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {m.awayTeam?.name || 'TBD · ทีมเยือน'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs truncate max-w-[150px]">
                    {m.venue}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(m)}
                        title="แก้ไข / บันทึกผลคะแนน"
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        title="ลบแมตช์"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Match */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-800">
                {isEditing ? 'แก้ไขการแข่งขัน / บันทึกผล' : 'เพิ่มโปรแกรมการแข่งขันใหม่'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Division (Category) */}
              <div className="bg-primary-50/50 p-3 rounded-2xl border border-primary-100">
                <label className="block text-xs font-bold text-primary-800 uppercase tracking-wider mb-1.5">
                  รุ่นการแข่งขัน (Division) *
                </label>
                <div className="flex gap-2">
                  {['รุ่น A', 'รุ่น B'].map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => {
                        setCategory(cat);
                        const nextTeams = teams.filter((team) => team.category === cat);
                        setHomeTeamId(nextTeams[0]?.id || '');
                        setAwayTeamId(nextTeams[1]?.id || '');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        category === cat
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                      }`}
                    >
                      {categoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ทีมเจ้าบ้าน (Home Team) *
                  </label>
                  <select
                    required
                    value={homeTeamId}
                    onChange={(e) => setHomeTeamId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
                  >
                    <option value="">เลือกทีมเจ้าบ้าน</option>
                    {eligibleTeams
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({categoryLabel(t.category)} กลุ่ม {t.group})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ทีมเยือน (Away Team) *
                  </label>
                  <select
                    required
                    value={awayTeamId}
                    onChange={(e) => setAwayTeamId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
                  >
                    <option value="">เลือกทีมเยือน</option>
                    {eligibleTeams
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({categoryLabel(t.category)} กลุ่ม {t.group})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Date, Time & Venue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    วันและเวลาแข่งขัน *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-medium"
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-amber-700">
                    ระบบจะเว้นช่วงให้คู่นี้อย่างน้อย 15 นาที: HTH x กินเส้นไรรามยอน กับ Hunter Hoop A และ Hae Chi กับ สุดสาครPT
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    สนามแข่งขัน (2 สนาม) *
                  </label>
                  <div className="flex gap-2">
                    {['สนาม 1', 'สนาม 2'].map((v) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => setVenue(v)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          venue === v
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {v} (Court)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status & Round */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    สถานะการแข่งขัน *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
                  >
                    <option value="upcoming">🔵 กำลังจะแข่ง (Upcoming)</option>
                    <option value="live">🟢 กำลังแข่งสด (LIVE)</option>
                    <option value="finished">⚪ จบการแข่งขันแล้ว (Finished)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    รอบการแข่งขัน (Round)
                  </label>
                  <input
                    type="text"
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-medium"
                    placeholder="เช่น รอบแบ่งกลุ่ม กลุ่ม A, รอบ 8 ทีม"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      'รอบแบ่งกลุ่ม กลุ่ม A',
                      'รอบแบ่งกลุ่ม กลุ่ม B',
                      'รอบแบ่งกลุ่ม กลุ่ม C',
                      'รอบ 8 ทีม',
                      'รอบรองชนะเลิศ',
                      'ชิงชนะเลิศ',
                      'ชิงอันดับ 3',
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setRound(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3x3 Score Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    คะแนนรวม (3×3 Final Score)
                  </span>
                  <button
                    type="button"
                    onClick={handleCalculate3x3}
                    className="text-[11px] text-primary-600 hover:text-primary-700 font-semibold underline"
                  >
                    คำนวณจากแต้ม 1pt + 2pt อัตโนมัติ
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">คะแนนทีมเจ้าบ้าน</label>
                    <input
                      type="number"
                      min="0"
                      value={homeScore}
                      onChange={(e) => setHomeScore(e.target.value)}
                      placeholder="เช่น 21"
                      className="w-full px-3.5 py-2 rounded-xl text-base font-bold bg-white border border-slate-200 focus:outline-none focus:border-primary-500 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">คะแนนทีมเยือน</label>
                    <input
                      type="number"
                      min="0"
                      value={awayScore}
                      onChange={(e) => setAwayScore(e.target.value)}
                      placeholder="เช่น 18"
                      className="w-full px-3.5 py-2 rounded-xl text-base font-bold bg-white border border-slate-200 focus:outline-none focus:border-primary-500 font-mono text-center"
                    />
                  </div>
                </div>

                {/* 3x3 Specific Breakdown Grid */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <label className="block text-xs font-bold text-slate-600">
                    สถิติการทำคะแนน 3×3 (FIBA 3x3 Breakdown):
                  </label>
                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="font-semibold text-slate-600 block mb-1">1 แต้ม (ในเส้น/ลูกโทษ)</span>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder="H"
                          value={onePtHome}
                          onChange={(e) => setOnePtHome(e.target.value)}
                          className="w-1/2 p-1.5 text-center bg-slate-50 border rounded font-mono text-xs"
                          title="แต้ม 1 คะแนนทีมเหย้า"
                        />
                        <input
                          type="number"
                          placeholder="A"
                          value={onePtAway}
                          onChange={(e) => setOnePtAway(e.target.value)}
                          className="w-1/2 p-1.5 text-center bg-slate-50 border rounded font-mono text-xs"
                          title="แต้ม 1 คะแนนทีมเยือน"
                        />
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="font-semibold text-slate-600 block mb-1">2 แต้ม (นอกเส้นอาร์ค)</span>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder="H"
                          value={twoPtHome}
                          onChange={(e) => setTwoPtHome(e.target.value)}
                          className="w-1/2 p-1.5 text-center bg-slate-50 border rounded font-mono text-xs"
                          title="แต้ม 2 คะแนนทีมเหย้า"
                        />
                        <input
                          type="number"
                          placeholder="A"
                          value={twoPtAway}
                          onChange={(e) => setTwoPtAway(e.target.value)}
                          className="w-1/2 p-1.5 text-center bg-slate-50 border rounded font-mono text-xs"
                          title="แต้ม 2 คะแนนทีมเยือน"
                        />
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                      <span className="font-semibold text-slate-600 block mb-1">ฟาวล์ทีม (Team Fouls)</span>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder="H"
                          value={foulsHome}
                          onChange={(e) => setFoulsHome(e.target.value)}
                          className="w-1/2 p-1.5 text-center bg-slate-50 border rounded font-mono text-xs"
                          title="ฟาวล์ทีมเหย้า (7+ ยิงโทษ 2 ลูก)"
                        />
                        <input
                          type="number"
                          placeholder="A"
                          value={foulsAway}
                          onChange={(e) => setFoulsAway(e.target.value)}
                          className="w-1/2 p-1.5 text-center bg-slate-50 border rounded font-mono text-xs"
                          title="ฟาวล์ทีมเยือน (7+ ยิงโทษ 2 ลูก)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Win Condition Select */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">เงื่อนไขการจบเกม:</span>
                    <select
                      value={winReason}
                      onChange={(e) => setWinReason(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-medium"
                    >
                      <option value="21pts">⚡ ชนะด้วย 21 แต้มก่อน (Sudden Death)</option>
                      <option value="10min">⏱️ หมดเวลาแข่งขัน 10 นาที</option>
                      <option value="overtime">🔥 ต่อเวลาพิเศษ (Overtime ชนะ 2 แต้ม)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="sticky bottom-0 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 mt-2 px-6 sm:px-8 pb-6 sm:pb-8 pt-4 bg-white/95 backdrop-blur border-t border-slate-100">
                {formError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-800"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-500/25 transition-all disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างแมตช์'}
                </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
