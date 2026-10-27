import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';

const ProfileModal = ({ onClose, token }) => {
    const user = JSON.parse(localStorage.getItem('user')) || { username: 'Người dùng', email: 'chưa cập nhật' };

    // Quản lý tab bên trong modal (0: Thông tin chung, 1: Đổi mật khẩu, 2: Bảo mật nâng cao)
    const [activeTab, setActiveTab] = useState(0);
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '' });
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;
        if (!passwordRegex.test(passForm.newPassword)) {
            alert('❌ Mật khẩu mới quá yếu! Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
            return;
        }

        setLoading(true);
        try {
            await axios.post(apiUrl('/api/auth/change-password'), passForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('✅ Đổi mật khẩu thành công!');
            setPassForm({ oldPassword: '', newPassword: '' });
            onClose();
        } catch (error) {
            alert('❌ Lỗi: ' + (error.response?.data?.message || 'Không thể đổi mật khẩu!'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#fff', borderRadius: '16px', width: '650px', maxWidth: '90%',
                boxShadow: '0 15px 35px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative'
            }}>
                {/* Header Modal */}
                <div style={{ background: 'linear-gradient(135deg, #2c3e50, #3498db)', padding: '25px', color: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%', background: '#fff', color: '#3498db',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', fontWeight: 'bold',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}>
                        {(user.username || 'N').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px' }}>{user.username}</h2>
                        <p style={{ margin: '5px 0 0', opacity: 0.8, fontSize: '14px' }}>{user.email}</p>
                    </div>
                    <button onClick={onClose} style={{
                        position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)',
                        border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'white',
                        fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>
                </div>

                {/* Thanh điều hướng Tab */}
                <div style={{ display: 'flex', background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                    <button onClick={() => setActiveTab(0)} style={{
                        flex: 1, padding: '15px', background: activeTab === 0 ? '#fff' : 'transparent',
                        border: 'none', borderBottom: activeTab === 0 ? '3px solid #3498db' : '3px solid transparent',
                        fontWeight: 'bold', color: activeTab === 0 ? '#3498db' : '#6c757d', cursor: 'pointer', transition: '0.2s'
                    }}>
                        📋 Thông tin tài khoản
                    </button>
                    <button onClick={() => setActiveTab(1)} style={{
                        flex: 1, padding: '15px', background: activeTab === 1 ? '#fff' : 'transparent',
                        border: 'none', borderBottom: activeTab === 1 ? '3px solid #3498db' : '3px solid transparent',
                        fontWeight: 'bold', color: activeTab === 1 ? '#3498db' : '#6c757d', cursor: 'pointer', transition: '0.2s'
                    }}>
                        🔒 Đổi mật khẩu
                    </button>
                    <button onClick={() => setActiveTab(2)} style={{
                        flex: 1, padding: '15px', background: activeTab === 2 ? '#fff' : 'transparent',
                        border: 'none', borderBottom: activeTab === 2 ? '3px solid #3498db' : '3px solid transparent',
                        fontWeight: 'bold', color: activeTab === 2 ? '#3498db' : '#6c757d', cursor: 'pointer', transition: '0.2s'
                    }}>
                        🛡️ Bảo mật nâng cao
                    </button>
                </div>

                {/* Nội dung từng Tab */}
                <div style={{ padding: '30px', minHeight: '220px', background: '#fff' }}>
                    {activeTab === 0 && (
                        <div>
                            <h3 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '15px' }}>Chi tiết hồ sơ người dùng</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#6c757d', display: 'block' }}>Tên tài khoản</span>
                                    <strong style={{ fontSize: '15px', color: '#333' }}>{user.username}</strong>
                                </div>
                                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#6c757d', display: 'block' }}>Email xác thực</span>
                                    <strong style={{ fontSize: '15px', color: '#333' }}>{user.email}</strong>
                                </div>
                                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#6c757d', display: 'block' }}>Trạng thái tài khoản</span>
                                    <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '14px' }}>● Hoạt động (Active)</span>
                                </div>
                                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#6c757d', display: 'block' }}>Cấp độ bảo mật</span>
                                    <span style={{ color: '#3498db', fontWeight: 'bold', fontSize: '14px' }}>Tiêu chuẩn (JWT)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 1 && (
                        <form onSubmit={handleChangePassword}>
                            <h3 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '15px' }}>Thay đổi mật khẩu đăng nhập</h3>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold', color: '#555' }}>Mật khẩu hiện tại:</label>
                                <input type="password" required placeholder="Nhập mật khẩu hiện tại"
                                    value={passForm.oldPassword}
                                    onChange={(e) => setPassForm({ ...passForm, oldPassword: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ced4da', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold', color: '#555' }}>Mật khẩu mới:</label>
                                <input type="password" required placeholder="Ít nhất 8 ký tự, có chữ hoa, số & ký tự đặc biệt"
                                    value={passForm.newPassword}
                                    onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ced4da', boxSizing: 'border-box' }} />
                            </div>
                            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                                {loading ? '⏳ Đang xử lý...' : 'Cập nhật mật khẩu mới'}
                            </button>
                        </form>
                    )}

                    {activeTab === 2 && (
                        <div>
                            <h3 style={{ fontSize: '16px', color: '#2c3e50', marginBottom: '15px' }}>Cài đặt bảo mật hệ thống</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '10px' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#333' }}>Xác thực 2 bước qua Email (OTP)</div>
                                    <div style={{ fontSize: '13px', color: '#6c757d' }}>Đã kích hoạt khi khôi phục tài khoản</div>
                                </div>
                                <span style={{ background: '#d4edda', color: '#155724', padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Đang bật</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#333' }}>Đăng nhập phiên bản web</div>
                                    <div style={{ fontSize: '13px', color: '#6c757d' }}>Token tự động hết hạn sau 24 giờ</div>
                                </div>
                                <span style={{ background: '#cce5ff', color: '#004085', padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Bảo mật cao</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Modal */}
                <div style={{ padding: '15px 30px', background: '#f8f9fa', borderTop: '1px solid #e9ecef', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ padding: '8px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
