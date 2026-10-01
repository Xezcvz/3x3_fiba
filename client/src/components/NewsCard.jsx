import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, ArrowRight } from 'lucide-react';

export default function NewsCard({ news }) {
  if (!news) return null;

  const date = new Date(news.createdAt).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <article className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
      
      {/* Thumbnail */}
      <div className="relative h-48 sm:h-52 bg-slate-100 overflow-hidden">
        {news.imageUrl ? (
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-primary-600 to-primary-400 text-white font-bold text-2xl">
            🏀 ข่าวสาร
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-primary-700 shadow-sm">
            <Tag className="w-3 h-3" />
            {news.category || 'ประกาศ'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
            <Calendar className="w-3.5 h-3.5 text-primary-500" />
            <time>{date}</time>
          </div>

          <h3 className="font-bold text-base text-slate-800 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {news.title}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
            {news.content}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <Link
            to={`/news#news-${news.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 group-hover:text-primary-700 group-hover:translate-x-0.5 transition-all"
          >
            <span>อ่านต่อ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

    </article>
  );
}
