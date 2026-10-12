import { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Helmet, HelmetProvider } from 'react-helmet-async'; // Đã thêm thư viện SEO
import DashboardChart from './components/DashboardChart';
import Auth from './components/Auth';
import BorrowTracker from './components/BorrowTracker';
import ProfileModal from './components/ProfileModal';
import UserDropdown from './components/UserDropdown';
import './App.css';

const requestTransactions = async (token) => {
  const res = await axios.get('http://localhost:5000/api/transactions', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const responseData = res.data;
  if (Array.isArray(responseData)) return responseData;
  if (Array.isArray(responseData.data)) return responseData.data;
  if (Array.isArray(responseData.transactions)) return responseData.transactions;
  return [];
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [showProfile, setShowProfile] = useState(false);

  const [formData, setFormData] = useState({ amount: '', type: 'expense', category: 'Ăn uống', note: '' });
  const [transactions, setTransactions] = useState([]);
  const [transactionsError, setTransactionsError] = useState('');
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const fetchTransactions = async () => {
    if (!token) {
      setTransactions([]);
      setTransactionsError('');
      return false;
    }
    try {
      setTransactions(await requestTransactions(token));
      setTransactionsError('');
      return true;
    } catch (error) {
      console.error('Lỗi lấy dữ liệu giao dịch:', error);
      setTransactionsError(error.response?.data?.message || 'Không thể tải lịch sử giao dịch. Vui lòng thử lại.');
      return false;
    }
  };

  useEffect(() => {
    if (!token) return undefined;

    let isCurrent = true;
    requestTransactions(token)
      .then((dataList) => {
        if (isCurrent) {
          setTransactions(dataList);
          setTransactionsError('');
        }
      })
      .catch((error) => {
        console.error('Lỗi lấy dữ liệu giao dịch:', error);
        if (isCurrent) {
          setTransactionsError(error.response?.data?.message || 'Không thể tải lịch sử giao dịch. Vui lòng thử lại.');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [token]);

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
      await axios.post('http://localhost:5000/api/transactions', dataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFormData({ amount: '', type: 'expense', category: 'Ăn uống', note: '' });
      const historyLoaded = await fetchTransactions();
      setChartRefreshKey((key) => key + 1);
      alert(historyLoaded
        ? '✅ Đã thêm giao dịch thành công!'
        : '✅ Giao dịch đã được lưu, nhưng chưa thể tải lại lịch sử. Vui lòng thử tải lại trang.');
    } catch (error) {
      alert('❌ Lỗi: ' + (error.response?.data?.message || 'Không thể kết nối Backend!'));
    }
  };

  const handleGetAIAdvice = async () => {
    setLoadingAI(true);
    try {
      const res = await axios.post('http://localhost:5000/api/insights/generate', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiAdvice(res.data.insight.aiResponse);
    } catch (error) {
      alert('❌ Lỗi gọi AI: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirm = window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?');
    if (!isConfirm) return;
    try {
      await axios.delete(`http://localhost:5000/api/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTransactions();
    } catch {
      alert('❌ Lỗi khi xóa giao dịch!');
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Cấu trúc dữ liệu SEO - Google Bot sẽ đọc phần này
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Trợ lý Tài chính AI",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web Application",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "125"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "VND"
    }
  };

  // Các thẻ meta dùng chung cho cả trạng thái chưa đăng nhập và đã đăng nhập
  const seoTags = (
    <Helmet>
      <title>Trợ lý Tài chính AI - Quản Lý Chi Tiêu & Công Nợ</title>
      <meta name="description" content="Ứng dụng quản lý tài chính cá nhân, theo dõi thu chi và nhận lời khuyên thông minh từ AI." />
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );

  if (!token) {
    return (
      <HelmetProvider>
        {seoTags}
        <div className="container" style={{ background: '#f4f7f6', minHeight: '100vh', padding: '1px' }}>
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

  return (
    <HelmetProvider>
      {seoTags}
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>💰 Trợ lý Tài chính AI</h1>
          <UserDropdown
            onOpenProfile={() => setShowProfile(true)}
            onLogout={handleLogout}
          />
        </div>

        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} token={token} />}

        <div className="summary-container">
          <div className="summary-card income">
            <h3>Tổng Thu</h3>
            <p>{totalIncome.toLocaleString('vi-VN')} VNĐ</p>
          </div>
          <div className="summary-card expense">
            <h3>Tổng Chi</h3>
            <p>{totalExpense.toLocaleString('vi-VN')} VNĐ</p>
          </div>
          <div className="summary-card balance">
            <h3>Số Dư</h3>
            <p>{balance.toLocaleString('vi-VN')} VNĐ</p>
          </div>
        </div>

        <div className="card">
          <DashboardChart token={token} refreshKey={chartRefreshKey} />
        </div>

        <div className="card">
          <h2>➕ Thêm Giao Dịch Mới</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Số tiền (VNĐ):</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} required placeholder="VD: 55000" />
            </div>
            <div className="form-group">
              <label>Loại giao dịch:</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="expense">Khoản chi</option>
                <option value="income">Khoản thu</option>
              </select>
            </div>
            <div className="form-group">
              <label>Danh mục:</label>
              <select name="category" value={formData.category} onChange={handleChange}>
                <option value="Ăn uống">Ăn uống</option>
                <option value="Di chuyển">Di chuyển</option>
                <option value="Mua sắm">Mua sắm</option>
                <option value="Nhà cửa">Nhà cửa</option>
                <option value="Tiền lương">Tiền lương</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div className="form-group">
              <label>Ghi chú:</label>
              <input type="text" name="note" value={formData.note} onChange={handleChange} placeholder="VD: Cà phê sáng" />
            </div>
            <button type="submit" className="btn-submit">Thêm Giao Dịch</button>
          </form>
        </div>

        <div className="card ai-card">
          <h2>🤖 AI Phân Tích & Tư Vấn</h2>
          <button onClick={handleGetAIAdvice} className="btn-ai" disabled={loadingAI}>
            {loadingAI ? '⏳ Đang phân tích dữ liệu...' : '✨ Phân tích chi tiêu của tôi'}
          </button>
          {aiAdvice && (
            <div className="ai-result">
              <ReactMarkdown>{aiAdvice}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="card">
          <h2>📜 Lịch sử giao dịch</h2>
          <ul className="transaction-list">
            {transactions.map((t) => (
              <li key={t._id} className={t.type === 'expense' ? 'expense-item' : 'income-item'}>
                <div>
                  <strong>{t.category}</strong> <br />
                  <small style={{ color: '#7f8c8d' }}>{t.note || 'Không có ghi chú'}</small>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span className="amount">
                    {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString('vi-VN')} VNĐ
                  </span>

                  <button
                    onClick={() => handleDelete(t._id)}
                    style={{
                      background: '#ff4757', color: 'white', border: 'none',
                      padding: '6px 12px', borderRadius: '4px', cursor: 'pointer',
                      fontWeight: 'bold', fontSize: '13px'
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
            {transactionsError && <p role="alert" style={{ textAlign: 'center', color: '#c0392b' }}>{transactionsError}</p>}
            {!transactionsError && transactions.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>Chưa có giao dịch nào.</p>}
          </ul>
        </div>

        <div className="card">
          <BorrowTracker />
        </div>

      </div>
    </HelmetProvider>
  );
}

export default App;