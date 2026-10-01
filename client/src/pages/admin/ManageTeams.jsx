import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../../services/api';
import { useModal } from '../../context/ModalContext';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Shield,
  MapPin,
  User,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

export default function ManageTeams() {
  const { confirm, alert: showAlert } = useModal();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [group, setGroup] = useState('A');
  const [logoUrl, setLogoUrl] = useState('');
  const [coach, setCoach] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await getTeams();
      setTeams(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentTeamId(null);
    setName('');
    setGroup('A');
    setLogoUrl('');
    setCoach('');
    setCity('');
    setDescription('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (team) => {
    setIsEditing(true);
    setCurrentTeamId(team.id);
    setName(team.name || '');
    setGroup(team.group || 'A');
    setLogoUrl(team.logoUrl || '');
    setCoach(team.coach || '');
    setCity(team.city || '');
    setDescription(team.description || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('กรุณากรอกชื่อสโมสร');
      return;
    }

    setSaving(true);
    const payload = {
      name,
      group,
      logoUrl,
      coach,
      city,
      description,
    };

    try {
      if (isEditing) {
        await updateTeam(currentTeamId, payload);
      } else {
        await createTeam(payload);
      }
      setIsModalOpen(false);
      await fetchTeams();
    } catch (err) {
      setFormError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, teamName) => {
    const isConfirmed = await confirm({
      title: 'ยืนยันการลบสโมสร',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบทีม "${teamName}"?\n\nคำเตือน: โปรแกรมการแข่งขันและสถิติทั้งหมดที่เกี่ยวข้องกับทีมนี้จะถูกลบไปด้วย`,
      confirmText: 'ลบทีมนี้',
      cancelText: 'ยกเลิก',
      type: 'danger',
    });

    if (isConfirmed) {
      try {
        await deleteTeam(id);
        setTeams((prev) => prev.filter((t) => t.id !== id));
        await showAlert({
          title: 'ลบสำเร็จ',
          message: `ลบทีม "${teamName}" เรียบร้อยแล้ว`,
          type: 'success',
        });
      } catch (err) {
        await showAlert({
          title: 'เกิดข้อผิดพลาด',
          message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบทีม',
          type: 'error',
        });
      }
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header */}
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
            จัดการข้อมูลสโมสรและทีมแข่งขัน
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เพิ่มทีมใหม่ แก้ไขข้อมูลโค้ช สายการแข่งขัน และสถิติ
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md shadow-primary-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มทีมใหม่</span>
        </button>
      </div>

      {/* Teams Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">ตราสัญลักษณ์</th>
                <th className="py-3.5 px-4">ชื่อสโมสร</th>
                <th className="py-3.5 px-4">สาย (Group)</th>
                <th className="py-3.5 px-4">จังหวัด</th>
                <th className="py-3.5 px-4">หัวหน้าผู้ฝึกสอน</th>
                <th className="py-3.5 px-4 text-center">สถิติ (ช-พ)</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center p-0.5">
                      {t.logoUrl ? (
                        <img src={t.logoUrl} alt={t.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Shield className="w-5 h-5 text-primary-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <Link to={`/teams/${t.id}`} className="hover:text-primary-600 transition-colors">
                      {t.name}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      สาย {t.group}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    {t.city || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-xs">
                    {t.coach || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                    <span className="text-emerald-600">{t.stats?.won ?? 0}</span>
                    <span className="text-slate-300 mx-1">-</span>
                    <span className="text-rose-500">{t.stats?.lost ?? 0}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(t)}
                        title="แก้ไขทีม"
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        title="ลบทีม"
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

      {/* Modal: Create or Edit Team */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {isEditing ? 'แก้ไขข้อมูลสโมสร' : 'เพิ่มสโมสรใหม่'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ชื่อสโมสร / ทีม (Team Name) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
                  placeholder="เช่น Bangkok Warriors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    สายการแข่งขัน (Group) *
                  </label>
                  <select
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
                  >
                    <option value="A">สาย A (Group A)</option>
                    <option value="B">สาย B (Group B)</option>
                    <option value="C">สาย C</option>
                    <option value="D">สาย D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    จังหวัด / ที่ตั้ง
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-medium"
                    placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  ลิงก์รูปโลโก้ทีม (Logo URL)
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono text-xs"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  หัวหน้าผู้ฝึกสอน (Head Coach)
                </label>
                <input
                  type="text"
                  value={coach}
                  onChange={(e) => setCoach(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-medium"
                  placeholder="เช่น โค้ชประเสริฐ วงศ์ใหญ่"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  คำอธิบายหรือประวัติทีม (Bio / Description)
                </label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="จุดเด่นของทีม สไตล์การเล่น หรือเกียรติประวัติ..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
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
                  {saving ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มทีม'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
