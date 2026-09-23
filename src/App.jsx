import { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [formData, setFormData] = useState({ amount: '', type: 'expense', category: 'Ăn uống', note: '' });
  const [transactions, setTransactions] = useState([]);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get('https://mern-backend-datn.onrender.com/api/transactions');
      setTransactions(res.data);
    } catch (error) {
      console.error('Lỗi lấy dữ liệu:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData, amount: Number(formData.amount) };
      await axios.post('https://mern-backend-datn.onrender.com/api/transactions', dataToSend);
      alert('✅ Đã thêm giao dịch thành công!');
      setFormData({ amount: '', type: 'expense', category: 'Ăn uống', note: '' });
      fetchTransactions();
    } catch (error) {
      alert('❌ Lỗi kết nối Backend!');
    }
  };

  const handleGetAIAdvice = async () => {
    setLoadingAI(true);
    try {
      const res = await axios.post('https://mern-backend-datn.onrender.com/api/insights/generate');
      setAiAdvice(res.data.insight.aiResponse);
    } catch (error) {
      alert('❌ Lỗi gọi AI: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingAI(false);
    }
  };

  // --- HÀM XỬ LÝ XÓA GIAO DỊCH ---
  const handleDelete = async (id) => {
    const isConfirm = window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?');
    if (!isConfirm) return;

    try {
      await axios.delete(`https://mern-backend-datn.onrender.com/api/transactions/${id}`);
      fetchTransactions(); // Gọi lại dữ liệu để tự động cập nhật số dư và biểu đồ
    } catch (error) {
      alert('❌ Lỗi khi xóa giao dịch!');
      console.error(error);
    }
  };

  const expenseData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category, value: curr.amount });
      }
      return acc;
    }, []);

  const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="container">
      <h1 style={{ textAlign: 'center' }}>💰 Trợ lý Tài chính AI</h1>
      
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
        <h2>📊 Phân Bổ Chi Tiêu</h2>
        {expenseData.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString('vi-VN') + ' VNĐ'} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#888' }}>Chưa có khoản chi nào để thống kê.</p>
        )}
      </div>

      <div className="card">
        <h2>➕ Thêm Giao Dịch Mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Số tiền (VNĐ):</label>
            <input type="number" name="amount" value={formData.amount} onChange={handleChange} required placeholder="VD: 55000"/>
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
            <input type="text" name="note" value={formData.note} onChange={handleChange} placeholder="VD: Cà phê sáng"/>
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
                <strong>{t.category}</strong> <br/>
                <small style={{ color: '#7f8c8d' }}>{t.note || 'Không có ghi chú'}</small>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span className="amount">
                  {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString('vi-VN')} VNĐ
                </span>
                
                {/* --- NÚT XÓA --- */}
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
          {transactions.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>Chưa có giao dịch nào.</p>}
        </ul>
      </div>
    </div>
  );
}

export default App;