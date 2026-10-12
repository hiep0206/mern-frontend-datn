import React, { useState, useEffect } from 'react';

const getDefaultDueDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

const formatVN = (dateStr) => {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatTimeVN = (dateStr) => {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${formatVN(dateStr)}`;
};

const BorrowTracker = () => {
  const [records, setRecords] = useState([]);
  const [modalImage, setModalImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); 
  const [filterStatus, setFilterStatus] = useState('all'); 

  const token = localStorage.getItem('token');

  const initialForm = {
    type: 'lend', category: 'money', partner: '', amount: '', itemName: '', 
    dueDate: getDefaultDueDate(), interestRate: 0, interestType: 'none', notes: '', proofImage: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchRecords = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/borrows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) { 
      console.error('Lỗi fetch:', error); 
      setRecords([]);
    }
  };
  
  useEffect(() => { fetchRecords(); }, [token]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, proofImage: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = (record) => {
    setEditingId(record._id);
    setFormData({
      type: record.type, category: record.category, partner: record.partner,
      amount: record.amount || '', itemName: record.itemName || '',
      dueDate: record.dueDate ? record.dueDate.split('T')[0] : '',
      interestRate: record.interestRate, interestType: record.interestType,
      notes: record.notes || '', proofImage: record.proofImage || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (!submitData.dueDate) delete submitData.dueDate;
      if (submitData.category === 'item') {
        submitData.amount = 0; submitData.interestRate = 0; submitData.interestType = 'none';
      } else {
        submitData.itemName = ''; submitData.amount = Number(submitData.amount);
      }

      const url = editingId ? `http://localhost:5000/api/borrows/${editingId}` : 'http://localhost:5000/api/borrows';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, { 
        method, 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }, 
        body: JSON.stringify(submitData) 
      });

      const responseData = await res.json();
      if (!res.ok) {
        return alert('❌ Lỗi từ Backend: ' + (responseData.message || 'Không thể lưu bản ghi'));
      }
      
      setFormData(initialForm);
      setEditingId(null);
      if(document.getElementById('file-upload')) document.getElementById('file-upload').value = '';
      fetchRecords();
    } catch (error) { 
      alert('❌ Lỗi kết nối server!'); 
    }
  };

  const handlePayment = async (record) => {
    let payload = {};
    if (record.category === 'money') {
      const totalDue = record.amount + (record.amount * (record.interestRate / 100));
      const amountStr = window.prompt(`Tổng cần trả: ${totalDue.toLocaleString()}đ\nĐã trả: ${record.amountPaid.toLocaleString()}đ\n\nNhập số tiền khách trả đợt này:`);
      if (!amountStr || isNaN(amountStr)) return;
      payload = { paymentAmount: Number(amountStr) };
    } else {
      if(!window.confirm('Xác nhận đã nhận lại / trả lại đồ vật này?')) return;
    }
    
    const res = await fetch(`http://localhost:5000/api/borrows/${record._id}/payment`, {
      method: 'PUT', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }, 
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errData = await res.json();
      return alert('❌ Lỗi thanh toán: ' + (errData.message || 'Không thể xử lý'));
    }
    fetchRecords();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa khoản này vĩnh viễn?")) return;
    const res = await fetch(`http://localhost:5000/api/borrows/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      return alert('❌ Lỗi khi xóa bản ghi từ server');
    }
    fetchRecords();
  };

  const safeRecords = Array.isArray(records) ? records : [];

  const filteredRecords = safeRecords.filter(record => {
    const matchSearch = (record.partner && record.partner.toLowerCase().includes(searchTerm.toLowerCase())) || 
                        (record.itemName && record.itemName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchType = filterType === 'all' || record.category === filterType;
    let matchStatus = true;
    if (filterStatus === 'settled') matchStatus = record.status === 'settled';
    if (filterStatus === 'open') matchStatus = record.status !== 'settled';
    if (filterStatus === 'overdue') matchStatus = record.status === 'overdue';
    
    return matchSearch && matchType && matchStatus;
  });

  const totalLend = safeRecords.filter(r => r.type === 'lend' && r.category === 'money' && r.status !== 'settled')
                             .reduce((sum, r) => sum + (r.amount + (r.amount * r.interestRate / 100) - r.amountPaid), 0);
  const totalBorrow = safeRecords.filter(r => r.type === 'borrow' && r.category === 'money' && r.status !== 'settled')
                              .reduce((sum, r) => sum + (r.amount + (r.amount * r.interestRate / 100) - r.amountPaid), 0);
  const totalOverdue = safeRecords.filter(r => r.status === 'overdue' && r.category === 'money')
                                .reduce((sum, r) => sum + (r.amount + (r.amount * r.interestRate / 100) - r.amountPaid), 0);

  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="borrow-tracker-container">
      <style>{`
        @media (max-width: 768px) {
          .borrow-table thead { display: none; }
          .borrow-table, .borrow-table tbody, .borrow-table tr, .borrow-table td { display: block; width: 100%; }
          .borrow-table tr { margin-bottom: 15px; border: 1px solid #dfe4ea; border-radius: 10px; padding: 10px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
          .borrow-table td { text-align: right; padding: 10px 10px 10px 45% !important; position: relative; border-bottom: 1px dashed #f1f2f6; min-height: 40px; }
          .borrow-table td:last-child { border-bottom: none; text-align: center; padding-left: 10px !important; }
          .borrow-table td::before { content: attr(data-label); position: absolute; left: 10px; top: 12px; font-weight: bold; color: #57606f; font-size: 13px; text-align: left; width: 40%; white-space: nowrap; }
        }
        .filter-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; background: #fff; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .filter-bar input, .filter-bar select { padding: 8px 12px; border: 1px solid #dcdde1; border-radius: 6px; outline: none; flex: 1; min-width: 150px; }
        .history-btn { font-size: 11px; color: #3498db; cursor: pointer; text-decoration: underline; margin-left: 5px; }
      `}</style>

      <h2 className="borrow-tracker-title" style={{ marginBottom: '15px' }}>📒 Sổ Quản Lý Công Nợ & Mượn Đồ</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: '#e8f5e9', padding: '10px 12px', borderRadius: '6px', borderLeft: '4px solid #2ecc71' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#27ae60', fontWeight: 'bold' }}>TỔNG TIỀN CHO MƯỢN</p>
          <h3 style={{ margin: '2px 0 0 0', color: '#2c3e50', fontSize: '17px' }}>{totalLend.toLocaleString()} đ</h3>
        </div>
        <div style={{ background: '#fdedec', padding: '10px 12px', borderRadius: '6px', borderLeft: '4px solid #e74c3c' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#c0392b', fontWeight: 'bold' }}>TỔNG TIỀN ĐI MƯỢN (NỢ)</p>
          <h3 style={{ margin: '2px 0 0 0', color: '#2c3e50', fontSize: '17px' }}>{totalBorrow.toLocaleString()} đ</h3>
        </div>
        <div style={{ background: '#fdf2e9', padding: '10px 12px', borderRadius: '6px', borderLeft: '4px solid #e67e22' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#d35400', fontWeight: 'bold' }}>TỔNG NỢ QUÁ HẠN</p>
          <h3 style={{ margin: '2px 0 0 0', color: '#2c3e50', fontSize: '17px' }}>{totalOverdue.toLocaleString()} đ</h3>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="borrow-form" style={{ background: '#f8f9fa', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <label style={{ cursor: 'pointer', fontWeight: 'bold', color: formData.category === 'money' ? '#2980b9' : '#7f8c8d' }}>
            <input type="radio" checked={formData.category === 'money'} onChange={() => setFormData({...formData, category: 'money'})} style={{ marginRight: '5px' }} /> 
            💵 Giao dịch Tiền
          </label>
          <label style={{ cursor: 'pointer', fontWeight: 'bold', color: formData.category === 'item' ? '#d35400' : '#7f8c8d' }}>
            <input type="radio" checked={formData.category === 'item'} onChange={() => setFormData({...formData, category: 'item'})} style={{ marginRight: '5px' }} /> 
            📦 Mượn / Cho mượn Đồ
          </label>
        </div>

        <div className="form-field">
          <label>Loại giao dịch <span style={{color:'red'}}>*</span></label>
          <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
            <option value="lend">🟢 Mình cho mượn (Khách nợ)</option>
            <option value="borrow">🔴 Mình đi mượn (Mình nợ)</option>
          </select>
        </div>

        <div className="form-field">
          <label>Đối tác <span style={{color:'red'}}>*</span></label>
          <input type="text" placeholder="Tên người, liên hệ..." value={formData.partner} onChange={(e) => setFormData({...formData, partner: e.target.value})} required />
        </div>

        <div className="form-field">
          <label>{formData.category === 'money' ? 'Số tiền gốc (VNĐ)' : 'Tên đồ vật'} <span style={{color:'red'}}>*</span></label>
          {formData.category === 'money' ? (
            <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required min="0" placeholder="VD: 500000" />
          ) : (
            <input type="text" value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} required placeholder="VD: Sổ tay, Sạc pin..." />
          )}
        </div>
        
        <div className="form-field">
          <label>Hạn trả (Mặc định +30 ngày)</label>
          <input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} />
        </div>

        {formData.category === 'money' ? (
           <>
             <div className="form-field">
               <label>Lãi suất (%) - Tùy chọn</label>
               <input type="number" value={formData.interestRate} onChange={(e) => setFormData({...formData, interestRate: e.target.value})} min="0" placeholder="VD: 5" />
             </div>
             <div className="form-field">
               <label>Kỳ hạn lãi</label>
               <select value={formData.interestType} onChange={(e) => setFormData({...formData, interestType: e.target.value})}>
                 <option value="none">Không tính lãi</option>
                 <option value="monthly">%/Tháng</option>
                 <option value="yearly">%/Năm</option>
               </select>
             </div>
           </>
        ) : (
          <div className="form-field" style={{ gridColumn: 'span 2' }}></div>
        )}

        <div className="form-field" style={{ gridColumn: 'span 1' }}>
          <label>Ghi chú</label>
          <input type="text" placeholder="Ghi chú thêm..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
        </div>
        
        <div className="form-field" style={{ gridColumn: 'span 2' }}>
          <label>Ảnh chứng từ (Tùy chọn)</label>
          <div className="file-upload-box">
            <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} style={{ width: '100%', padding: '7px', background: '#fff', border: '1px dashed #dcdde1', borderRadius: '8px' }} />
            {formData.proofImage && <img src={formData.proofImage} alt="Preview" className="preview-img" />}
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData(initialForm); }} style={{ padding: '8px 16px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Hủy Sửa</button>}
          <button type="submit" className="btn-submit-borrow" style={{ width: 'auto', padding: '8px 24px' }}>
            {editingId ? '💾 Cập Nhật' : '✨ Tạo Khoản Mới'}
          </button>
        </div>
      </form>

      {/* THANH BỘ LỌC TÌM KIẾM */}
      <div className="filter-bar">
        <input type="text" placeholder="🔍 Tìm tên người, đồ vật..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">📁 Tất cả (Tiền & Đồ vật)</option>
          <option value="money">💵 Chỉ giao dịch Tiền</option>
          <option value="item">📦 Chỉ Mượn/Cho mượn Đồ</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">📌 Tất cả trạng thái</option>
          <option value="open">⏳ Đang nợ / Đang mở</option>
          <option value="overdue">🚨 Quá hạn</option>
          <option value="settled">✅ Đã hoàn tất</option>
        </select>
      </div>

      <div className="borrow-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
        <table className="borrow-table" style={{ width: '100%', minWidth: '700px' }}>
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Đối tác</th>
              <th style={{ width: '24%' }}>Khoản mượn</th>
              <th style={{ width: '22%' }}>Tiến độ</th>
              <th style={{ width: '18%' }}>Hạn</th>
              <th style={{ width: '18%', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>Không tìm thấy kết quả phù hợp.</td></tr>
            ) : filteredRecords.map(record => {
              const isMoney = record.category === 'money';
              const totalDue = isMoney ? record.amount + (record.amount * (record.interestRate / 100)) : 0;
              const remaining = totalDue - record.amountPaid;
              const progressPercent = totalDue > 0 ? Math.min(100, Math.round((record.amountPaid / totalDue) * 100)) : 0;
              
              const typeColor = record.type === 'lend' ? '#27ae60' : '#e74c3c'; 
              const typeBg = record.type === 'lend' ? '#e8f5e9' : '#fdedec';

              let daysLeftText = '';
              let daysLeftColor = '#7f8c8d'; 
              if (record.dueDate && record.status !== 'settled') {
                const due = new Date(record.dueDate);
                due.setHours(0,0,0,0);
                const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
                
                if (diffDays > 7) {
                  daysLeftText = `(Còn ${diffDays} ngày)`;
                  daysLeftColor = '#7f8c8d';
                } else if (diffDays > 0 && diffDays <= 7) {
                  daysLeftText = `(Còn ${diffDays} ngày)`;
                  daysLeftColor = '#f39c12'; 
                } else if (diffDays === 0) {
                  daysLeftText = `(Hôm nay)`;
                  daysLeftColor = '#e74c3c'; 
                }
              }
              
              let itemStatusColor = '#7f8c8d';
              if (record.status === 'upcoming' || record.status === 'due_today') itemStatusColor = '#f39c12';
              if (record.status === 'overdue') itemStatusColor = '#e74c3c';
              if (record.status === 'settled') itemStatusColor = '#27ae60';
              
              return (
                <tr key={record._id}>
                  <td data-label="Đối tác" style={{ padding: '12px 10px' }}>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: typeColor, background: typeBg, marginBottom: '5px' }}>
                      {record.type === 'lend' ? '↑ Cho mượn' : '↓ Đi mượn'}
                    </span><br/>
                    <strong style={{ color: '#2c3e50', fontSize: '13.5px' }}>{record.partner}</strong>
                  </td>
                  
                  <td data-label="Khoản mượn" style={{ padding: '12px 10px' }}>
                    {isMoney ? (
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c3e50', whiteSpace: 'nowrap' }}>💵 {totalDue.toLocaleString()} đ</div>
                        {record.interestRate > 0 && <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '2px' }}>(Gốc: {record.amount.toLocaleString()}đ | Lãi: {record.interestRate}{record.interestType === 'monthly' ? '%/tháng' : '%/năm'})</div>}
                      </div>
                    ) : (
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📦 {record.itemName}</div>
                    )}
                    {record.notes && <div style={{ fontSize: '11px', color: '#2c3e50', padding: '4px 6px', background: '#f1f2f6', borderRadius: '4px', display: 'inline-block', marginBottom: '5px' }}>📝 {record.notes}</div>}
                    {record.proofImage && <img src={record.proofImage} alt="Chứng từ" onClick={() => setModalImage(record.proofImage)} className="proof-thumb" title="Xem ảnh lớn" style={{cursor: 'pointer'}} />}
                  </td>
                  
                  <td data-label="Tiến độ" style={{ padding: '12px 10px' }}>
                    {isMoney ? (
                      <>
                        <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                          <div style={{ color: '#27ae60', paddingBottom: '2px' }}>
                            Đã trả: <strong>{record.amountPaid.toLocaleString()}đ</strong>
                            {(record.paymentHistory?.length > 0) && (
                              <span className="history-btn" onClick={() => setHistoryRecord(record)}>(Lịch sử)</span>
                            )}
                          </div>
                          <div style={{ color: '#e74c3c' }}>Còn nợ: <strong>{remaining.toLocaleString()}đ</strong></div>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#ecf0f1', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? '#2ecc71' : '#3498db', transition: 'width 0.3s ease' }}></div>
                        </div>
                      </>
                    ) : (
                      <span style={{ fontWeight: 'bold', fontSize: '12px', color: itemStatusColor }}>
                        {record.status === 'settled' ? '✅ Đã hoàn trả' : '⏳ Chưa trả'}
                      </span>
                    )}
                  </td>
                  
                  <td data-label="Hạn" style={{ padding: '12px 10px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '5px', color: '#34495e', fontWeight: '500' }}>
                      📅 {formatVN(record.dueDate)}
                      {daysLeftText && <span style={{ display: 'block', color: daysLeftColor, fontSize: '11px', marginTop: '2px', fontWeight: 'bold' }}>{daysLeftText}</span>}
                    </div>
                    <span style={{
                      padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#fff',
                      backgroundColor: record.status === 'settled' ? '#2ecc71' : 
                                       record.status === 'overdue' ? '#e74c3c' : 
                                       record.status === 'due_today' ? '#d35400' :
                                       record.status === 'upcoming' ? '#f39c12' : '#3498db'
                    }}>
                      {record.status === 'settled' ? 'Xong' : record.status === 'overdue' ? 'Quá hạn' : record.status === 'due_today' ? 'Hôm nay' : record.status === 'upcoming' ? 'Sắp tới' : 'Đang mở'}
                    </span>
                  </td>

                  <td data-label="Thao tác" style={{ textAlign: 'center', padding: '12px 10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                      {isMoney ? (
                        remaining > 0 && (
                          <button onClick={() => handlePayment(record)} style={{ background: '#2ecc71', color: 'white', border: 'none', width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}>💳 Trả tiền</button>
                        )
                      ) : (
                        record.status !== 'settled' && (
                          <button onClick={() => handlePayment(record)} style={{ background: '#2ecc71', color: 'white', border: 'none', width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}>✅ Trả đồ</button>
                        )
                      )}
                      
                      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                        <button onClick={() => handleEditClick(record)} style={{ background: '#f39c12', color: 'white', border: 'none', flex: 1, padding: '8px 10px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}>Sửa</button>
                        <button onClick={() => handleDelete(record._id)} style={{ background: '#e74c3c', color: 'white', border: 'none', flex: 1, padding: '8px 10px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}>Xóa</button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalImage && (
        <div onClick={() => setModalImage(null)} className="modal-overlay">
          <div onClick={(e) => e.stopPropagation()} className="modal-content">
            <button onClick={() => setModalImage(null)} className="modal-close">&times;</button>
            <img src={modalImage} alt="Chứng từ" className="modal-img" />
          </div>
        </div>
      )}

      {historyRecord && (
        <div onClick={() => setHistoryRecord(null)} className="modal-overlay">
          <div onClick={(e) => e.stopPropagation()} className="modal-content" style={{ maxWidth: '400px', background: '#fff', padding: '20px', borderRadius: '10px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Lịch sử trả nợ: <span style={{ color: '#2980b9' }}>{historyRecord.partner}</span>
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '300px', overflowY: 'auto' }}>
              {historyRecord.paymentHistory?.length > 0 ? historyRecord.paymentHistory.map((h, i) => (
                <li key={i} style={{ padding: '10px 0', borderBottom: '1px dashed #ecf0f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#27ae60' }}>+{h.amount.toLocaleString()} đ</strong>
                    <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '3px' }}>{h.note || 'Thanh toán'}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#95a5a6' }}>{formatTimeVN(h.date)}</div>
                </li>
              )) : (
                <li style={{ padding: '10px 0', textAlign: 'center', color: '#7f8c8d' }}>Chưa có giao dịch thanh toán nào.</li>
              )}
            </ul>
            <button onClick={() => setHistoryRecord(null)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Đóng lại</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default BorrowTracker;