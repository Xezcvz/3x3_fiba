import axios from 'axios';

// In production on Render, both client and server run on the same origin,
// so '/api' relative path works fine.
// Set VITE_API_URL only if backend is on a separate URL (e.g. separate Render service).
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid or expired
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Teams API
export const getTeams = (params) => api.get('/teams', { params });
export const getTeamById = (id) => api.get(`/teams/${id}`);
export const createTeam = (data) => api.post('/teams', data);
export const updateTeam = (id, data) => api.put(`/teams/${id}`, data);
export const deleteTeam = (id) => api.delete(`/teams/${id}`);
export const resetAllTeams = (category = 'all') => api.post('/teams/reset-all', { category });

// Draw API
export const getGroups = () => api.get('/teams/groups');
export const autoDraw = (data) => api.post('/teams/draw/auto', data);
export const manualDraw = (assignments, category = 'all') => api.post('/teams/draw/manual', { assignments, category });
export const resetDraw = (category = 'all') => api.post('/teams/draw/reset', { category });

// Matches API
export const getMatches = (params) => api.get('/matches', { params });
export const getMatchById = (id) => api.get(`/matches/${id}`);
export const createMatch = (data) => api.post('/matches', data);
export const updateMatch = (id, data) => api.put(`/matches/${id}`, data);
export const deleteMatch = (id) => api.delete(`/matches/${id}`);
export const resetMatchScores = (category) => api.post('/matches/reset-scores', { category });
export const resetAllMatches = (category) => api.post('/matches/reset-all', { category });

// News API
export const getNews = (params) => api.get('/news', { params });
export const getNewsById = (id) => api.get(`/news/${id}`);
export const createNews = (data) => api.post('/news', data);
export const updateNews = (id, data) => api.put(`/news/${id}`, data);
export const deleteNews = (id) => api.delete(`/news/${id}`);

// Auth & Stats API
export const login = (credentials) => api.post('/auth/login', credentials);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const getStats = () => api.get('/stats');

// Tournament & Bracket API
export const getTournamentBracket = (category) =>
  api.get('/tournament/bracket', { params: { category } });
export const generateKnockout = (category, seeds) =>
  api.post('/tournament/generate-knockout', { category, seeds });
export const advanceWinner = (matchId) =>
  api.post('/tournament/advance-winner', { matchId });
export const resetKnockout = (category) =>
  api.post('/tournament/reset-knockout', { category });
export const manualSeedKnockout = (category, seeds) =>
  api.post('/tournament/manual-seed-knockout', { category, seeds });
export const seedTournament24 = () =>
  api.post('/tournament/seed-24');

export default api;
