import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNews, createNews, updateNews, deleteNews } from '../../services/api';
import { useModal } from '../../context/ModalContext';
import {
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  X,
  Tag,
  Calendar,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

export default function ManageNews() {
  const { confirm, alert: showAlert } = useModal();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNewsId, setCurrentNewsId] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ประกาศ');
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await getNews();
      setNewsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentNewsId(null);
    setTitle('');
    setCategory('ประกาศ');
    setImageUrl('https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80');
    setContent('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setIsEditing(true);
    setCurrentNewsId(item.id);
    setTitle(item.title || '');
    setCategory(item.category || 'ประกาศ');
    setImageUrl(item.imageUrl || '');
    setContent(item.content || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !content.trim()) {
      setFormError('กรุณากรอกหัวข้อข่าวและเนื้อหา');
      return;
    }

    setSaving(true);
    const payload = {
      title,
      category,
      imageUrl,
      content,
    };

    try {
      if (isEditing) {
        await updateNews(currentNewsId, payload);
      } else {
        await createNews(payload);
      }
      setIsModalOpen(false);
      await fetchNews();
    } catch (err) {
      setFormError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข่าว');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, newsTitle) => {
    const isConfirmed = await confirm({
      title: 'ยืนยันการลบข่าวสาร',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบข่าว:\n"${newsTitle}"?\n\nข่าวสารนี้จะถูกลบออกจากหน้าเว็บทันที`,
      confirmText: 'ลบข่าวนี้',
      cancelText: 'ยกเลิก',
      type: 'danger',
    });

    if (isConfirmed) {
      try {
        await deleteNews(id);
        setNewsList((prev) => prev.filter((n) => n.id !== id));
        await showAlert({
          title: 'ลบสำเร็จ',
          message: 'ลบข่าวสารเรียบร้อยแล้ว',
          type: 'success',
        });
      } catch (err) {
        await showAlert({
          title: 'เกิดข้อผิดพลาด',
          message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบข่าว',
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
            จัดการข่าวสารและประกาศการแข่งขัน
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            เขียนข่าวประกาศ รายงานผลการแข่งขัน และแจ้งข่าวสารแก่ผู้ชม
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md shadow-primary-500/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>เขียนข่าวใหม่</span>
        </button>
      </div>

      {/* News Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">รูปภาพ</th>
                <th className="py-3.5 px-4">หัวข้อข่าว</th>
                <th className="py-3.5 px-4">หมวดหมู่</th>
                <th className="py-3.5 px-4">วันที่เผยแพร่</th>
                <th className="py-3.5 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {newsList.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="w-14 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                      {n.imageUrl ? (
                        <img src={n.imageUrl} alt={n.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600">
                          ข่าว
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800 max-w-md">
                    <p className="line-clamp-1">{n.title}</p>
                    <p className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5">{n.content}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {n.category || 'ประกาศ'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-xs">
                    {new Date(n.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(n)}
                        title="แก้ไขข่าว"
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id, n.title)}
                        title="ลบข่าว"
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

      {/* Modal: Create or Edit News */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {isEditing ? 'แก้ไขข่าวสาร' : 'เขียนข่าวประชาสัมพันธ์ใหม่'}
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
                  หัวข้อข่าว (Title) *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
                  placeholder="เช่น ผลการแข่งขันรอบเปิดสนาม หรือ ประกาศสนามแข่ง"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    หมวดหมู่ (Category) *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-semibold"
                  >
                    <option value="ประกาศ">ประกาศ</option>
                    <option value="ผลการแข่งขัน">ผลการแข่งขัน</option>
                    <option value="ข่าวทีม">ข่าวทีม</option>
                    <option value="ระเบียบการ">ระเบียบการ</option>
                    <option value="ไฮไลท์">ไฮไลท์</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ลิงก์รูปภาพประกอบ (Image URL)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono text-xs"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  เนื้อหาข่าว (Content) *
                </label>
                <textarea
                  rows="6"
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 leading-relaxed"
                  placeholder="เขียนรายละเอียดเนื้อหาข่าวที่นี่..."
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
                  {saving ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'เผยแพร่ข่าว'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
