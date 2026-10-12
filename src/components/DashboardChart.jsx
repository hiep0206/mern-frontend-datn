import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

const DashboardChart = ({ token, refreshKey }) => {
    const [expenseData, setExpenseData] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            return;
        }

        axios.get('https://api-tai-chinh.onrender.com/api/transactions', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const responseData = res.data;
                const transactions = Array.isArray(responseData)
                    ? responseData
                    : Array.isArray(responseData?.data)
                        ? responseData.data
                        : Array.isArray(responseData?.transactions)
                            ? responseData.transactions
                            : [];
                // Lọc ra các khoản chi (expense)
                const expenses = transactions.filter(t => t.type === 'expense');
                
                // Gom nhóm theo danh mục
                const grouped = expenses.reduce((acc, curr) => {
                    const existing = acc.find(item => item.name === curr.category);
                    if (existing) {
                        existing.value += curr.amount;
                    } else {
                        acc.push({ name: curr.category, value: curr.amount });
                    }
                    return acc;
                }, []);

                setExpenseData(grouped);
                setError('');
            })
            .catch(err => {
                console.error('Lỗi tải dữ liệu biểu đồ:', err);
                setError(err.response?.data?.message || 'Không thể tải dữ liệu biểu đồ.');
            });
    }, [token, refreshKey]);

    return (
        <div>
            <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>📊 Cơ cấu chi tiêu tổng hợp</h3>
            {error ? (
                <p role="alert" style={{ textAlign: 'center', color: '#c0392b', padding: '20px' }}>{error}</p>
            ) : expenseData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie 
                                data={expenseData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={75} 
                                label
                            >
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
                <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Chưa có dữ liệu chi tiêu để vẽ biểu đồ.</p>
            )}
        </div>
    );
};

export default DashboardChart;