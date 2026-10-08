import React, { useCallback, useEffect, useState } from 'react';
import { getNews } from '../services/api';
import NewsCard from '../components/NewsCard';
import ApiErrorNotice from '../components/ApiErrorNotice';
import useLiveUpdates from '../hooks/useLiveUpdates';
import { Newspaper, Search, Tag, X, Calendar } from 'lucide-react';

export default function News() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const fetchNews = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const res = await getNews(params);
      setNewsList(res.data);
      setLoadError(false);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => { fetchNews(); }, [fetchNews]);
  useLiveUpdates(() => fetchNews({ showLoading: false }));

  const filteredNews = newsList.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2.5 py-1 rounded-md mb-2">
            <Newspaper className="w-3.5 h-3.5" />
            <span>ข่าวสารและประชาสัมพันธ์</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            ข่าวสารและประกาศการแข่งขัน
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            เกาะติดทุกความเคลื่อนไหว ผลการแข่งขัน คำประกาศอย่างเป็นทางการ และความพร้อมของทุกสโมสร
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-2xl gap-1">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'ประกาศ', label: 'ประกาศ' },
            { id: 'ผลการแข่งขัน', label: 'ผลการแข่งขัน' },
            { id: 'ข่าวทีม', label: 'ข่าวทีม' },
            { id: 'ระเบียบการ', label: 'ระเบียบการ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                categoryFilter === tab.id
                  ? 'bg-white text-primary-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && <ApiErrorNotice onRetry={() => fetchNews()} />}

      {/* Search Input */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาตามหัวข้อหรือเนื้อหาข่าว..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
      </div>

      {/* News Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : loadError ? null : filteredNews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredNews.map((news) => (
            <div
              key={news.id}
              onClick={() => setSelectedNews(news)}
              className="cursor-pointer"
            >
              <NewsCard news={news} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 text-slate-400">
          <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">ไม่พบข่าวสารในหมวดหมู่นี้</p>
        </div>
      )}

      {/* Full News Reader Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            
            {/* Modal Image */}
            <div className="relative h-64 sm:h-72 bg-slate-100 flex-shrink-0">
              {selectedNews.imageUrl ? (
                <img
                  src={selectedNews.imageUrl}
                  alt={selectedNews.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-primary-600 to-primary-400 text-white font-bold text-3xl">
                  🏀 ข่าวสาร
                </div>
              )}
              
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white text-primary-700 shadow-md">
                  <Tag className="w-3.5 h-3.5" />
                  {selectedNews.category || 'ประกาศ'}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-4 h-4 text-primary-500" />
                <span>
                  {new Date(selectedNews.createdAt).toLocaleDateString('th-TH', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-snug">
                {selectedNews.title}
              </h2>

              <div className="text-sm sm:text-base text-slate-600 leading-relaxed space-y-4 whitespace-pre-line pt-2 border-t border-slate-100">
                {selectedNews.content}
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedNews(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
