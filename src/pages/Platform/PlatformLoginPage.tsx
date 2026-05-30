import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail, FiServer, FiShield } from "react-icons/fi";
import { isValidPlatformToken, platformLogin, setPlatformToken } from "@/apis/platformAPIs/platform";
import "./Platform.css";

interface LoginValues {
  email: string;
  password: string;
}

const PlatformLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<LoginValues>({ email: "", password: "" });

  useEffect(() => {
    if (isValidPlatformToken()) navigate("/platform/tenants", { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.email || !values.password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    try {
      setLoading(true);
      const res = await platformLogin(values.email, values.password);
      setPlatformToken(res.access_token);
      navigate("/platform/tenants");
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || "Sai email hoặc mật khẩu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="platform-login" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* ── LEFT ART ── */}
      <section className="platform-login-art">
        <div className="platform-mark">
          <div className="platform-mark-icon"><FiServer /></div>
          <div>
            <p className="platform-mark-title">Attendance Platform</p>
            <p className="platform-mark-subtitle">Super Admin Console</p>
          </div>
        </div>

        <div className="platform-login-hero">
          <h1 className="platform-login-title">
            Quản trị<br />
            <span>đa trường học</span><br />
            tập trung.
          </h1>
          <p className="platform-login-copy">
            Mỗi trường sở hữu database riêng, không gian lưu trữ riêng và đường dẫn đăng nhập riêng.
            Super admin chỉ quản lý cấu hình tenant — không can thiệp dữ liệu học vụ bên trong từng trường.
          </p>
        </div>

        <div className="platform-url-sample">
          /hcmute/login · /truong-dai-hoc-a/login · /platform/tenants
        </div>
      </section>

      {/* ── RIGHT FORM ── */}
      <section className="platform-login-card">
        <div className="platform-login-card-header">
          <div className="platform-login-badge">
            <FiShield size={10} /> Khu vực bảo mật
          </div>
          <h1>Đăng nhập Super Admin</h1>
          <p>Tài khoản platform tách biệt hoàn toàn với admin/giáo viên/sinh viên của từng tenant.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: "relative" }}>
              <FiMail style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#3b82f6", fontSize: 15 }} />
              <input
                id="platform-email"
                type="email"
                placeholder="superadmin@example.com"
                value={values.email}
                onChange={e => setValues(v => ({ ...v, email: e.target.value }))}
                style={{
                  width: "100%", height: 44, paddingLeft: 38, paddingRight: 14,
                  background: "rgba(8,14,20,0.8)", border: "1px solid rgba(99,179,255,0.15)",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none",
                  fontFamily: "inherit", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.5)")}
                onBlur={e => (e.target.style.borderColor = "rgba(99,179,255,0.15)")}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
              Mật khẩu
            </label>
            <div style={{ position: "relative" }}>
              <FiLock style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#3b82f6", fontSize: 15 }} />
              <input
                id="platform-password"
                type="password"
                placeholder="••••••••"
                value={values.password}
                onChange={e => setValues(v => ({ ...v, password: e.target.value }))}
                style={{
                  width: "100%", height: 44, paddingLeft: 38, paddingRight: 14,
                  background: "rgba(8,14,20,0.8)", border: "1px solid rgba(99,179,255,0.15)",
                  borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none",
                  fontFamily: "inherit", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.5)")}
                onBlur={e => (e.target.style.borderColor = "rgba(99,179,255,0.15)")}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8,
              color: "#fca5a5", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="platform-login-btn"
            type="submit"
            disabled={loading}
            style={{
              width: "100%", height: 46, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, background: loading ? "rgba(59,130,246,0.5)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
              border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
              boxShadow: "0 4px 24px rgba(59,130,246,0.3)", transition: "all 0.2s",
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                Đang đăng nhập...
              </>
            ) : (
              <><FiArrowRight /> Vào bảng điều khiển</>
            )}
          </button>
        </form>

        <div style={{ marginTop: 28, padding: "14px 16px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
            <strong style={{ color: "#60a5fa" }}>Lưu ý bảo mật:</strong> Token của super admin hoàn toàn tách biệt với token của admin/giáo viên/sinh viên tenant. Không thể dùng chéo giữa hai hệ thống.
          </p>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </section>
    </main>
  );
};

export default PlatformLoginPage;
