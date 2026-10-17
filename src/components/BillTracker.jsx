import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Clock, CheckCircle2, Plus } from 'lucide-react';

function BillTracker() {
  // 1. Tự động lấy dữ liệu từ localStorage (Trống nếu chưa có gì)
  const [bills, setBills] = useState(() => {
    const savedBills = localStorage.getItem('moneo_bills');
    if (savedBills) return JSON.parse(savedBills);
    return []; // Không còn dữ liệu code cứng nữa
  });
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBill, setNewBill] = useState({ title: '', amount: '', dueDate: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const token = localStorage.getItem('token');

  // 2. Tự động lưu mọi thay đổi của hóa đơn vào bộ nhớ trình duyệt
  useEffect(() => {
    localStorage.setItem('moneo_bills', JSON.stringify(bills));
  }, [bills]);

  // Hàm xử lý thêm hóa đơn từ Giao diện
  const handleAddBill = (e) => {
    e.preventDefault();
    const bill = {
      id: Date.now(), // Tạo ID ngẫu nhiên
      title: newBill.title,
      amount: Number(newBill.amount),
      dueDate: newBill.dueDate,
      status: 'pending' // Mặc định là chưa thanh toán
    };
    setBills([...bills, bill]);
    setNewBill({ title: '', amount: '', dueDate: '' });
    setShowAddForm(false);
  };

  // Hàm xử lý thanh toán và bắn API tạo giao dịch
  const handlePayBill = async (billId, title, amount) => {
    const isConfirm = window.confirm(`Xác nhận thanh toán "${title}" trị giá ${amount.toLocaleString('vi-VN')} đ?\n\nHành động này sẽ tự động tạo một giao dịch chi phí.`);
    if (!isConfirm) return;

    setIsProcessing(true);
    try {
      // Bắn API lên Backend để tạo giao dịch thực
      await axios.post('https://api-tai-chinh.onrender.com/api/transactions', {
        amount: Number(amount),
        type: 'expense',
        category: 'Nhà cửa',
        note: `Thanh toán hóa đơn: ${title}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Đổi trạng thái hóa đơn thành 'paid' và ép lưu vào localStorage ngay lập tức
      const updatedBills = bills.map(b => b.id === billId ? { ...b, status: 'paid' } : b);
      setBills(updatedBills);
      localStorage.setItem('moneo_bills', JSON.stringify(updatedBills));
      
      alert(`✅ Đã thanh toán và ghi nhận khoản chi ${amount.toLocaleString('vi-VN')} đ vào hệ thống!`);
      
      // Reload lại trang (Lúc này an toàn vì dữ liệu hóa đơn đã nằm trong bộ nhớ)
      window.location.reload();

    } catch (error) {
      alert('❌ Lỗi khi đồng bộ thanh toán. Vui lòng thử lại!');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Hàm xóa hóa đơn (Tùy chọn)
  const handleDelete = (billId) => {
    if(window.confirm('Bạn muốn xóa hóa đơn này khỏi danh sách?')) {
      setBills(bills.filter(b => b.id !== billId));
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

      {/* FORM THÊM HÓA ĐƠN TRÊN GIAO DIỆN */}
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
      
      {/* DANH SÁCH HÓA ĐƠN */}
      {bills.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px 0' }}>
          Bạn chưa thêm hóa đơn nào.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bills.map(bill => (
            <div key={bill.id} style={{ 
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
                    <Clock size={12} /> Hạn chót: {bill.dueDate}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <strong style={{ fontSize: '16px', color: bill.status === 'paid' ? '#94a3b8' : '#1e293b' }}>
                  {bill.amount.toLocaleString('vi-VN')} đ
                </strong>
                
                {bill.status === 'pending' ? (
                  <button 
                    onClick={() => handlePayBill(bill.id, bill.title, bill.amount)}
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
                      onClick={() => handleDelete(bill.id)}
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