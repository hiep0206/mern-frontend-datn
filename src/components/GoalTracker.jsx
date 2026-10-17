import React, { useState, useEffect } from 'react';

const GoalTracker = ({ token, refreshKey, currentBalance }) => {
  // Vì chưa có API Backend cho phần này, ta tạm dùng LocalStorage để lưu trữ
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('financial_goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', deadline: '' });

  // Lưu vào LocalStorage mỗi khi danh sách mục tiêu thay đổi
  useEffect(() => {
    localStorage.setItem('financial_goals', JSON.stringify(goals));
  }, [goals]);

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.targetAmount) return;

    const newGoalItem = {
      id: Date.now().toString(),
      name: newGoal.name,
      targetAmount: Number(newGoal.targetAmount),
      deadline: newGoal.deadline,
      createdAt: new Date().toISOString()
    };

    setGoals([...goals, newGoalItem]);
    setNewGoal({ name: '', targetAmount: '', deadline: '' });
    setIsAdding(false);
  };

  const handleDeleteGoal = (id) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div className="card" style={{ marginTop: '20px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏔️ Mục Tiêu Tài Chính
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          style={{ background: isAdding ? '#e74c3c' : '#3498db', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isAdding ? 'Hủy' : '+ Thêm Mục Tiêu'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddGoal} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'grid', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Tên mục tiêu (VD: Mua xe máy)" 
            value={newGoal.name} 
            onChange={(e) => setNewGoal({...newGoal, name: e.target.value})} 
            required 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input 
              type="number" 
              placeholder="Số tiền cần đạt (VNĐ)" 
              value={newGoal.targetAmount} 
              onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})} 
              required 
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input 
              type="date" 
              value={newGoal.deadline} 
              onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})} 
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <button type="submit" style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Lưu Mục Tiêu</button>
        </form>
      )}

      {goals.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>Chưa có mục tiêu nào. Hãy thiết lập để có động lực tiết kiệm!</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {goals.map(goal => {
            // Tính toán tiến độ dựa trên Tổng Số Dư hiện tại
            const progress = currentBalance > 0 ? (currentBalance / goal.targetAmount) * 100 : 0;
            const cappedProgress = Math.min(progress, 100);
            const isCompleted = currentBalance >= goal.targetAmount;

            return (
              <div key={goal.id} style={{ border: '1px solid #e1e8ed', padding: '15px', borderRadius: '8px', background: isCompleted ? '#f0fff4' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{goal.name} {isCompleted && '🎉'}</h4>
                    <span style={{ fontSize: '12px', color: '#7f8c8d' }}>
                      {goal.deadline ? `Hạn: ${new Date(goal.deadline).toLocaleDateString('vi-VN')}` : 'Không có hạn'}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteGoal(goal.id)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px' }}>✖</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                  <span>Đã gom: <strong>{currentBalance > 0 ? currentBalance.toLocaleString('vi-VN') : 0} đ</strong></span>
                  <span>Mục tiêu: <strong>{goal.targetAmount.toLocaleString('vi-VN')} đ</strong></span>
                </div>

                <div style={{ width: '100%', height: '10px', background: '#ecf0f1', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${cappedProgress}%`, 
                    height: '100%', 
                    background: isCompleted ? '#27ae60' : '#3498db',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#34495e', marginTop: '5px', fontWeight: 'bold' }}>
                  {cappedProgress.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalTracker;