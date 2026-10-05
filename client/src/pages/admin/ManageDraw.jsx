import React, { useEffect, useState, useCallback } from 'react';
import { getTeams, getGroups, autoDraw, manualDraw, resetDraw, getTournamentBracket } from '../../services/api';
import FibaBracket from '../../components/FibaBracket';
import { useModal } from '../../context/ModalContext';
import {
  Shuffle,
  Users,
  Settings,
  RotateCcw,
  Save,
  ChevronRight,
  Trophy,
  Zap,
  Check,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';

// ─── Group color palette ───────────────────────────────────────────────────
const GROUP_COLORS = {
  A: { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', glow: 'shadow-blue-200' },
  B: { bg: 'bg-rose-500', light: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700', glow: 'shadow-rose-200' },
  C: { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', glow: 'shadow-emerald-200' },
  D: { bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', glow: 'shadow-amber-200' },
  E: { bg: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700', glow: 'shadow-purple-200' },
  F: { bg: 'bg-cyan-500', light: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700', glow: 'shadow-cyan-200' },
};
const getColor = (group) => GROUP_COLORS[group] || GROUP_COLORS.A;

// ─── TeamPill used in both modes ───────────────────────────────────────────
function TeamPill({ team, group, onRemove, onClick, compact = false }) {
  const c = getColor(group);
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${c.light} ${c.border} 
        transition-all duration-200 select-none
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
        ${compact ? 'text-xs' : 'text-sm'}`}
    >
      {team.logoUrl ? (
        <img src={team.logoUrl} alt={team.name} className={`rounded-full object-cover flex-shrink-0 ${compact ? 'w-5 h-5' : 'w-7 h-7'}`} />
      ) : (
        <div className={`rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${c.bg} ${compact ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-xs'}`}>
          {team.name.charAt(0)}
        </div>
      )}
      <span className={`font-semibold text-slate-700 truncate ${compact ? 'max-w-[80px]' : 'max-w-[120px]'}`}>{team.name}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(team.id); }}
          className="ml-auto text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
          title="ย้ายออกจากสาย"
        >✕</button>
      )}
    </div>
  );
}

// ─── Animated Draw Ball ────────────────────────────────────────────────────
function DrawAnimation({ isDrawing, onDone }) {
  const [frame, setFrame] = useState(0);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  useEffect(() => {
    if (!isDrawing) return;
    let count = 0;
    const interval = setInterval(() => {
      setFrame(count++);
      if (count > 18) { clearInterval(interval); onDone(); }
    }, 80);
    return () => clearInterval(interval);
  }, [isDrawing]);

  if (!isDrawing) return null;
  const letter = letters[frame % letters.length];
  const c = getColor(letter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="text-center space-y-6">
        <div className={`w-32 h-32 rounded-full ${c.bg} flex items-center justify-center text-white text-5xl font-black shadow-2xl
          animate-bounce transition-all duration-75 mx-auto`}>
          {letter}
        </div>
        <p className="text-white font-bold text-xl tracking-wide animate-pulse">กำลังจับสาย...</p>
      </div>
    </div>
  );
}

// ─── Visual Group Bracket ─────────────────────────────────────────────────
function GroupBracket({ groups }) {
  const groupKeys = Object.keys(groups).filter(k => k !== 'Unassigned').sort();
  if (groupKeys.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {groupKeys.map((g) => {
          const c = getColor(g);
          const teams = groups[g] || [];
          return (
            <div key={g} className={`rounded-2xl border-2 ${c.border} overflow-hidden shadow-lg ${c.glow}`}>
              {/* Group Header */}
              <div className={`${c.bg} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-white/80" />
                  <span className="font-extrabold text-white tracking-widest text-sm">สาย {g}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                  {teams.length} ทีม
                </span>
              </div>

              {/* Teams list */}
              <div className={`${c.light} p-3 space-y-2 min-h-[120px]`}>
                {teams.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">ยังไม่มีทีม</div>
                ) : (
                  teams.map((team, idx) => (
                    <div key={team.id} className="flex items-center gap-2.5 group">
                      {/* Seed number */}
                      <span className={`text-xs font-black w-5 h-5 rounded-full ${c.bg} text-white flex items-center justify-center flex-shrink-0`}>
                        {idx + 1}
                      </span>
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-6 h-6 rounded-full ${c.bg} text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0`}>
                          {team.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-slate-700 truncate">{team.name}</span>
                      {team.city && <span className="text-xs text-slate-400 hidden sm:block ml-auto truncate">{team.city}</span>}
                    </div>
                  ))
                )}
              </div>

              {/* VS connector lines between teams */}
              {teams.length >= 2 && (
                <div className={`border-t ${c.border} ${c.light} px-4 py-2`}>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>{Math.floor(teams.length * (teams.length - 1) / 2)} แมตช์ในสาย</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bracket connector visualization */}
      {groupKeys.length >= 2 && (
        <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-rose-500 to-emerald-500" />
          <h3 className="text-sm font-bold text-slate-600 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            แผนผังทัวร์นาเมนต์
          </h3>

          <div className="flex items-center justify-center gap-0 flex-wrap">
            {/* Group stage */}
            <div className="flex flex-col gap-3">
              {groupKeys.map((g) => {
                const c = getColor(g);
                return (
                  <div key={g} className={`px-4 py-2 rounded-lg ${c.bg} text-white font-bold text-sm w-24 text-center shadow-md`}>
                    สาย {g}
                  </div>
                );
              })}
            </div>

            {/* Arrow lines */}
            <div className="flex flex-col items-center px-2">
              {groupKeys.map((_, i) => (
                <div key={i} className="flex items-center h-10">
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              ))}
            </div>

            {/* Semifinal / Quarterfinal */}
            <div className="flex flex-col gap-3 justify-center">
              {Array.from({ length: Math.ceil(groupKeys.length / 2) }).map((_, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-amber-100 border-2 border-amber-300 text-amber-700 font-bold text-xs w-28 text-center">
                  รอบ {groupKeys.length <= 2 ? 'รองชนะเลิศ' : 'ก่อนรองฯ'}
                </div>
              ))}
            </div>

            <div className="px-2">
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>

            {/* Final */}
            <div className="flex flex-col items-center gap-2">
              <div className="px-4 py-3 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-white font-extrabold text-sm shadow-lg shadow-amber-200 text-center w-28">
                🏆 ชิงชนะเลิศ
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ManageDraw() {
  const { confirm, alert } = useModal();

  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawAnimDone, setDrawAnimDone] = useState(false);
  const [pendingDrawResult, setPendingDrawResult] = useState(null);
  const [bracketData, setBracketData] = useState(null);

  const [category, setCategory] = useState('รุ่น A');

  // Mode: 'view' | 'manual'
  const [mode, setMode] = useState('view');
  // groupCount for auto draw
  const [groupCount, setGroupCount] = useState(3);

  // Manual mode state: teamId -> group
  const [manualAssignments, setManualAssignments] = useState({});

  // ── Load current draw state ─────────────────────────────────────────────
  const loadData = useCallback(async (cat = category) => {
    try {
      setLoading(true);
      const [groupsRes, teamsRes, bracketRes] = await Promise.all([
        getGroups(),
        getTeams(),
        getTournamentBracket(cat),
      ]);
      setGroups(groupsRes.data.groups);
      setTeams(teamsRes.data);
      setBracketData(bracketRes.data);

      // Populate manual assignments from current data
      const init = {};
      teamsRes.data.forEach(t => { init[t.id] = t.group || ''; });
      setManualAssignments(init);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { loadData(category); }, [loadData, category]);

  // ── Auto Draw ──────────────────────────────────────────────────────────
  const handleAutoDraw = async () => {
    const ok = await confirm({
      title: `🎲 สุ่มจับสลากแบ่งสายอัตโนมัติ (${groupCount} สาย)`,
      message: `คุณต้องการสุ่มจัดสายให้กับ ${teams.length} ทีม ใช่หรือไม่?\n\nระบบจะสุ่มทีมเข้ากลุ่ม A, B, C อย่างยุติธรรมและโปร่งใส โดยข้อมูลสายเดิมจะถูกจัดสรรใหม่`,
      confirmText: '🎲 เริ่มสุ่มจับสายเลย!',
      cancelText: 'ยกเลิก',
      type: 'info',
    });
    if (!ok) return;

    setIsDrawing(true);
    setDrawAnimDone(false);

    try {
      const res = await autoDraw({ groupCount });
      setPendingDrawResult(res.data);
    } catch (err) {
      setIsDrawing(false);
      await alert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || err.message,
        type: 'error',
      });
    }
  };

  // Called when animation finishes
  const handleAnimDone = () => {
    setIsDrawing(false);
    if (pendingDrawResult) {
      setGroups(pendingDrawResult.groups);
      setTeams(pendingDrawResult.teams);
      const init = {};
      pendingDrawResult.teams.forEach(t => { init[t.id] = t.group || ''; });
      setManualAssignments(init);
      setPendingDrawResult(null);
    }
  };

  // ── Manual Save ────────────────────────────────────────────────────────
  const handleManualSave = async () => {
    const assignments = Object.entries(manualAssignments).map(([teamId, group]) => ({
      teamId: Number(teamId),
      group: group || null,
    }));
    try {
      setSaving(true);
      const res = await manualDraw(assignments);
      setGroups(res.data.groups);
      setTeams(res.data.teams);
      setMode('view');
      await alert({
        title: 'สำเร็จ',
        message: 'บันทึกการจัดสายเรียบร้อยแล้ว ✅',
        type: 'success',
      });
    } catch (err) {
      await alert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || err.message,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────
  const handleReset = async () => {
    const ok = await confirm({
      title: '🔄 ยืนยันการรีเซ็ตการจัดสายทั้งหมด',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตการจัดสาย?\nทีมทุกทีมจะกลับมาเป็นสถานะ "ไม่มีสาย" และข้อมูลการแบ่งกลุ่มจะถูกล้างออก',
      confirmText: 'ยืนยันรีเซ็ตสาย',
      cancelText: 'ยกเลิก',
      type: 'warning',
    });
    if (!ok) return;
    try {
      await resetDraw();
      await loadData();
      await alert({
        title: 'รีเซ็ตสำเร็จ',
        message: 'รีเซ็ตการจัดสายของทุกทีมเรียบร้อยแล้ว',
        type: 'success',
      });
    } catch (err) {
      await alert({
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || 'ไม่สามารถรีเซ็ตการจัดสายได้',
        type: 'error',
      });
    }
  };

  // ── Manual assignment helpers ──────────────────────────────────────────
  const groupLabels = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));

  const assignedGroups = {};
  groupLabels.forEach(g => { assignedGroups[g] = []; });
  const unassigned = [];

  teams.forEach(team => {
    const g = manualAssignments[team.id];
    if (g && assignedGroups[g]) assignedGroups[g].push(team);
    else unassigned.push(team);
  });

  const setTeamGroup = (teamId, group) => {
    setManualAssignments(prev => ({ ...prev, [teamId]: group }));
  };

  const hasAnyGroup = Object.keys(groups).some(k => k !== 'Unassigned' && groups[k]?.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DrawAnimation isDrawing={isDrawing} onDone={handleAnimDone} />

      <div className="space-y-8 pb-16">

        {/* ── Page Header ── */}
        <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-primary-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-2">
                <Shuffle className="w-3.5 h-3.5" />
                <span>ระบบจัดสายการแข่งขัน</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Group Draw</h1>
              <p className="text-sm text-primary-100 mt-1">
                {teams.length} ทีม · {hasAnyGroup
                  ? `จัดสายแล้ว (${Object.keys(groups).filter(k => k !== 'Unassigned').length} สาย)`
                  : 'ยังไม่ได้จับสาย'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              {mode === 'view' ? (
                <>
                  <button
                    onClick={() => setMode('manual')}
                    className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    จัดสายเอง
                  </button>
                  {hasAnyGroup && (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 bg-red-500/80 hover:bg-red-500 border border-red-400/30 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      รีเซ็ต
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setMode('view')}
                    className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleManualSave}
                    disabled={saving}
                    className="px-4 py-2.5 bg-white text-primary-700 hover:bg-primary-50 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-60"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    บันทึก
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── AUTO DRAW panel ── */}
        {mode === 'view' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-500" />
              จับสายอัตโนมัติ (Auto Draw)
            </h2>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">จำนวนสาย</label>
                <div className="flex gap-2">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setGroupCount(n)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm border-2 transition-all ${groupCount === n
                        ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed max-w-xs">
                ทีม {teams.length} ทีม จะถูกสุ่มเข้า {groupCount} สาย<br />
                ({Math.ceil(teams.length / groupCount)}–{Math.ceil(teams.length / groupCount)} ทีม/สาย)
              </div>
              <button
                onClick={handleAutoDraw}
                disabled={teams.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 
                  text-white rounded-xl font-bold text-sm shadow-md shadow-primary-200 transition-all flex items-center gap-2 
                  disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
              >
                <Sparkles className="w-4 h-4" />
                จับสายเดี๋ยวนี้!
              </button>
            </div>
          </div>
        )}

        {/* ── MANUAL mode ── */}
        {mode === 'manual' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                จัดสายด้วยตนเอง
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">จำนวนสาย:</span>
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setGroupCount(n)}
                    className={`w-8 h-8 rounded-lg font-bold text-xs border-2 transition-all ${groupCount === n
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Unassigned pool */}
              <div className="lg:col-span-2">
                <div className="rounded-xl border-2 border-dashed border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      ยังไม่ได้จัดสาย ({unassigned.length})
                    </span>
                  </div>
                  <div className="p-3 space-y-2 min-h-[200px] bg-white">
                    {unassigned.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-300 gap-2">
                        <Check className="w-8 h-8" />
                        <span className="text-xs font-medium">จัดสายครบทุกทีมแล้ว</span>
                      </div>
                    ) : (
                      unassigned.map(team => (
                        <div key={team.id} className="space-y-1">
                          <div className="text-[10px] text-slate-400 font-medium px-1">เลือกสายสำหรับ {team.name}</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-sm flex-1 min-w-0">
                              {team.logoUrl
                                ? <img src={team.logoUrl} alt={team.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-5 h-5 rounded-full bg-slate-300 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{team.name.charAt(0)}</div>
                              }
                              <span className="font-semibold text-slate-700 truncate text-xs">{team.name}</span>
                            </div>
                            {groupLabels.map(g => {
                              const c = getColor(g);
                              return (
                                <button
                                  key={g}
                                  onClick={() => setTeamGroup(team.id, g)}
                                  className={`w-7 h-7 rounded-lg font-bold text-xs transition-all ${c.bg} text-white hover:scale-110 shadow-sm`}
                                  title={`เข้าสาย ${g}`}
                                >
                                  {g}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Group columns */}
              <div className="lg:col-span-3 grid grid-cols-2 gap-3">
                {groupLabels.map(g => {
                  const c = getColor(g);
                  const teamsInGroup = assignedGroups[g] || [];
                  return (
                    <div key={g} className={`rounded-xl border-2 ${c.border} overflow-hidden`}>
                      <div className={`${c.bg} px-3 py-2 flex items-center justify-between`}>
                        <span className="font-extrabold text-white text-sm">สาย {g}</span>
                        <span className="text-xs text-white/80">{teamsInGroup.length} ทีม</span>
                      </div>
                      <div className={`${c.light} p-2 space-y-1.5 min-h-[140px]`}>
                        {teamsInGroup.length === 0 ? (
                          <div className="flex items-center justify-center h-20 text-slate-400 text-xs">
                            ลากหรือคลิกทีมเพื่อเพิ่ม
                          </div>
                        ) : (
                          teamsInGroup.map(team => (
                            <TeamPill
                              key={team.id}
                              team={team}
                              group={g}
                              compact
                              onRemove={(id) => setTeamGroup(id, '')}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Current Group Bracket ── */}
        {mode === 'view' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                {hasAnyGroup ? 'ผลการจัดสายปัจจุบัน' : 'ยังไม่ได้จัดสาย'}
              </h2>
              {hasAnyGroup && (
                <span className="text-xs text-slate-400 font-medium">
                  {teams.length} ทีม · {Object.keys(groups).filter(k => k !== 'Unassigned').length} สาย
                </span>
              )}
            </div>

            {hasAnyGroup ? (
              <GroupBracket groups={groups} />
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Shuffle className="w-8 h-8 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-600">ยังไม่มีการจัดสาย</p>
                  <p className="text-sm text-slate-400 mt-1">กดปุ่ม "จับสายเดี๋ยวนี้!" หรือ "จัดสายเอง" ด้านบน</p>
                </div>
              </div>
            )}

            {/* Unassigned teams warning */}
            {hasAnyGroup && groups['Unassigned']?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-amber-500 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-amber-700">มีทีมที่ยังไม่ได้จัดสาย ({groups['Unassigned'].length} ทีม)</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {groups['Unassigned'].map(t => t.name).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* FIBA 3x3 Tournament Bracket with Lines & Qualification */}
            <div className="pt-8 border-t border-slate-200">
              <FibaBracket
                bracketData={bracketData}
                onRefresh={() => loadData(category)}
                activeCategory={category}
                onCategoryChange={(newCat) => {
                  setCategory(newCat);
                  loadData(newCat);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
