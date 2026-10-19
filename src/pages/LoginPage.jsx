import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getSocieties, validateReferralCode } from "../api/store.js";
import { useAuth } from "../context/AuthContext.jsx";

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  societyId: "",
  tower: "",
  flat: "",
  kitchenName: "",
  speciality: "",
  upiId: "",
  password: "",
};

function validate(form, mode) {
  const errors = {};
  if (mode === "register") {
    if (!form.name.trim()) errors.name = "Please enter your full name.";
    const mobile = form.mobile.replace(/\D/g, "");
    if (!/^\d{10,13}$/.test(mobile)) errors.mobile = "Enter a mobile number with 10–13 digits.";
    if (!form.societyId) errors.societyId = "Choose your society.";
    if (!form.tower.trim()) errors.tower = "Please enter your tower or block.";
    if (!form.flat.trim()) errors.flat = "Please enter your flat number.";
    if (form.role === "seller" && !form.kitchenName.trim()) {
      errors.kitchenName = "Please enter your kitchen name.";
    }
    if (form.role === "seller" && !form.speciality.trim()) {
      errors.speciality = "Please enter your cooking speciality.";
    }
    if (form.role === "seller" && !/^[\w.-]+@[\w.-]+$/.test(form.upiId.trim())) {
      errors.upiId = "Enter a valid UPI ID (for example, name@bank).";
    }
  }
  if (mode === "login" && !form.identifier.trim()) {
    errors.identifier = "Enter your mobile number or email.";
  }
  if (form.password.length < 6) errors.password = "Password must be at least 6 characters.";
  return errors;
}

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("buyer");
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [societies, setSocieties] = useState([]);
  const [societyError, setSocietyError] = useState("");

  useEffect(() => {
    try {
      setSocieties(getSocieties());
      setSocietyError("");
    } catch (error) {
      setSocietyError(error.message || "Societies couldn't be loaded.");
    }
  }, []);

  if (user) {
    return <Navigate to={user.role === "seller" ? "/seller" : "/"} replace />;
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value, role }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  function changeRole(nextRole) {
    setRole(nextRole);
    setForm((current) => ({ ...current, role: nextRole }));
    setErrors({});
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setErrors({});
  }

  function handleSubmit(event) {
    event.preventDefault();
    const submission = { ...form, role };
    const validationErrors = validate(submission, mode);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    try {
      if (mode === "register") {
        if (role === "seller" && submission.referralCode?.trim() &&
            !validateReferralCode(submission.societyId, submission.referralCode)) {
          setErrors((current) => ({
            ...current,
            referralCode: "That code is invalid or inactive. You can continue without it; your chef account will await approval.",
          }));
          return;
        }
        register(submission);
        login({
          identifier: submission.mobile,
          password: submission.password,
          expectedRole: role,
        });
        navigate(role === "seller" ? "/seller" : "/", { replace: true });
      } else {
        const signedInUser = login({
          identifier: form.identifier,
          password: form.password,
          expectedRole: role,
        });
        navigate(role === "seller" ? "/seller" : "/", { replace: true });
      }
    } catch (submissionError) {
      setErrors({ form: submissionError.message });
    }
  }

  return (
    <main className="login-page">
      <Link className="login-back" to="/">← <span>Back to menu</span></Link>
      <section className="login-card">
        <div className="login-logo">
          <img src="/logo_full.png" alt="KitchenNextDoor" />
        </div>
        <p className="eyebrow">A community, with a side of comfort</p>
        <h1>Come on in!</h1>
        <p className="form-intro">Good food and good neighbours are just around the corner.</p>

        <div className="segmented-control" role="group" aria-label="Choose account type">
          <button className={role === "buyer" ? "selected" : ""} onClick={() => changeRole("buyer")} type="button">
            I'm a neighbour
          </button>
          <button className={role === "seller" ? "selected" : ""} onClick={() => changeRole("seller")} type="button">
            I'm a home chef
          </button>
        </div>

        <div className="mode-switch" role="group" aria-label="Choose login or register">
          <button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")} type="button">Log in</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")} type="button">Create account</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <>
              <label>
                Full name
                <input autoComplete="name" value={form.name} onChange={(event) => update("name", event.target.value)} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </label>
              <label>
                Mobile number
                <input inputMode="tel" autoComplete="tel" value={form.mobile} onChange={(event) => update("mobile", event.target.value)} />
                {errors.mobile && <span className="field-error">{errors.mobile}</span>}
              </label>
              <label>
                Email <span className="optional">(optional)</span>
                <input type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
              </label>
              <div className="form-row">
                <label>
                  Society
                  <select value={form.societyId} onChange={(event) => update("societyId", event.target.value)} disabled={!societies.length}>
                    <option value="">Choose your society</option>
                    {societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}
                  </select>
                  {errors.societyId && <span className="field-error">{errors.societyId}</span>}
                </label>
                <label>
                  Tower / block
                  <input value={form.tower} onChange={(event) => update("tower", event.target.value)} />
                  {errors.tower && <span className="field-error">{errors.tower}</span>}
                </label>
              </div>
              <label>
                Flat number
                <input value={form.flat} onChange={(event) => update("flat", event.target.value)} />
                {errors.flat && <span className="field-error">{errors.flat}</span>}
              </label>
              {role === "seller" && (
                <>
                  <label>
                    Kitchen name
                    <input value={form.kitchenName} onChange={(event) => update("kitchenName", event.target.value)} />
                    {errors.kitchenName && <span className="field-error">{errors.kitchenName}</span>}
                  </label>
                  <label>
                    Cooking speciality
                    <input placeholder="e.g. homestyle Punjabi" value={form.speciality} onChange={(event) => update("speciality", event.target.value)} />
                    {errors.speciality && <span className="field-error">{errors.speciality}</span>}
                  </label>
                  <label>
                    UPI ID *
                    <input required placeholder="name@bank" value={form.upiId} onChange={(event) => update("upiId", event.target.value)} />
                    {errors.upiId && <span className="field-error">{errors.upiId}</span>}
                    <span className="optional">Required to accept UPI payments and go online.</span>
                  </label>
                  <label>
                    Referral code <span className="optional">(optional)</span>
                    <input autoCapitalize="characters" value={form.referralCode || ""} onChange={(event) => update("referralCode", event.target.value.toUpperCase())} placeholder="KND-SKY-4821" />
                    {errors.referralCode && <span className="field-error">{errors.referralCode}</span>}
                  </label>
                </>
              )}
            </>
          )}
          {mode === "login" && (
            <label>
              Mobile number or email
              <input
                autoComplete="username"
                value={form.identifier || ""}
                onChange={(event) => update("identifier", event.target.value)}
              />
              {errors.identifier && <span className="field-error">{errors.identifier}</span>}
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>
          {errors.form && <p className="field-error form-error" role="alert">{errors.form}</p>}
          {mode === "register" && societyError && <p className="field-error" role="alert">{societyError}</p>}
          {mode === "register" && !societyError && !societies.length && (
            <p className="society-registration-empty" role="status">No societies are available yet. Please try again after a Society Admin creates your community.</p>
          )}
          <button className="button button-primary button-full" type="submit" disabled={mode === "register" && !societies.length}>
            {mode === "register" ? "Create my account" : "Log in"}
          </button>
        </form>
        <Link className="guest-link" to="/">Browse as guest</Link>
      </section>
    </main>
  );
}
