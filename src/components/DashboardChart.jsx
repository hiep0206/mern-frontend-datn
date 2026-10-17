import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend as ChartLegend
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

const COLORS = ['#3478F6', '#0D9668', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

function DashboardChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <p>Moneo chưa có đủ dữ liệu giao dịch trong kỳ này để tạo báo cáo.</p>
      </div>
    );
  }

  // 1. CHỈ SỐ KPI TÀI CHÍNH
  const totalIncome = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = data.filter(t => t.type === 'expense');
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  
  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netCashFlow / totalIncome) * 100).toFixed(1) : 0;

  // 2. DỮ LIỆU CƠ CẤU CHI TIÊU (PIE CHART)
  const categoryDataMap = {};
  expenses.forEach(t => {
    categoryDataMap[t.category] = (categoryDataMap[t.category] || 0) + t.amount;
  });
  const pieData = Object.keys(categoryDataMap).map(key => ({
    name: key,
    value: categoryDataMap[key]
  })).sort((a, b) => b.value - a.value);

  // 3. DỮ LIỆU DÒNG TIỀN LŨY KẾ (BAR + LINE CHART)
  const dailyDataMap = {};
  data.forEach(t => {
    const dateObj = new Date(t.date || t.createdAt);
    const day = dateObj.getDate().toString().padStart(2, '0') + '/' + (dateObj.getMonth() + 1).toString().padStart(2, '0');

    if (!dailyDataMap[day]) {
      dailyDataMap[day] = { date: day, dateObj, income: 0, expense: 0 };
    }
    if (t.type === 'income') dailyDataMap[day].income += t.amount;
    if (t.type === 'expense') dailyDataMap[day].expense += t.amount;
  });

  // LOGIC SỬA LỖI: Tính Dòng tiền ròng lũy kế (Cumulative Net Cash Flow)
  let cumulativeNet = 0;
  const cashFlowData = Object.values(dailyDataMap)
    .sort((a, b) => a.dateObj - b.dateObj)
    .map(item => {
      const dailyNet = item.income - item.expense;
      cumulativeNet += dailyNet; // Cộng dồn dòng tiền qua từng ngày
      
      return {
        date: item.date,
        'Thu nhập': item.income,
        'Chi phí': item.expense,
        'Dòng tiền lũy kế': cumulativeNet
      };
    });

  const formatVND = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 4 THẺ CHỈ SỐ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
            <TrendingUp size={16} color="#0D9668" /> Tổng thu trong kỳ
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{formatVND(totalIncome)}</div>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
            <TrendingDown size={16} color="#C54B40" /> Tổng chi trong kỳ
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{formatVND(totalExpense)}</div>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
            <Wallet size={16} color={netCashFlow >= 0 ? "#0D9668" : "#C54B40"} /> Dòng tiền ròng
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: netCashFlow >= 0 ? '#0D9668' : '#C54B40' }}>
            {netCashFlow > 0 ? '+' : ''}{formatVND(netCashFlow)}
          </div>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
            <PiggyBank size={16} color="#3478F6" /> Tỷ lệ tiết kiệm
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#3478F6' }}>{savingsRate}%</div>
        </div>
      </div>

      {/* KHU VỰC BIỂU ĐỒ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Biểu đồ Dòng tiền Lũy kế */}
        <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '16px' }}>Thu chi & Dòng tiền lũy kế</h4>
          {cashFlowData.length > 0 ? (
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <ComposedChart data={cashFlowData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis tickFormatter={(val) => (Math.abs(val) >= 1000000 ? (val / 1000000) + 'M' : (val / 1000) + 'k')} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  
                  <ChartTooltip 
                    formatter={(value) => formatVND(value)} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  />
                  <ChartLegend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                  
                  <Bar dataKey="Thu nhập" fill="#0D9668" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Chi phí" fill="#C54B40" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  {/* Đường Line Lũy kế đứt nét theo thiết kế */}
                  <Line type="monotone" dataKey="Dòng tiền lũy kế" stroke="#1e293b" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4, fill: '#1e293b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '100px' }}>Chưa có đủ dữ liệu để vẽ đường xu hướng.</p>
          )}
        </div>

        {/* Biểu đồ Cơ cấu chi tiêu */}
        <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '16px' }}>Cơ cấu chi tiêu</h4>
          {pieData.length > 0 ? (
            <div style={{ width: '100%', height: 350, display: 'flex', flexDirection: 'column' }}>
              <ResponsiveContainer width="100%" height="70%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <PieTooltip formatter={(value) => formatVND(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              
              <div style={{ overflowY: 'auto', maxHeight: '30%', marginTop: '10px' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                  {pieData.map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        {item.name}
                      </span>
                      <strong style={{ color: '#1e293b' }}>{((item.value / totalExpense) * 100).toFixed(1)}%</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '100px' }}>Chưa có khoản chi nào.</p>
          )}
        </div>

      </div>
    </div>
  );
}

export default DashboardChart;