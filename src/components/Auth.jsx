import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';

const Auth = ({ onLoginSuccess }) => {
    // Các state cơ bản
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', otp: '', newPassword: '' });

    // State cho luồng Quên mật khẩu nâng cao
    const [forgotStep, setForgotStep] = useState(0); // 0: Không ở màn hình quên pass, 1: Nhập email, 2: Nhập OTP, 3: Chọn cách khác
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Hiệu ứng đếm ngược 60s
    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    // Che giấu một phần email để bảo mật (VD: con***@gmail.com)
    const maskEmail = (email) => {
        if (!email) return '';
        const [name, domain] = email.split('@');
        if (name.length <= 3) return email;
        return `${name.substring(0, 3)}***@${domain}`;
    };

    // 1. HÀM ĐĂNG NHẬP / ĐĂNG KÝ BÌNH THƯỜNG
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isLogin) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;
            if (!passwordRegex.test(formData.password)) {
                alert('❌ Mật khẩu yếu! Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
                return;
            }
        }

        setIsLoading(true);
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const res = await axios.post(apiUrl(endpoint), {
                username: formData.username, email: formData.email, password: formData.password
            });

            if (isLogin) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                onLoginSuccess(res.data.token, res.data.user);
            } else {
                alert('🎉 Đăng ký thành công! Mời bạn đăng nhập.');
                setIsLogin(true);
            }
        } catch (error) {
            alert('❌ Lỗi: ' + (error.response?.data?.message || 'Không thể kết nối!'));
        } finally {
            setIsLoading(false);
        }
    };

    // 2. GỬI OTP (Có đếm ngược)
    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        if (!formData.email) {
            alert("Vui lòng nhập email trước!");
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(apiUrl('/api/auth/forgot-password'), { email: formData.email });
            setForgotStep(2); // Chuyển sang bước nhập OTP
            setCountdown(60); // Bắt đầu đếm ngược 60s
        } catch (error) {
            alert('❌ Lỗi: ' + (error.response?.data?.message || 'Không thể gửi email!'));
        } finally {
            setIsLoading(false);
        }
    };

    // 3. XÁC NHẬN OTP VÀ ĐỔI MẬT KHẨU
    const handleResetPassword = async (e) => {
        e.preventDefault();
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;
        if (!passwordRegex.test(formData.newPassword)) {
            alert('❌ Mật khẩu yếu! Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(apiUrl('/api/auth/reset-password'), {
                email: formData.email, otp: formData.otp, newPassword: formData.newPassword
            });
            alert('🎉 Cập nhật mật khẩu thành công! Mời bạn đăng nhập lại.');
            setForgotStep(0);
            setIsLogin(true);
            setCountdown(0);
        } catch (error) {
            alert('❌ Lỗi: ' + (error.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn!'));
        } finally {
            setIsLoading(false);
        }
    };

    // ================== CÁC MÀN HÌNH GIAO DIỆN ==================

    const containerStyle = { maxWidth: '420px', margin: '80px auto', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', background: 'white' };
    const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '8px', boxSizing: 'border-box' };
    const btnStyle = { width: '100%', padding: '12px', fontSize: '16px', background: '#3498db', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '20px', fontWeight: 'bold' };
    const linkStyle = { textAlign: 'center', marginTop: '20px', cursor: 'pointer', color: '#7f8c8d', fontSize: '14px' };

    // --- MÀN HÌNH QUÊN MẬT KHẨU: BƯỚC 1 (NHẬP EMAIL) ---
    if (forgotStep === 1) {
        return (
            <div style={containerStyle}>
                <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '20px' }}>Khôi Phục Mật Khẩu</h2>
                <form onSubmit={handleSendOTP}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ fontWeight: 'bold', color: '#555' }}>Nhập Email đã đăng ký:</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="email@example.com" style={inputStyle} />
                    </div>
                    <button type="submit" disabled={isLoading} style={{ ...btnStyle, background: isLoading ? '#95a5a6' : '#1a73e8' }}>
                        {isLoading ? '⏳ Đang xử lý...' : 'Tiếp theo'}
                    </button>
                </form>
                <p style={linkStyle} onClick={() => setForgotStep(0)}>⬅ Quay lại đăng nhập</p>
            </div>
        );
    }

    // --- MÀN HÌNH QUÊN MẬT KHẨU: BƯỚC 2 (NHẬP OTP & ĐỔI PASS) ---
    if (forgotStep === 2) {
        return (
            <div style={containerStyle}>
                <h2 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '22px' }}>Kiểm tra email của bạn</h2>
                <p style={{ color: '#5f6368', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
                    Hệ thống vừa gửi email chứa mã xác minh đến địa chỉ khôi phục của bạn là <strong>{maskEmail(formData.email)}</strong>.
                    Vui lòng kiểm tra email này để lấy mã và nhập vào bên dưới.
                </p>

                <form onSubmit={handleResetPassword}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ fontWeight: 'bold', color: '#333' }}>Nhập mã OTP (6 số):</label>
                        <input type="text" name="otp" onChange={handleChange} required placeholder="Ví dụ: 123456" style={inputStyle} maxLength="6" />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontWeight: 'bold', color: '#333' }}>Tạo Mật khẩu mới:</label>
                        <input type="password" name="newPassword" onChange={handleChange} required placeholder="Nhập mật khẩu mới bảo mật cao" style={inputStyle} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <span style={{ color: '#1a73e8', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setForgotStep(3)}>
                            Thử cách khác
                        </span>
                        <button type="submit" disabled={isLoading} style={{ padding: '10px 24px', background: isLoading ? '#95a5a6' : '#1a73e8', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {isLoading ? '⏳ Đang xử lý...' : 'Tiếp theo'}
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '13px', color: '#777' }}>
                    Chưa nhận được mã?
                    {countdown > 0 ? (
                        <span style={{ color: '#e74c3c', marginLeft: '5px' }}>Gửi lại sau {countdown}s</span>
                    ) : (
                        <span style={{ color: '#1a73e8', marginLeft: '5px', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleSendOTP}>
                            Gửi lại mã
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // --- MÀN HÌNH QUÊN MẬT KHẨU: BƯỚC 3 (CHỌN CÁCH KHÁC) ---
    if (forgotStep === 3) {
        return (
            <div style={containerStyle}>
                <h2 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '20px' }}>Chọn cách bạn muốn xác minh:</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ padding: '15px', border: '1px solid #dadce0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px' }} onClick={() => setForgotStep(2)}>
                        <span style={{ fontSize: '20px' }}>✉️</span>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#3c4043' }}>Nhận mã xác minh tại email</div>
                            <div style={{ fontSize: '13px', color: '#5f6368' }}>{maskEmail(formData.email)}</div>
                        </div>
                    </div>

                    <div style={{ padding: '15px', border: '1px solid #dadce0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', opacity: 0.6 }} onClick={() => alert('Tính năng gửi SMS đang được phát triển!')}>
                        <span style={{ fontSize: '20px' }}>📱</span>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#3c4043' }}>Nhận mã qua tin nhắn SMS</div>
                            <div style={{ fontSize: '13px', color: '#5f6368' }}>Hỗ trợ trên phiên bản cập nhật tới</div>
                        </div>
                    </div>

                    <div style={{ padding: '15px', border: '1px solid #dadce0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px' }} onClick={() => setForgotStep(0)}>
                        <span style={{ fontSize: '20px' }}>🔒</span>
                        <div>
                            <div style={{ fontWeight: 'bold', color: '#3c4043' }}>Tôi nhớ mật khẩu rồi</div>
                            <div style={{ fontSize: '13px', color: '#5f6368' }}>Quay lại màn hình đăng nhập</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ MẶC ĐỊNH ---
    return (
        <div style={containerStyle}>
            <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '20px' }}>
                {isLogin ? '🔐 Đăng Nhập' : '📝 Đăng Ký Tài Khoản'}
            </h2>
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ fontWeight: 'bold', color: '#555' }}>Tên hiển thị:</label>
                        <input type="text" name="username" onChange={handleChange} required placeholder="Nhập tên của bạn" style={inputStyle} />
                    </div>
                )}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontWeight: 'bold', color: '#555' }}>Email:</label>
                    <input type="email" name="email" onChange={handleChange} required placeholder="email@example.com" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontWeight: 'bold', color: '#555' }}>Mật khẩu:</label>
                    <input type="password" name="password" onChange={handleChange} required placeholder="Nhập mật khẩu" style={inputStyle} />
                    {!isLogin && (
                        <small style={{ color: '#7f8c8d', display: 'block', marginTop: '5px', fontSize: '12px' }}>
                            Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số & ký tự đặc biệt.
                        </small>
                    )}
                </div>

                {isLogin && (
                    <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                        <span style={{ color: '#e74c3c', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setForgotStep(1)}>
                            Bạn quên mật khẩu?
                        </span>
                    </div>
                )}

                <button type="submit" disabled={isLoading} style={{ ...btnStyle, background: isLoading ? '#95a5a6' : '#3498db' }}>
                    {isLoading ? '⏳ Đang xử lý...' : (isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản')}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '25px', cursor: 'pointer', color: '#1a73e8', fontWeight: 'bold' }}
                onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
            </p>
        </div>
    );
};

export default Auth;
