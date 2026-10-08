import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
  Zap,
  Shield,
  Layers,
  MapPin,
  Award,
  RotateCcw,
  Settings2,
  Save,
  X,
  AlertTriangle,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import {
  generateKnockout,
  advanceWinner,
  seedTournament24,
  resetKnockout,
  manualSeedKnockout,
} from '../services/api';

// ─── Helper: Derive expected QF pairings from standings ──────────────────────
// QF1: A1 vs Best3rd#2  (สนาม 1)
// QF2: B2 vs C2          (สนาม 2)
// ─── Helper: Derive expected QF pairings from standings ──────────────────────
// QF1: A1 vs Best3rd#2  (สนาม 1)
// QF2: B2 vs C2          (สนาม 2)
// QF3: B1 vs Best3rd#1  (สนาม 1)
// QF4: C1 vs A2          (สนาม 2)
function deriveExpectedSeeds(standings, thirdPlaceComparison, isGroupStageComplete) {
  // If group stage has NOT completed yet, do NOT link actual team names to QF placeholders!
  if (!isGroupStageComplete) {
    return {
      qf1: { home: null, away: null, venue: 'สนาม 1' },
      qf2: { home: null, away: null, venue: 'สนาม 2' },
      qf3: { home: null, away: null, venue: 'สนาม 1' },
      qf4: { home: null, away: null, venue: 'สนาม 2' },
    };
  }

  const a1 = standings['A']?.[0];
  const a2 = standings['A']?.[1];
  const b1 = standings['B']?.[0];
  const b2 = standings['B']?.[1];
  const c1 = standings['C']?.[0];
  const c2 = standings['C']?.[1];
  const best3rd1 = thirdPlaceComparison?.[0];
  const best3rd2 = thirdPlaceComparison?.[1];
  const thirdForQf1 = best3rd2?.group !== 'A' && best3rd1?.group !== 'B' ? best3rd2 : best3rd1;
  const thirdForQf3 = thirdForQf1?.id === best3rd1?.id ? best3rd2 : best3rd1;
  return {
    qf1: { home: a1, away: thirdForQf1, venue: 'สนาม 1' },
    qf2: { home: b2, away: c2, venue: 'สนาม 2' },
    qf3: { home: b1, away: thirdForQf3, venue: 'สนาม 1' },
    qf4: { home: c1, away: a2, venue: 'สนาม 2' },
  };
}

export default function FibaBracket({
  bracketData,
  onRefresh,
  activeCategory = 'รุ่น A',
  onCategoryChange,
}) {
  const { isAuthenticated } = useAuth();
  const { alert, confirm } = useModal();
  const [advancingId, setAdvancingId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [hoveredTeamId, setHoveredTeamId] = useState(null);

  // Manual seed modal
  const [showManualSeed, setShowManualSeed] = useState(false);
  const [manualSeeds, setManualSeeds] = useState({});
  const [savingSeeds, setSavingSeeds] = useState(false);

  const standings = bracketData?.standings || {};
  const thirdPlaceComparison = bracketData?.thirdPlaceComparison || [];
  const qualifiedTeams = bracketData?.qualifiedTeams || [];
  const bracket = bracketData?.bracket || { qf: [], sf: [], final: [], thirdPlace: [] };
  const groupStageStatus = bracketData?.groupStageStatus || {};

  // Group stage status
  const isGroupStageStarted =
    groupStageStatus.isStarted ??
    Object.values(standings).some((grp) => grp.some((t) => t.stats && t.stats.played > 0));

  const isGroupStageComplete =
    groupStageStatus.isComplete ??
    (qualifiedTeams.length >= 8 && isGroupStageStarted);

  // Derived: expected QF seed from standings (only populated if group stage completed)
  const expectedSeeds = useMemo(
    () => deriveExpectedSeeds(standings, thirdPlaceComparison, isGroupStageComplete),
    [standings, thirdPlaceComparison, isGroupStageComplete]
  );

  const hasKnockouts =
    bracket.qf.length > 0 ||
    bracket.sf.length > 0 ||
    bracket.final.length > 0 ||
    bracket.thirdPlace.length > 0;

  const canGenerateKnockout = qualifiedTeams.length >= 8;

  // ── Generate Knockout ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!canGenerateKnockout) {
      await alert({
        title: 'ยังไม่พร้อมสร้างรอบน็อกเอาต์',
        message: `มีทีมผ่านเข้ารอบ ${qualifiedTeams.length} ทีม (ต้องการ 8 ทีม)\nกรุณาบันทึกคะแนนรอบแบ่งกลุ่มให้ครบก่อน`,
        type: 'warning',
      });
      return;
    }
    const ok = await confirm({
      title: `สร้างรอบ 8 ทีม (QF) ของ ${activeCategory}?`,
      message: `ระบบจะคัดเลือก 8 ทีมที่เข้ารอบจากผลรอบแบ่งกลุ่ม:\n• แชมป์กลุ่ม A, B, C (3 ทีม)\n• รองแชมป์กลุ่ม A, B, C (3 ทีม)\n• อันดับ 3 ที่ดีที่สุด 2 ทีม\n\nแล้วจับคู่ QF 4 คู่ + SF 2 คู่ + ชิงชนะเลิศ + ชิงอันดับ 3 อัตโนมัติ`,
      confirmText: '✅ สร้างรอบ 8 ทีมทันที',
      type: 'warning',
    });
    if (!ok) return;
    try {
      setGenerating(true);
      const res = await generateKnockout(activeCategory);
      await alert({ title: 'สร้างรอบ 8 ทีมสำเร็จ! 🏆', message: res.data?.message, type: 'success' });
      if (onRefresh) onRefresh();
    } catch (err) {
      await alert({ title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'ไม่สามารถสร้างรอบน็อกเอาต์ได้', type: 'danger' });
    } finally {
      setGenerating(false);
    }
  };

  // ── Advance Winner ──────────────────────────────────────────────────────
  const handleAdvance = async (matchId) => {
    try {
      setAdvancingId(matchId);
      const res = await advanceWinner(matchId);
      await alert({ title: 'อัปเดตทีมเข้ารอบสำเร็จ! 🏆', message: res.data?.message, type: 'success' });
      if (onRefresh) onRefresh();
    } catch (err) {
      await alert({ title: 'ไม่สามารถเลื่อนทีมเข้ารอบได้', message: err.response?.data?.message || 'เกิดข้อผิดพลาด', type: 'danger' });
    } finally {
      setAdvancingId(null);
    }
  };

  // ── Reset Knockout ──────────────────────────────────────────────────────
  const handleReset = async () => {
    const hasCompletedKnockout = [...(bracketData?.bracket?.qf || []), ...(bracketData?.bracket?.sf || []), ...(bracketData?.bracket?.final || []), ...(bracketData?.bracket?.thirdPlace || [])]
      .some((match) => match.status === 'finished' || match.status === 'live');
    if (hasCompletedKnockout) {
      await alert({ title: 'ล้างรอบน็อกเอาต์ไม่ได้', message: 'มีแมตช์ที่กำลังแข่งหรือจบแล้ว กรุณาจัดการประวัติผลแข่งก่อน', type: 'danger' });
      return;
    }
    const ok = await confirm({
      title: `⚠️ รีเซ็ตรอบน็อกเอาต์ทั้งหมดของ ${activeCategory}?`,
      message: `จะลบแมตช์ QF, SF, ชิงชนะเลิศ และชิงอันดับ 3 ทั้งหมด\nการกระทำนี้ไม่สามารถย้อนกลับได้!`,
      confirmText: '🗑️ รีเซ็ตเลย',
      type: 'danger',
    });
    if (!ok) return;
    try {
      setResetting(true);
      const res = await resetKnockout(activeCategory);
      await alert({ title: 'รีเซ็ตสำเร็จ', message: res.data?.message, type: 'success' });
      if (onRefresh) onRefresh();
    } catch (err) {
      await alert({ title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'ไม่สามารถรีเซ็ตได้', type: 'danger' });
    } finally {
      setResetting(false);
    }
  };

  // ── Seed 24 Demo ────────────────────────────────────────────────────────
  const handleSeed24 = async () => {
    const ok = await confirm({
      title: 'โหลดโครงสร้างตัวอย่าง 24 ทีม (รุ่น A & รุ่น B)?',
      message: 'ระบบจะสร้างทีม 24 ทีม (รุ่น A = 12 ทีม, รุ่น B = 12 ทีม) พร้อมแบ่งกลุ่ม A, B, C กลุ่มละ 4 ทีม และสร้างตารางแข่งรอบแบ่งกลุ่ม 36 แมตช์',
      confirmText: 'โหลดข้อมูลตัวอย่าง',
      type: 'warning',
    });
    if (!ok) return;
    try {
      setSeeding(true);
      const res = await seedTournament24();
      await alert({ title: 'โหลดโครงสร้าง 24 ทีมสำเร็จ! 🎉', message: res.data?.message, type: 'success' });
      if (onRefresh) onRefresh();
    } catch (err) {
      await alert({ title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'ไม่สามารถสร้างตัวอย่างได้', type: 'danger' });
    } finally {
      setSeeding(false);
    }
  };

  // ── Manual Seed Modal ───────────────────────────────────────────────────
  const openManualSeed = () => {
    const init = {};
    ['qf1', 'qf2', 'qf3', 'qf4'].forEach((key, idx) => {
      const match = bracket.qf[idx];
      if (match) {
        init[`${key}_matchId`] = match.id;
        init[`${key}_home`] = match.homeTeam?.id || '';
        init[`${key}_away`] = match.awayTeam?.id || '';
      } else {
        const seed = expectedSeeds[key];
        init[`${key}_home`] = seed?.home?.id || '';
        init[`${key}_away`] = seed?.away?.id || '';
      }
    });
    setManualSeeds(init);
    setShowManualSeed(true);
  };

  const handleApplyRecommendedSeeds = () => {
    const updated = { ...manualSeeds };
    ['qf1', 'qf2', 'qf3', 'qf4'].forEach((key) => {
      const seed = expectedSeeds[key];
      if (seed?.home?.id) updated[`${key}_home`] = seed.home.id;
      if (seed?.away?.id) updated[`${key}_away`] = seed.away.id;
    });
    setManualSeeds(updated);
  };

  const handleSaveManualSeeds = async () => {
    // If knockout matches don't exist yet, generate them directly with the chosen seeds!
    if (bracket.qf.length === 0) {
      const seedPairs = ['qf1', 'qf2', 'qf3', 'qf4'].map((key) => ({
        homeTeamId: manualSeeds[`${key}_home`] ? Number(manualSeeds[`${key}_home`]) : null,
        awayTeamId: manualSeeds[`${key}_away`] ? Number(manualSeeds[`${key}_away`]) : null,
      }));

      const hasEmpty = seedPairs.some((p) => !p.homeTeamId || !p.awayTeamId);
      if (hasEmpty) {
        await alert({
          title: 'ข้อมูลไม่ครบถ้วน',
          message: 'กรุณาเลือกทีมเหย้าและทีมเยือนให้ครบทั้ง 4 คู่ (8 ทีม) เพื่อสร้างรอบ 8 ทีม',
          type: 'warning',
        });
        return;
      }

      try {
        setSavingSeeds(true);
        const res = await generateKnockout(activeCategory, seedPairs);
        await alert({ title: 'สร้างรอบ 8 ทีมสำเร็จ! 🏆', message: res.data?.message, type: 'success' });
        setShowManualSeed(false);
        if (onRefresh) onRefresh();
      } catch (err) {
        await alert({ title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'ไม่สามารถสร้างรอบ 8 ทีมได้', type: 'danger' });
      } finally {
        setSavingSeeds(false);
      }
      return;
    }

    // If knockout already exists, update match teams via manualSeedKnockout
    const seeds = ['qf1', 'qf2', 'qf3', 'qf4']
      .map((key, idx) => {
        const match = bracket.qf[idx];
        if (!match) return null;
        return {
          matchId: match.id,
          homeTeamId: manualSeeds[`${key}_home`] ? Number(manualSeeds[`${key}_home`]) : null,
          awayTeamId: manualSeeds[`${key}_away`] ? Number(manualSeeds[`${key}_away`]) : null,
        };
      })
      .filter(Boolean);

    try {
      setSavingSeeds(true);
      await manualSeedKnockout(activeCategory, seeds);
      await alert({ title: 'อัปเดต seed สำเร็จ! ✅', message: 'บันทึกการจัดทีมเข้ารอบ 8 ทีมเรียบร้อย', type: 'success' });
      setShowManualSeed(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      await alert({ title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'ไม่สามารถบันทึกได้', type: 'danger' });
    } finally {
      setSavingSeeds(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & DIVISION SWITCHER ── */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow accents */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-bold border border-primary-500/30">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>NVC 3×3 TOURNAMENT BRACKET • 24 TEAMS / 2 COURTS</span>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                เกมละ 10 นาที • สนาม 1 & สนาม 2
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              ผังสายโยงทัวร์นาเมนต์ {activeCategory}
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              รอบแบ่งกลุ่ม 3 กลุ่ม (A, B, C ละ 4 ทีม) · คัด <strong className="text-emerald-400">8 ทีมเข้ารอบ</strong> (แชมป์ 3 ทีม + รองแชมป์ 3 ทีม + <strong className="text-amber-400">อันดับ 3 ที่ดีที่สุด 2 ทีม</strong>) เข้าสู่รอบ 8 ทีม, รองชนะเลิศ และชิงแชมป์
            </p>
          </div>

          {/* Division Switcher & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Division Switcher Pills */}
            <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              {['รุ่น A', 'รุ่น B'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange && onCategoryChange(cat)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
                    activeCategory === cat
                      ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-lg shadow-primary-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{cat} (12 ทีม)</span>
                </button>
              ))}
            </div>

            {/* Admin Actions */}
            {isAuthenticated && (
              <div className="flex flex-wrap gap-2">
                {!hasKnockouts ? (
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className={`px-4 py-2.5 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      canGenerateKnockout
                        ? 'bg-gradient-to-r from-amber-500 to-primary-600 hover:from-amber-600 hover:to-primary-700 text-white'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                    title={canGenerateKnockout ? 'สร้างรอบ 8 ทีม' : `ต้องการ 8 ทีม (ตอนนี้ ${qualifiedTeams.length})`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{generating ? 'กำลังสร้าง...' : '⚡ สร้างรอบ 8 ทีม'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={openManualSeed}
                      className="px-3 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-xs rounded-xl border border-indigo-500/50 transition-all flex items-center gap-1.5"
                      title="กำหนดทีมใน QF ด้วยตนเอง"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>จัด Seed เอง</span>
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={resetting}
                      className="px-3 py-2.5 bg-red-600/80 hover:bg-red-600 text-white font-semibold text-xs rounded-xl border border-red-500/50 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      title="รีเซ็ตรอบน็อกเอาต์ทั้งหมด"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                      <span>{resetting ? 'กำลังรีเซ็ต...' : 'รีเซ็ต'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={handleSeed24}
                  disabled={seeding}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1"
                  title="สร้างข้อมูลจำลอง 24 ทีม"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{seeding ? 'กำลังโหลด...' : 'ตัวอย่าง 24 ทีม'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Manual Seed Modal ── */}
      {showManualSeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-600 to-primary-600 p-5 rounded-t-3xl flex items-center justify-between">
              <div>
                <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  กำหนด Seed รอบ 8 ทีม ({activeCategory})
                </h3>
                <p className="text-indigo-200 text-xs mt-0.5">เลือกทีมสำหรับแต่ละ QF slot ด้วยตนเอง</p>
              </div>
              <button onClick={() => setShowManualSeed(false)} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Standings summary & auto-fill button */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>8 ทีมที่ผ่านรอบแบ่งกลุ่ม (คำนวณอัตโนมัติ)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyRecommendedSeeds}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                    title="เติมทีมทั้ง 4 คู่ตามผลคะแนนรอบแบ่งกลุ่ม"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>เติมทีมตามผลกลุ่ม</span>
                  </button>
                </div>

                {qualifiedTeams.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {qualifiedTeams.map((t) => (
                      <span
                        key={t.id}
                        className="px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-700 font-semibold text-[11px] shadow-xs"
                      >
                        {t.seedLabel} {t.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    คะแนนรอบแบ่งกลุ่มยังไม่ครบถ้วน สามารถเลือกทีมด้วยตนเองได้
                  </p>
                )}
              </div>

              {/* 4 QF Pairings */}
              <div className="space-y-3">
                {[
                  { key: 'qf1', label: 'QF 1 (คู่ที่ 1)', venue: 'สนาม 1', exp: expectedSeeds.qf1 },
                  { key: 'qf2', label: 'QF 2 (คู่ที่ 2)', venue: 'สนาม 2', exp: expectedSeeds.qf2 },
                  { key: 'qf3', label: 'QF 3 (คู่ที่ 3)', venue: 'สนาม 1', exp: expectedSeeds.qf3 },
                  { key: 'qf4', label: 'QF 4 (คู่ที่ 4)', venue: 'สนาม 2', exp: expectedSeeds.qf4 },
                ].map(({ key, label, venue, exp }) => (
                  <div key={key} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                        {label}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <MapPin className="w-3 h-3" />
                        {venue}
                      </span>
                    </div>

                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
                      {['home', 'away'].map((side) => {
                        const expTeam = side === 'home' ? exp?.home : exp?.away;
                        return (
                          <div key={side} className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-600">
                              {side === 'home' ? '🏠 ทีมเหย้า' : '✈️ ทีมเยือน'}
                              {expTeam && (
                                <span className="text-indigo-600 font-semibold ml-1 text-[10px]">
                                  (แนะนำ: {expTeam.seedLabel} {expTeam.name})
                                </span>
                              )}
                            </label>
                            <select
                              value={manualSeeds[`${key}_${side}`] || ''}
                              onChange={(e) =>
                                setManualSeeds((prev) => ({ ...prev, [`${key}_${side}`]: e.target.value }))
                              }
                              className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-2 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                              <option value="">-- เลือกทีม --</option>
                              {qualifiedTeams.length > 0 && (
                                <optgroup label="⭐ ทีมที่ผ่านเข้ารอบตามคะแนน">
                                  {qualifiedTeams.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.seedLabel} · {t.name}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {['A', 'B', 'C'].map((grp) => {
                                const groupTeams = standings[grp] || [];
                                if (groupTeams.length === 0) return null;
                                return (
                                  <optgroup key={grp} label={`กลุ่ม ${grp}`}>
                                    {groupTeams.map((t, idx) => (
                                      <option key={t.id} value={t.id}>
                                        #{idx + 1} {t.name} (ชนะ {t.wins || 0} แพ้ {t.losses || 0})
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {bracket.qf.length === 0 ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs text-indigo-800">
                  <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">โหมดสร้างรอบน็อกเอาต์ใหม่</p>
                    <p className="text-indigo-600 mt-0.5">
                      เมื่อกด &quot;สร้างรอบ 8 ทีมทันที&quot; ระบบจะสร้าง QF 4 คู่, SF 2 คู่, ชิงอันดับ 3, และรอบชิงชนะเลิศตามรายชื่อทีมที่เลือกด้านบน
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p>กำลังแก้ไขทีมในรอบ 8 ทีมที่มีอยู่แล้ว</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualSeed(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveManualSeeds}
                  disabled={savingSeeds}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-600/20"
                >
                  {savingSeeds ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : bracket.qf.length === 0 ? (
                    <Zap className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {savingSeeds
                      ? 'กำลังประมวลผล...'
                      : bracket.qf.length === 0
                      ? 'สร้างรอบ 8 ทีมทันที'
                      : 'บันทึกการจัดทีม'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SYNC STATUS BANNER ── */}
      {!hasKnockouts && canGenerateKnockout && isAuthenticated && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-sm">รอบแบ่งกลุ่มครบแล้ว! พร้อมสร้างรอบน็อกเอาต์</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {qualifiedTeams.length} ทีมเข้ารอบ sync จากคะแนนกลุ่มอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            สร้างเลย!
          </button>
        </div>
      )}

      {/* ── TOURNAMENT BRACKET CANVAS (Horizontal Scroll) ── */}
      <div className="overflow-x-auto pb-8 pt-2">
        <div className="min-w-[1260px] flex items-stretch gap-8 relative px-2">

          {/* ════════ COLUMN 1: POOL STAGE (3 กลุ่ม A, B, C) ════════ */}
          <div className="w-80 flex-shrink-0 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-primary-500">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center text-xs font-black">
                  1
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                    รอบแบ่งกลุ่ม ({activeCategory})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    3 กลุ่ม กลุ่มละ 4 ทีม (18 เกม)
                  </span>
                </div>
              </div>
              <span
                title={isGroupStageComplete ? 'คัดทีมเข้ารอบจากผลการแข่งขันรอบแบ่งกลุ่มครบแล้ว' : 'ระบบจะคัดทีมเข้ารอบเมื่อการแข่งขันรอบแบ่งกลุ่มครบทุกนัด'}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isGroupStageComplete
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isGroupStageComplete
                  ? `เข้ารอบแล้ว ${qualifiedTeams.length} ทีม`
                  : `รอผลกลุ่ม ${groupStageStatus.finishedMatches || 0}/${groupStageStatus.totalMatches || 18} นัด`}
              </span>
            </div>

            {/* Pools A, B, C */}
            <div className="space-y-3.5">
              {['A', 'B', 'C'].map((p) => {
                const groupTeams = standings[p] || [];
                return (
                  <div key={p} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary-400" />
                        กลุ่ม {p} (Pool {p})
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {groupTeams.length} ทีม · 6 แมตช์
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {groupTeams.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">ยังไม่มีทีมในกลุ่ม {p}</div>
                      ) : (
                        groupTeams.map((team, idx) => {
                          const isQ = team.qualified;
                          const isHovered = hoveredTeamId === team.id;
                          return (
                            <div
                              key={team.id}
                              onMouseEnter={() => setHoveredTeamId(team.id)}
                              onMouseLeave={() => setHoveredTeamId(null)}
                              className={`p-2.5 flex items-center justify-between transition-all ${
                                isHovered
                                  ? 'bg-primary-50'
                                  : isQ
                                  ? 'bg-emerald-50/50'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                    idx === 0
                                      ? 'bg-amber-400 text-amber-950 font-black'
                                      : idx === 1
                                      ? 'bg-slate-200 text-slate-800'
                                      : idx === 2 && isQ
                                      ? 'bg-emerald-200 text-emerald-900 font-bold'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <Link
                                  to={`/teams/${team.id}`}
                                  className="font-semibold text-slate-800 truncate hover:text-primary-600 transition-colors"
                                >
                                  {team.name}
                                </Link>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="font-mono text-slate-500 font-medium text-[11px]">
                                  {team.stats.won}W-{team.stats.lost}L
                                </span>
                                {isGroupStageComplete && (
                                  isQ ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-black flex items-center gap-0.5 border ${
                                        idx === 2
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      }`}
                                      title={team.qualifyReason}
                                    >
                                      <span>Q</span>
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-300 font-bold">OUT</span>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Best 3rd Place Comparison Table — Only show when group stage is COMPLETE */}
            {isGroupStageComplete && thirdPlaceComparison.length > 0 && (
              <div className="bg-amber-50/70 rounded-2xl border border-amber-200/80 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    ตารางอันดับ 3 ที่ดีที่สุด (เอา 2 ทีม · ชนะ/อัตราชนะ แล้วคะแนนเฉลี่ย)
                  </span>
                  <span className="text-[10px] font-bold text-amber-700">Top 2 เข้ารอบ</span>
                </div>
                <div className="space-y-1">
                  {thirdPlaceComparison.map((t, idx) => (
                    <div
                      key={t.id}
                      className={`p-1.5 rounded-lg flex items-center justify-between text-[11px] ${
                        isGroupStageComplete && t.isQualified
                          ? 'bg-white border border-amber-300 text-amber-950 font-semibold'
                          : 'bg-white/60 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold">{idx + 1}.</span>
                        <span className="truncate">{t.name} (กลุ่ม {t.group})</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
                        <span>{t.stats.won}W-{t.stats.lost}L</span>
                        <span>({Number(t.stats.scoringAverage || 0).toFixed(1)} แต้ม/นัด)</span>
                        {isGroupStageComplete && (
                          t.isQualified ? (
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1 py-0.2 rounded">Q</span>
                          ) : (
                            <span className="text-[9px] font-bold text-rose-400">OUT</span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ════════ CONNECTOR 1: Pool to 8-Team QF ════════ */}
          <div className="w-8 flex-shrink-0 flex items-center justify-center">
            <ChevronRight className="w-6 h-6 text-slate-300 animate-pulse" />
          </div>

          {/* ════════ COLUMN 2: ROUND OF 8 (รอบ 8 ทีม / QF - 4 Games) ════════ */}
          <div className="w-80 flex-shrink-0 flex flex-col space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-indigo-500">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs font-black">
                2
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                  รอบ 8 ทีม (Quarter-Finals)
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {!isGroupStageComplete && bracket.qf.length === 0
                    ? '4 แมตช์ · รอผลรอบแบ่งกลุ่ม'
                    : '4 แมตช์ · สนาม 1 & สนาม 2'}
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-around gap-4 py-1">
              {bracket.qf.length > 0 ? (
                bracket.qf.map((match, idx) => (
                  <MatchBracketNode
                    key={match.id}
                    match={match}
                    label={`QF ${idx + 1}`}
                    hoveredTeamId={hoveredTeamId}
                    setHoveredTeamId={setHoveredTeamId}
                    isAuthenticated={isAuthenticated}
                    onAdvance={handleAdvance}
                    advancingId={advancingId}
                  />
                ))
              ) : (
                <div className="space-y-4">
                  {/* Placeholders synced from group standings */}
                  <PlaceholderNode
                    title="QF 1 (สนาม 1)"
                    seedH={expectedSeeds.qf1.home ? `${expectedSeeds.qf1.home.seedLabel} · ${expectedSeeds.qf1.home.name}` : 'รอผล: แชมป์กลุ่ม A (A1)'}
                    seedA={expectedSeeds.qf1.away ? `${expectedSeeds.qf1.away.seedLabel} · ${expectedSeeds.qf1.away.name}` : 'รอผล: อันดับ 3 ที่ดีที่สุด (#2)'}
                    venue="สนาม 1"
                    isDataReady={!!expectedSeeds.qf1.home}
                  />
                  <PlaceholderNode
                    title="QF 2 (สนาม 2)"
                    seedH={expectedSeeds.qf2.home ? `${expectedSeeds.qf2.home.seedLabel} · ${expectedSeeds.qf2.home.name}` : 'รอผล: รองแชมป์กลุ่ม B (B2)'}
                    seedA={expectedSeeds.qf2.away ? `${expectedSeeds.qf2.away.seedLabel} · ${expectedSeeds.qf2.away.name}` : 'รอผล: รองแชมป์กลุ่ม C (C2)'}
                    venue="สนาม 2"
                    isDataReady={!!expectedSeeds.qf2.home}
                  />
                  <PlaceholderNode
                    title="QF 3 (สนาม 1)"
                    seedH={expectedSeeds.qf3.home ? `${expectedSeeds.qf3.home.seedLabel} · ${expectedSeeds.qf3.home.name}` : 'รอผล: แชมป์กลุ่ม B (B1)'}
                    seedA={expectedSeeds.qf3.away ? `${expectedSeeds.qf3.away.seedLabel} · ${expectedSeeds.qf3.away.name}` : 'รอผล: อันดับ 3 ที่ดีที่สุด (#1)'}
                    venue="สนาม 1"
                    isDataReady={!!expectedSeeds.qf3.home}
                  />
                  <PlaceholderNode
                    title="QF 4 (สนาม 2)"
                    seedH={expectedSeeds.qf4.home ? `${expectedSeeds.qf4.home.seedLabel} · ${expectedSeeds.qf4.home.name}` : 'รอผล: แชมป์กลุ่ม C (C1)'}
                    seedA={expectedSeeds.qf4.away ? `${expectedSeeds.qf4.away.seedLabel} · ${expectedSeeds.qf4.away.name}` : 'รอผล: รองแชมป์กลุ่ม A (A2)'}
                    venue="สนาม 2"
                    isDataReady={!!expectedSeeds.qf4.home}
                  />
                </div>
              )}
            </div>
          </div>


          {/* ════════ CONNECTOR 2: QF to SF (SVG Lines) ════════ */}
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-96 text-slate-300 overflow-visible" fill="none">
              {/* QF1 & QF2 -> SF1 */}
              <path d="M 0 60 H 20 V 120 H 40" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
              <path d="M 0 180 H 20 V 120 H 40" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx="40" cy="120" r="3" fill="#6366f1" />

              {/* QF3 & QF4 -> SF2 */}
              <path d="M 0 300 H 20 V 360 H 40" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
              <path d="M 0 420 H 20 V 360 H 40" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx="40" cy="360" r="3" fill="#6366f1" />
            </svg>
          </div>

          {/* ════════ COLUMN 3: SEMI-FINALS (รอบรองชนะเลิศ - 2 Games) ════════ */}
          <div className="w-80 flex-shrink-0 flex flex-col space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-indigo-600">
              <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-600 flex items-center justify-center text-xs font-black">
                3
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                  รอบรองชนะเลิศ (Semi-Finals)
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  2 แมตช์ · ผู้ชนะเข้าชิงชนะเลิศ
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-around py-8 gap-8">
              {bracket.sf.length > 0 ? (
                bracket.sf.map((match, idx) => (
                  <MatchBracketNode
                    key={match.id}
                    match={match}
                    label={`SF ${idx + 1}`}
                    hoveredTeamId={hoveredTeamId}
                    setHoveredTeamId={setHoveredTeamId}
                    isAuthenticated={isAuthenticated}
                    onAdvance={handleAdvance}
                    advancingId={advancingId}
                  />
                ))
              ) : (
                <div className="space-y-12">
                  <PlaceholderNode title="SF 1 (สนาม 1)" seedH="ผู้ชนะ QF 1" seedA="ผู้ชนะ QF 2" venue="สนาม 1" />
                  <PlaceholderNode title="SF 2 (สนาม 2)" seedH="ผู้ชนะ QF 3" seedA="ผู้ชนะ QF 4" venue="สนาม 2" />
                </div>
              )}
            </div>
          </div>

          {/* ════════ CONNECTOR 3: SF to Final (SVG Lines) ════════ */}
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-80 text-slate-300 overflow-visible" fill="none">
              <path d="M 0 80 H 20 V 160 H 40" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
              <path d="M 0 240 H 20 V 160 H 40" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx="40" cy="160" r="3.5" fill="#f59e0b" />
            </svg>
          </div>

          {/* ════════ COLUMN 4: CHAMPIONSHIP FINAL & 3RD PLACE ════════ */}
          <div className="w-84 flex-shrink-0 flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-amber-500">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-black">
                🏆
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                  รอบชิงชนะเลิศ (Finals)
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  ชิงแชมป์ & ชิงอันดับ 3
                </span>
              </div>
            </div>

            {/* Championship Final Card */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-extrabold border border-amber-200 shadow-xs">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>CHAMPIONSHIP FINAL • ชิงชนะเลิศ</span>
              </div>

              {bracket.final.length > 0 ? (
                bracket.final.map((match) => (
                  <MatchBracketNode
                    key={match.id}
                    match={match}
                    label="GOLD MEDAL"
                    isChampionship
                    hoveredTeamId={hoveredTeamId}
                    setHoveredTeamId={setHoveredTeamId}
                    isAuthenticated={isAuthenticated}
                    onAdvance={handleAdvance}
                    advancingId={advancingId}
                  />
                ))
              ) : (
                <PlaceholderNode
                  title="🏆 ชิงชนะเลิศ (สนาม 1)"
                  seedH="ผู้ชนะ SF 1"
                  seedA="ผู้ชนะ SF 2"
                  venue="สนาม 1"
                  highlight
                />
              )}
            </div>

            {/* 3rd Place Match Card */}
            <div className="space-y-2 pt-4 border-t border-slate-200">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <span>🥉 ชิงอันดับ 3 (Bronze Medal Match)</span>
              </div>

              {bracket.thirdPlace.length > 0 ? (
                bracket.thirdPlace.map((match) => (
                  <MatchBracketNode
                    key={match.id}
                    match={match}
                    label="BRONZE"
                    hoveredTeamId={hoveredTeamId}
                    setHoveredTeamId={setHoveredTeamId}
                    isAuthenticated={isAuthenticated}
                    onAdvance={handleAdvance}
                    advancingId={advancingId}
                  />
                ))
              ) : (
                <PlaceholderNode
                  title="🥉 ชิงอันดับ 3 (สนาม 2)"
                  seedH="ผู้แพ้ SF 1"
                  seedA="ผู้แพ้ SF 2"
                  venue="สนาม 2"
                />
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Bracket Match Card Node ────────────────────────────────────────────────
function MatchBracketNode({
  match,
  label,
  isChampionship = false,
  hoveredTeamId,
  setHoveredTeamId,
  isAuthenticated,
  onAdvance,
  advancingId,
}) {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const homeWin = isFinished && match.homeScore > match.awayScore;
  const awayWin = isFinished && match.awayScore > match.homeScore;

  return (
    <div
      className={`rounded-2xl transition-all duration-200 overflow-hidden border-2 ${
        isChampionship
          ? 'bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 border-amber-400 shadow-xl shadow-amber-500/10'
          : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Node Header: Round, Court & Status */}
      <div
        className={`px-3 py-1.5 flex items-center justify-between text-[11px] font-bold ${
          isChampionship
            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
            : isLive
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-100 text-slate-600'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {isLive && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
          {label}
        </span>
        <span className="text-[10px] font-medium opacity-90 truncate max-w-[140px] flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{match.venue || 'สนาม 1'}</span>
        </span>
      </div>

      {/* Match Face-off rows */}
      <div className="p-2 space-y-1 text-xs">
        {/* Home Team Row */}
        <div
          onMouseEnter={() => setHoveredTeamId(match.homeTeam?.id)}
          onMouseLeave={() => setHoveredTeamId(null)}
          className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
            homeWin
              ? 'bg-emerald-50 font-bold text-emerald-900 border border-emerald-200'
              : hoveredTeamId === match.homeTeam?.id
              ? 'bg-primary-50'
              : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {match.homeTeam?.logoUrl ? (
              <img
                src={match.homeTeam.logoUrl}
                alt={match.homeTeam.name}
                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0">
                {match.homeTeam?.name?.charAt(0) || 'H'}
              </div>
            )}
            <Link
              to={match.homeTeam ? `/teams/${match.homeTeam.id}` : '/schedule'}
              className="truncate font-semibold text-slate-800 hover:text-primary-600"
            >
              {match.homeTeam?.name || 'TBD · รอผู้ชนะรอบก่อนหน้า'}
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            {homeWin && <span className="text-[10px] font-black text-emerald-600">WIN 🏆</span>}
            <span
              className={`font-mono font-black text-sm px-1.5 py-0.5 rounded ${
                homeWin ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {match.homeScore ?? '-'}
            </span>
          </div>
        </div>

        {/* Away Team Row */}
        <div
          onMouseEnter={() => setHoveredTeamId(match.awayTeam?.id)}
          onMouseLeave={() => setHoveredTeamId(null)}
          className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
            awayWin
              ? 'bg-emerald-50 font-bold text-emerald-900 border border-emerald-200'
              : hoveredTeamId === match.awayTeam?.id
              ? 'bg-primary-50'
              : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {match.awayTeam?.logoUrl ? (
              <img
                src={match.awayTeam.logoUrl}
                alt={match.awayTeam.name}
                className="w-5 h-5 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0">
                {match.awayTeam?.name?.charAt(0) || 'A'}
              </div>
            )}
            <Link
              to={match.awayTeam ? `/teams/${match.awayTeam.id}` : '/schedule'}
              className="truncate font-semibold text-slate-800 hover:text-primary-600"
            >
              {match.awayTeam?.name || 'TBD · รอผู้ชนะรอบก่อนหน้า'}
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            {awayWin && <span className="text-[10px] font-black text-emerald-600">WIN 🏆</span>}
            <span
              className={`font-mono font-black text-sm px-1.5 py-0.5 rounded ${
                awayWin ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {match.awayScore ?? '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Node Footer: Link to detail & Admin advance button */}
      <div className="px-3 py-1.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <Link
          to={`/matches/${match.id}`}
          className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
        >
          <span>ดูรายละเอียด</span>
          <ChevronRight className="w-3 h-3" />
        </Link>

        {isAuthenticated && isFinished && (homeWin || awayWin) && (
          <button
            onClick={() => onAdvance(match.id)}
            disabled={advancingId === match.id}
            className="text-[10px] font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
            title="อัปเดตทีมชนะให้ไปรอในรอบถัดไป"
          >
            <span>{advancingId === match.id ? 'กำลังเลื่อน...' : 'เลื่อนทีมชนะ ➔'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Placeholder Node for Scheduled / Future Rounds ───────────────────────
function PlaceholderNode({ title, seedH, seedA, venue = 'สนาม 1', highlight = false, isDataReady = false }) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-3 space-y-2 text-xs select-none ${
        highlight
          ? 'bg-amber-500/5 border-amber-300'
          : isDataReady
          ? 'bg-indigo-50/50 border-indigo-200/80'
          : 'bg-slate-50/80 border-slate-200 text-slate-400'
      }`}
    >
      <div className="font-bold text-[11px] text-slate-500 uppercase tracking-wider flex items-center justify-between">
        <span className="flex items-center gap-1">
          {isDataReady && <CheckCircle2 className="w-3 h-3 text-indigo-400" />}
          {title}
        </span>
        <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{venue}</span>
        </span>
      </div>

      <div className="space-y-1 font-medium">
        <div
          className={`p-2 rounded-xl border flex items-center justify-between ${
            isDataReady
              ? 'bg-white border-indigo-200/60 text-slate-700'
              : 'bg-slate-100/70 border-dashed border-slate-200 text-slate-400 text-[11px]'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDataReady ? 'bg-indigo-400' : 'bg-slate-300'}`} />
            <span className="truncate">{seedH}</span>
          </div>
          <span className="font-mono text-slate-300 font-bold flex-shrink-0">-</span>
        </div>

        <div
          className={`p-2 rounded-xl border flex items-center justify-between ${
            isDataReady
              ? 'bg-white border-indigo-200/60 text-slate-700'
              : 'bg-slate-100/70 border-dashed border-slate-200 text-slate-400 text-[11px]'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDataReady ? 'bg-indigo-400' : 'bg-slate-300'}`} />
            <span className="truncate">{seedA}</span>
          </div>
          <span className="font-mono text-slate-300 font-bold flex-shrink-0">-</span>
        </div>
      </div>
    </div>
  );
}
