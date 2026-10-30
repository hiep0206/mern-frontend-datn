import { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from './config/api';
import ReactMarkdown from 'react-markdown';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  LayoutGrid, ArrowRightLeft, PieChart as PieChartIcon, 
  Target, BookOpen, Sparkles, Wallet, Calendar, FileText, 
  TrendingUp, TrendingDown, Plus, Trash2, MessageSquare, Menu, X, ArrowLeft
} from 'lucide-react';

import DashboardChart from './components/DashboardChart';
import Auth from './components/Auth';
import BorrowTracker from './components/BorrowTracker';
import ProfileModal from './components/ProfileModal';
import UserDropdown from './components/UserDropdown';
import GoalTracker from './components/GoalTracker';
import BillTracker from './components/BillTracker';
import './App.css';

// --- CẤU HÌNH AXIOS INTERCEPTOR ---
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Token đã hết hạn. Đang tự động đăng xuất...");
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);

const requestTransactions = async (token) => {
  const res = await axios.get(apiUrl('/api/transactions'), {
    headers: { Authorization: `Bearer ${token}` }
  });
  const responseData = res.data;
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData.data)) return responseData.data;
  if (Array.isArray(responseData.transactions)) return responseData.transactions;
  return [];
};

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Tên hiển thị trên thanh địa chỉ cho từng mục (ví dụ: /#giao-dich)
const MENU_SLUGS = {
  '01': 'tong-quan',
  '02': 'giao-dich',
  '03': 'phan-tich',
  '04': 'khoan-vay',
  '05': 'muc-tieu',
  '06': 'copilot',
};

const getMenuFromHash = () => {
  const slug = window.location.hash.replace('#', '');
  return Object.keys(MENU_SLUGS).find((id) => MENU_SLUGS[id] === slug) || '01';
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showProfile, setShowProfile] = useState(false);
  const [activeMenu, setActiveMenu] = useState(getMenuFromHash); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [formData, setFormData] = useState({ amount: '', type: 'expense', category: 'Ăn uống', note: '', date: getTodayDate() });
  const [showAddForm, setShowAddForm] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [transactionsError, setTransactionsError] = useState('');
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear, setFilterYear] = useState(currentYear);

  const [budget, setBudget] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      return parsed.monthlyBudget || 0;
    }
    return 0;
  });
  
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget);

  const fetchTransactions = async () => {
    if (!token) {
      setTransactions([]);
      setTransactionsError('');
      return false;
    }
    try {
      const data = await requestTransactions(token);
      setTransactions(data);
      setTransactionsError('');
      return true;
    } catch (error) {
      setTransactionsError(error.response?.data?.message || 'Không thể tải lịch sử giao dịch.');
      return false;
    }
  };

  useEffect(() => {
    if (!token) return undefined;
    let isCurrent = true;
    requestTransactions(token)
      .then((dataList) => {
        if (isCurrent) { setTransactions(dataList); setTransactionsError(''); }
      })
      .catch((error) => {
        if (isCurrent) setTransactionsError(error.response?.data?.message || 'Không thể tải dữ liệu.');
      });
    return () => { isCurrent = false; };
  }, [token]);

  // Đồng bộ mục đang mở với lịch sử trình duyệt:
  // nút lùi/tiến của trình duyệt và thao tác vuốt lùi trên điện thoại đều quay về đúng mục trước đó
  useEffect(() => {
    window.history.replaceState(null, '', `#${MENU_SLUGS[getMenuFromHash()]}`);
    const handlePopState = () => {
      setActiveMenu(getMenuFromHash());
      setMobileMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Chuyển mục và ghi vào lịch sử để có thể quay lại
  const goTo = (id) => {
    if (id !== activeMenu) {
      window.history.pushState(null, '', `#${MENU_SLUGS[id]}`);
      setActiveMenu(id);
      window.scrollTo(0, 0);
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setTransactions([]); 
    setAiAdvice('');     
    setToken(null);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData, amount: Number(formData.amount) };
      await axios.post(apiUrl('/api/transactions'), dataToSend, { headers: { Authorization: `Bearer ${token}` } });
      setFormData({ amount: '', type: 'expense', category: 'Ăn uống', note: '', date: getTodayDate() });
      setShowAddForm(false);
      await fetchTransactions();
      setChartRefreshKey((key) => key + 1);
      alert('✅ Đã thêm giao dịch thành công!');
    } catch (error) {
      alert('❌ Lỗi: ' + (error.response?.data?.message || 'Không thể kết nối Backend!'));
    }
  };

  const handleGetAIAdvice = async () => {
    setLoadingAI(true);
    try {
      const res = await axios.post(apiUrl('/api/insights/generate'), {}, { headers: { Authorization: `Bearer ${token}` } });
      setAiAdvice(res.data.insight.aiResponse);
    } catch (error) {
      alert('❌ Lỗi gọi AI: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')) return;
    try {
      await axios.delete(apiUrl(`/api/transactions/${id}`), { headers: { Authorization: `Bearer ${token}` } });
      fetchTransactions();
      setChartRefreshKey((key) => key + 1);
    } catch {
      alert('❌ Lỗi khi xóa giao dịch!');
    }
  };

  const handleSaveBudget = async () => {
    try {
      await axios.put(apiUrl('/api/auth/budget'), { budget: tempBudget }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBudget(tempBudget);
      setIsEditingBudget(false);
      
      const savedUser = JSON.parse(localStorage.getItem('user'));
      if (savedUser) {
        savedUser.monthlyBudget = tempBudget;
        localStorage.setItem('user', JSON.stringify(savedUser));
      }
      
      alert('✅ Đã lưu hạn mức ngân sách!');
    } catch (error) {
      alert('❌ Không thể lưu ngân sách: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date || t.createdAt);
    return (date.getMonth() + 1) === filterMonth && date.getFullYear() === filterYear;
  });

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const netChange = totalIncome - totalExpense;
  const trendSign = netChange >= 0 ? '+' : '';

  const budgetPercent = budget > 0 ? (totalExpense / budget) * 100 : 0;
  const isWarning = budgetPercent >= 80 && budgetPercent < 100;
  const isDanger = budgetPercent >= 100;

  const remainingBudget = budget > totalExpense ? budget - totalExpense : 0;
  const safeToSpend = Math.max(0, balance - remainingBudget);

  const seoTags = (
    <Helmet>
      <title>Moneo - Hệ Điều Hành Tài Chính Cá Nhân</title>
      <meta name="description" content="Moneo - Ứng dụng quản lý tài chính cá nhân thông minh." />
    </Helmet>
  );

  if (!token) {
    return (
      <HelmetProvider>
        {seoTags}
        <div style={{ background: '#F4F6F8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Auth onLoginSuccess={(newToken, userData) => {
            setToken(newToken);
            if (userData) {
              let accounts = JSON.parse(localStorage.getItem('saved_accounts')) || [];
              if (!accounts.some(acc => acc.email === userData.email)) {
                accounts.push(userData);
                localStorage.setItem('saved_accounts', JSON.stringify(accounts));
              }
            }
          }} />
        </div>
      </HelmetProvider>
    );
  }

  const sidebarItems = [
    { id: '01', icon: LayoutGrid, label: 'Tổng quan' },
    { id: '02', icon: ArrowRightLeft, label: 'Giao dịch' },
    { id: '03', icon: PieChartIcon, label: 'Phân tích' },
    { id: '04', icon: BookOpen, label: 'Khoản vay & Tài sản' },
    { id: '05', icon: Target, label: 'Mục tiêu & Kế hoạch' },
    { id: '06', icon: Sparkles, label: 'Moneo Copilot AI' },
  ];

  return (
    <HelmetProvider>
      {seoTags}
      <div className="app-layout">
        {/* Overlay mờ màn hình khi mở menu mobile */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 40
            }}
          />
        )}

        {/* Sidebar Responsive */}
        <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon"><Wallet size={20} color="white" /></div>
            <div className="sidebar-logo-text"><h2>moneo</h2><span>Personal Finance OS</span></div>
            <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} color="white" />
            </button>
          </div>
          <nav className="sidebar-menu">
            {sidebarItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button 
                  key={item.id} 
                  className={`sidebar-item ${activeMenu === item.id ? 'active' : ''}`} 
                  onClick={() => goTo(item.id)}
                >
                  <IconComponent size={18} /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="main-content">
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
                <Menu size={22} color="#1e293b" />
              </button>
              {activeMenu !== '01' && (
                <button type="button" className="back-btn" onClick={() => goTo('01')} aria-label="Quay lại Tổng quan" title="Quay lại Tổng quan">
                  <ArrowLeft size={20} />
                </button>
              )}
              <div>
                <h1 className="page-title">
                  {activeMenu === '01' && 'Tổng quan tài chính'}{activeMenu === '02' && 'Sổ quản lý giao dịch'}{activeMenu === '03' && 'Phân tích & Báo cáo'}{activeMenu === '04' && 'Khoản vay & Công nợ'}{activeMenu === '05' && 'Lập kế hoạch & Mục tiêu'}{activeMenu === '06' && 'Trợ lý Moneo Copilot AI'}
                </h1>
                <div className="page-subtitle">Dữ liệu kỳ T{filterMonth}/{filterYear}</div>
              </div>
            </div>

            <div className="header-actions">
              <div className="date-filter-box">
                <Calendar size={15} color="#64748b" />
                <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} style={{ border: 'none', padding: 0, width: 'auto', fontSize: '13px', fontWeight: '600', outline: 'none' }}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
                <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} style={{ border: 'none', padding: 0, width: 'auto', fontSize: '13px', fontWeight: '600', outline: 'none' }}>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>Năm {y}</option>)}
                </select>
              </div>
              <UserDropdown onOpenProfile={() => setShowProfile(true)} onLogout={handleLogout} />
            </div>
          </header>

          {showProfile && <ProfileModal onClose={() => setShowProfile(false)} token={token} />}

          {activeMenu === '01' && (
            <div>
              <div className="dashboard-hero-card">
                <div className="balance-title">Số dư ròng hiện tại</div>
                <h2 className="balance-amount">{balance.toLocaleString('vi-VN')} đ</h2>
                <div className="balance-trend"><TrendingUp size={14} /> {trendSign}{(netChange / 1000000).toFixed(1)} triệu đ biến động thuần trong kỳ</div>
                <div className="hero-stats">
                  <div><div className="stat-label">Tổng thu</div><div className="stat-value">{totalIncome.toLocaleString('vi-VN')} đ</div></div>
                  <div><div className="stat-label">Tổng chi</div><div className="stat-value">{totalExpense.toLocaleString('vi-VN')} đ</div></div>
                </div>
              </div>
              <div className="grid-2-cols">
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#3478F6' }}><Wallet size={16} /> <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Có thể chi tiêu</span></div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#1e293b' }}>{safeToSpend.toLocaleString('vi-VN')} đ</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Đã trừ đi hạn mức ngân sách tháng {filterMonth}</span>
                </div>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#0D9668' }}><Target size={16} /> <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Ngân sách còn lại</span></div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#1e293b' }}>{budget > 0 ? `${remainingBudget.toLocaleString('vi-VN')} đ` : 'Chưa thiết lập'}</h3>
                  {budget > 0 && (<div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${Math.min(budgetPercent, 100)}%`, height: '100%', background: isDanger ? '#C54B40' : '#0D9668' }}></div></div>)}
                </div>
              </div>
              <div className="card" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                <div className="card-header" style={{ border: 'none', padding: 0, marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0D9668', fontWeight: '700' }}><Sparkles size={18} /> Moneo Insight</div>
                  <span style={{ fontSize: '11px', background: '#0D9668', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>AI</span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.6', color: '#334155' }}>Tháng này bạn dư ra <strong>{netChange.toLocaleString('vi-VN')} đ</strong>. Mức chi tiêu hiện tại đang chiếm {budget > 0 ? budgetPercent.toFixed(1) : 0}% ngân sách. Hãy xem xét phân bổ phần thặng dư vào các mục tiêu dài hạn.</p>
                <button onClick={() => goTo('06')} style={{ background: 'none', border: 'none', color: '#0D9668', fontWeight: '700', padding: 0, cursor: 'pointer', fontSize: '13px' }}>Xem phân tích chi tiết →</button>
              </div>
              <div className="card">
                <div className="card-header"><span>Giao dịch gần đây</span><button onClick={() => goTo('02')} style={{ background: 'none', border: 'none', color: '#3478F6', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Xem tất cả →</button></div>
                <ul className="tx-list">
                  {filteredTransactions.slice(0, 4).map((t) => (
                    <li key={t._id} className="tx-item">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="tx-icon-bg">{t.type === 'expense' ? <TrendingDown size={18} color="#C54B40" /> : <TrendingUp size={18} color="#0D9668" />}</div>
                        <div><strong style={{ display: 'block', fontSize: '14px', color: '#1e293b' }}>{t.category}</strong><span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(t.date || t.createdAt).toLocaleDateString('vi-VN')} {t.note && `• ${t.note}`}</span></div>
                      </div>
                      <strong className={`tx-amount ${t.type === 'expense' ? 'text-red' : 'text-emerald'}`} style={{ fontSize: '15px' }}>{t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString('vi-VN')} đ</strong>
                    </li>
                  ))}
                  {filteredTransactions.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '15px 0', margin: 0, fontSize: '13px' }}>Chưa có giao dịch nào trong tháng này.</p>}
                </ul>
              </div>
            </div>
          )}

          {activeMenu === '02' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <button className="btn-secondary" onClick={() => { if (!showAddForm) { setFormData({ amount: '', type: 'expense', category: 'Ăn uống', note: '', date: getTodayDate() }); } setShowAddForm(!showAddForm); }} style={{ backgroundColor: showAddForm ? '#C54B40' : '#0D9668' }}>
                  <Plus size={16} /> {showAddForm ? 'Hủy form' : 'Thêm giao dịch'}
                </button>
                <button className="btn-outline" onClick={() => {
                  if (filteredTransactions.length === 0) return alert('Không có dữ liệu để xuất!');
                  const exportData = filteredTransactions.map(t => ({ 'Ngày': new Date(t.date || t.createdAt).toLocaleDateString('vi-VN'), 'Loại': t.type === 'income' ? 'Thu' : 'Chi', 'Danh mục': t.category, 'Số tiền (đ)': t.amount, 'Ghi chú': t.note || '' }));
                  const worksheet = XLSX.utils.json_to_sheet(exportData);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, `Thang_${filterMonth}_${filterYear}`);
                  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
                  const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
                  saveAs(dataBlob, `Bao_Cao_Moneo_T${filterMonth}_${filterYear}.xlsx`);
                }}><FileText size={16} /> Xuất Excel</button>
              </div>

              {showAddForm && (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #10b981', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 20px 0', color: '#1e293b' }}>Nhập giao dịch mới</h3>
                  <form onSubmit={handleSubmit} className="form-grid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Số tiền (đ)</label><input type="number" name="amount" value={formData.amount} onChange={handleChange} required placeholder="VD: 55000" style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Loại giao dịch</label><select name="type" value={formData.type} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}><option value="expense">Khoản chi</option><option value="income">Khoản thu</option></select></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Ngày giao dịch</label><input type="date" name="date" value={formData.date} onChange={handleChange} max={getTodayDate()} required style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Danh mục</label><select name="category" value={formData.category} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}><option value="Ăn uống">Ăn uống</option><option value="Di chuyển">Di chuyển</option><option value="Mua sắm">Mua sắm</option><option value="Nhà cửa">Nhà cửa</option><option value="Tiền lương">Tiền lương</option><option value="Khác">Khác</option></select></div>
                    <div className="full-width-field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Ghi chú</label><input type="text" name="note" value={formData.note} onChange={handleChange} placeholder="VD: Cà phê sáng" style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} /></div>
                    <div className="full-width-field" style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <button type="submit" style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Lưu thông tin</button>
                      <button type="button" onClick={() => setShowAddForm(false)} style={{ backgroundColor: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>Đóng</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="card">
                <div className="card-header">Lịch sử giao dịch tháng {filterMonth}/{filterYear}</div>
                <ul className="tx-list">
                  {filteredTransactions.map((t) => (
                    <li key={t._id} className="tx-item">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="tx-icon-bg">{t.type === 'expense' ? <TrendingDown size={18} color="#C54B40" /> : <TrendingUp size={18} color="#0D9668" />}</div>
                        <div><strong style={{ display: 'block', fontSize: '14px', color: '#1e293b' }}>{t.category}</strong><span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(t.date || t.createdAt).toLocaleDateString('vi-VN')} - {t.note || 'Không có ghi chú'}</span></div>
                      </div>
                      <div className="tx-actions">
                        <strong className={`tx-amount ${t.type === 'expense' ? 'text-red' : 'text-emerald'}`} style={{ fontSize: '15px' }}>{t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString('vi-VN')} đ</strong>
                        <button className="tx-delete" onClick={() => handleDelete(t._id)} aria-label="Xóa giao dịch"><Trash2 size={16} /></button>
                      </div>
                    </li>
                  ))}
                  {transactionsError && <p role="alert" style={{ textAlign: 'center', color: '#C54B40' }}>{transactionsError}</p>}
                  {!transactionsError && filteredTransactions.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0' }}>Không có giao dịch nào trong tháng này.</p>}
                </ul>
              </div>
            </div>
          )}

          {activeMenu === '03' && ( <div style={{ width: '100%', overflowX: 'auto' }}><DashboardChart data={filteredTransactions} /></div> )}
          {activeMenu === '04' && ( <BorrowTracker /> )}

          {activeMenu === '05' && (
            <div>
              <div className="card">
                <div className="card-header">
                  <span>Hạn mức ngân sách tháng {filterMonth}</span>
                  {!isEditingBudget ? (
                    <button className="btn-outline" onClick={() => { setIsEditingBudget(true); setTempBudget(budget); }}>Thiết lập</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" value={tempBudget} onChange={(e) => setTempBudget(Number(e.target.value))} style={{ width: '140px', padding: '6px 10px' }} />
                      <button className="btn-secondary" style={{ height: '34px', padding: '0 12px' }} onClick={handleSaveBudget}>Lưu</button>
                      <button className="btn-outline" style={{ height: '34px', padding: '0 12px' }} onClick={() => setIsEditingBudget(false)}>Hủy</button>
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#64748b' }}>
                    <span>Đã chi: <strong>{totalExpense.toLocaleString('vi-VN')} đ</strong></span>
                    <span>Hạn mức: <strong>{budget > 0 ? budget.toLocaleString('vi-VN') + ' đ' : 'Chưa có'}</strong></span>
                  </div>
                  {budget > 0 && (<div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: `${Math.min(budgetPercent, 100)}%`, height: '100%', background: isDanger ? '#C54B40' : isWarning ? '#f59e0b' : '#0D9668' }}></div></div>)}
                </div>
              </div>
              <GoalTracker token={token} refreshKey={chartRefreshKey} currentBalance={balance} />
              <BillTracker />
            </div>
          )}

          {activeMenu === '06' && (
            <div className="card">
              <div className="card-header"><div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#183B35' }}><Sparkles size={20} /> Moneo Copilot AI</div></div>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: 0 }}>Hệ thống AI phân tích sâu lịch sử thu chi, tự động cảnh báo rủi ro vỡ ngân sách và đưa ra lời khuyên tối ưu dòng tiền cá nhân.</p>
              {!aiAdvice && !loadingAI && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                   <span style={{ background: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare size={14}/> Dự báo số dư cuối tháng?</span>
                   <span style={{ background: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare size={14}/> Tôi có đang chi tiêu quá mức?</span>
                </div>
              )}
              <button onClick={handleGetAIAdvice} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }} disabled={loadingAI}>
                {loadingAI ? '⏳ Đang phân tích dữ liệu...' : '✨ Phân tích tài chính cá nhân'}
              </button>
              {aiAdvice && (<div style={{ marginTop: '20px', padding: '20px', background: '#F8FAF8', border: '1px solid #E2E8E0', borderRadius: '12px', lineHeight: '1.7', color: '#1e293b' }}><ReactMarkdown>{aiAdvice}</ReactMarkdown></div>)}
            </div>
          )}
        </main>
      </div>
    </HelmetProvider>
  );
}

export default App;