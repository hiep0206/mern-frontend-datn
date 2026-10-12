import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const UserDropdown = ({ onOpenProfile, onLogout, onSwitchAccount }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false); // Trạng thái mở form thêm tài khoản nhanh
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const dropdownRef = useRef(null);

    // Lấy thông tin user hiện tại và danh sách các tài khoản đã từng đăng nhập
    const currentUser = JSON.parse(localStorage.getItem('user')) || { username: 'Người dùng', email: 'chưa có' };
    const savedAccounts = JSON.parse(localStorage.getItem('saved_accounts')) || [currentUser];
    
    const firstLetter = currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'H';

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setShowAddAccount(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Xử lý đăng nhập tài khoản khác từ danh sách nhanh
    const handleQuickLogin = async (account) => {
        // Nếu chọn đúng tài khoản đang đứng thì thôi
        if (account.email === currentUser.email) {
            setIsOpen(false);
            return;
        }
        // Ở đây có thể yêu cầu nhập lại mật khẩu hoặc chuyển đổi trực tiếp nếu lưu token tương ứng. 
        // Để bảo mật tài chính, ta sẽ mở nhanh form đăng nhập với email đó:
        setLoginForm({ email: account.email, password: '' });
        setShowAddAccount(true);
    };

    // Thêm tài khoản mới trực tiếp tại đây
    const handleAddAccountSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', loginForm);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            // Lưu vào danh sách các tài khoản đã nhớ trên thiết bị
            let accounts = JSON.parse(localStorage.getItem('saved_accounts')) || [];
            if (!accounts.some(acc => acc.email === res.data.user.email)) {
                accounts.push(res.data.user);
                localStorage.setItem('saved_accounts', JSON.stringify(accounts));
            }

            window.location.reload(); // Tải lại trang để áp dụng tài khoản mới
        } catch (error) {
            alert('❌ Đăng nhập thất bại: ' + (error.response?.data?.message || 'Sai thông tin!'));
        }
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Avatar Tròn góc trên bên phải */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '40px', height: '40px', borderRadius: '50%', background: '#8e44ad', color: 'white',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', fontWeight: 'bold',
                    cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', userSelect: 'none'
                }}
                title="Tài khoản Google / Ứng dụng"
            >
                {firstLetter}
            </div>

            {/* Menu thả xuống chuẩn Google Account Selector */}
            {isOpen && (
                <div style={{
                    position: 'absolute', right: 0, top: '50px', width: '320px', background: 'white',
                    borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 1000, overflow: 'hidden',
                    border: '1px solid #dadce0', animation: 'fadeIn 0.2s ease', fontFamily: 'Arial, sans-serif'
                }}>
                    {!showAddAccount ? (
                        <>
                            {/* Tiêu đề ứng dụng kiểu Google */}
                            <div style={{ padding: '12px 20px', textAlign: 'center', borderBottom: '1px solid #f1f3f4', fontSize: '13px', color: '#5f6368', fontWeight: '500' }}>
                                Trợ lý Tài chính AI
                            </div>

                            {/* Tài khoản đang hoạt động chính */}
                            <div style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid #f1f3f4', background: '#f8f9fa' }}>
                                <div style={{
                                    width: '45px', height: '45px', borderRadius: '50%', background: '#8e44ad', color: 'white',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', flexShrink: 0
                                }}>
                                    {firstLetter}
                                </div>
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', color: '#202124', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.username}</div>
                                    <div style={{ fontSize: '13px', color: '#5f6368', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.email}</div>
                                </div>
                                <span style={{ color: '#1a73e8', fontSize: '18px' }}>✓</span>
                            </div>

                            {/* Danh sách các tài khoản khác đã lưu trên thiết bị (Chuyển đổi nhanh) */}
                            {savedAccounts.filter(acc => acc.email !== currentUser.email).length > 0 && (
                                <div style={{ padding: '5px 0', borderBottom: '1px solid #f1f3f4' }}>
                                    <div style={{ padding: '5px 20px', fontSize: '11px', color: '#5f6368', fontWeight: 'bold', textTransform: 'uppercase' }}>Tài khoản khác trên thiết bị</div>
                                    {savedAccounts.filter(acc => acc.email !== currentUser.email).map((acc, index) => (
                                        <div 
                                            key={index}
                                            onClick={() => handleQuickLogin(acc)}
                                            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f3f4'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3498db', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                                {acc.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#3c4043' }}>{acc.username}</div>
                                                <div style={{ fontSize: '12px', color: '#5f6368' }}>{acc.email}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Các tùy chọn hành động hệ thống */}
                            <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f3f4' }}>
                                <div 
                                    onClick={() => setShowAddAccount(true)}
                                    style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', fontSize: '14px', color: '#3c4043', fontWeight: '500' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f3f4'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span>➕</span> Thêm tài khoản khác
                                </div>

                                <div 
                                    onClick={() => { setIsOpen(false); onOpenProfile(); }}
                                    style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', fontSize: '14px', color: '#3c4043', fontWeight: '500' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f3f4'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span>⚙️</span> Hồ sơ & Quản lý bảo mật
                                </div>
                            </div>

                            {/* Nút Đăng xuất */}
                            <div style={{ padding: '8px 0' }}>
                                <div 
                                    onClick={() => { setIsOpen(false); onLogout(); }}
                                    style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', fontSize: '14px', color: '#d9534f', fontWeight: 'bold' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fcf0f0'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span>🚪</span> Đăng xuất khỏi tài khoản này
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Giao diện phụ: Thêm hoặc đăng nhập tài khoản khác ngay trong Popup */
                        <div style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '16px', color: '#202124', marginBottom: '15px', textAlign: 'center' }}>Đăng nhập tài khoản khác</h3>
                            <form onSubmit={handleAddAccountSubmit}>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '12px', color: '#5f6368', fontWeight: 'bold' }}>Email:</label>
                                    <input type="email" required placeholder="email@example.com" value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #dadce0', boxSizing: 'border-box', marginTop: '5px' }} />
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ fontSize: '12px', color: '#5f6368', fontWeight: 'bold' }}>Mật khẩu:</label>
                                    <input type="password" required placeholder="Mật khẩu" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #dadce0', boxSizing: 'border-box', marginTop: '5px' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowAddAccount(false)} style={{ flex: 1, padding: '10px', background: '#f1f3f4', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#3c4043' }}>Quay lại</button>
                                    <button type="submit" style={{ flex: 1, padding: '10px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Đăng nhập</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserDropdown;