import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Clock, CheckCircle2, Plus } from 'lucide-react';
import { apiUrl } from '../config/api';

function BillTracker() {
  const [bills, setBills] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBill, setNewBill] = useState({ title: '', amount: '', dueDate: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const token = localStorage.getItem('token');

  const fetchBills = async () => {
    if (!token) return;
    try {
      const res = await axios.get(apiUrl('/api/bills'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBills(res.data);
    } catch (error) {
      console.error('Lỗi tải hóa đơn:', error);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [token]);

  const handleAddBill = async (e) => {
    e.preventDefault();
    try {
      await axios.post(apiUrl('/api/bills'), {
        title: newBill.title,
        amount: Number(newBill.amount),
        dueDate: newBill.dueDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewBill({ title: '', amount: '', dueDate: '' });
      setShowAddForm(false);
      fetchBills();
    } catch (error) {
      alert('❌ Lỗi thêm hóa đơn!');
    }
  };

  const handlePayBill = async (billId, title, amount) => {
    const isConfirm = window.confirm(`Xác nhận thanh toán "${title}" trị giá ${amount.toLocaleString('vi-VN')} đ?\n\nHành động này sẽ tự động tạo một giao dịch chi phí.`);
    if (!isConfirm) return;

    setIsProcessing(true);
    try {
      const today = new Date();
      const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Tạo giao dịch chi phí
      await axios.post(apiUrl('/api/transactions'), {
        amount: Number(amount),
        type: 'expense',
        category: 'Nhà cửa',
        note: `Thanh toán hóa đơn: ${title}`,
        date: formattedDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cập nhật trạng thái hóa đơn thành 'paid'
      await axios.put(apiUrl(`/api/bills/${billId}`), { status: 'paid' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`✅ Đã thanh toán và ghi nhận khoản chi ${amount.toLocaleString('vi-VN')} đ vào hệ thống!`);
      
      fetchBills();
      window.location.reload(); // Tải lại để cập nhật biểu đồ & giao dịch tổng

    } catch (error) {
      alert('❌ Lỗi khi đồng bộ thanh toán. Vui lòng thử lại!');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (billId) => {
    if (window.confirm('Bạn muốn xóa hóa đơn này khỏi danh sách?')) {
      try {
        await axios.delete(apiUrl(`/api/bills/${billId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchBills();
      } catch (error) {
        alert('❌ Lỗi xóa hóa đơn');
      }
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span>Quản lý hóa đơn</span>
        <button 
          className="btn-outline" 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ height: '34px', padding: '0 12px', fontSize: '13px' }}
        >
          <Plus size={16} /> Thêm hóa đơn
        </button>
      </div>

      {showAddForm && (
        <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <form onSubmit={handleAddBill} style={{ display: 'grid', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tên hóa đơn</label>
              <input type="text" required value={newBill.title} onChange={(e) => setNewBill({...newBill, title: e.target.value})} placeholder="VD: Tiền điện tháng 10" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Số tiền (đ)</label>
                <input type="number" required value={newBill.amount} onChange={(e) => setNewBill({...newBill, amount: e.target.value})} placeholder="VD: 500000" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Hạn chót</label>
                <input type="date" required value={newBill.dueDate} onChange={(e) => setNewBill({...newBill, dueDate: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="submit" className="btn-secondary" style={{ height: '34px' }}>Lưu hóa đơn</button>
              <button type="button" className="btn-outline" style={{ height: '34px' }} onClick={() => setShowAddForm(false)}>Hủy</button>
            </div>
          </form>
        </div>
      )}
      
      {bills.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px 0' }}>
          Bạn chưa thêm hóa đơn nào.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bills.map(bill => (
            <div key={bill._id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              padding: '16px', borderRadius: '12px', border: '1px solid',
              borderColor: bill.status === 'paid' ? '#e2e8f0' : '#bbf7d0',
              background: bill.status === 'paid' ? '#f8fafc' : '#f0fdf4'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bill.status === 'paid' ? '#e2e8f0' : '#0D9668',
                  color: bill.status === 'paid' ? '#94a3b8' : 'white'
                }}>
                  {bill.status === 'paid' ? <CheckCircle2 size={20} /> : <CreditCard size={20} />}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: bill.status === 'paid' ? '#94a3b8' : '#1e293b' }}>
                    {bill.title}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Hạn chót: {new Date(bill.dueDate).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <strong style={{ fontSize: '16px', color: bill.status === 'paid' ? '#94a3b8' : '#1e293b' }}>
                  {bill.amount.toLocaleString('vi-VN')} đ
                </strong>
                
                {bill.status === 'pending' ? (
                  <button 
                    onClick={() => handlePayBill(bill._id, bill.title, bill.amount)}
                    disabled={isProcessing}
                    style={{
                      background: '#0D9668', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', 
                      fontSize: '13px', fontWeight: '600', cursor: isProcessing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Thanh toán ngay
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                      Đã hoàn tất
                    </span>
                    <button 
                      onClick={() => handleDelete(bill._id)}
                      style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 0 }}
                      title="Xóa hóa đơn"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BillTracker;