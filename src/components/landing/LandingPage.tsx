import { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  LogIn,
  PlayCircle,
  ShieldCheck,
  Timer,
  Upload,
  WalletCards
} from "lucide-react";
import { loginSchema, passwordSchema, signupSchema, verifyEmailSchema } from "../../shared";
import type { AppPage, AuthMode, FieldErrors, PendingVerification, SignupSuccess } from "../../shared/types";
import { useAuth } from "../../context/AuthContext";
import logoUrl from "../../assets/logo.png";

const apiHeaders = {
  "Content-Type": "application/json"
};

export const capabilityCards = [
  {
    title: "Secure Authentication",
    description: "Role-based access, email verification, and generated employee login IDs protect sensitive HR data.",
    icon: ShieldCheck,
    tone: "navy"
  },
  {
    title: "Real-time Attendance",
    description: "Check-in/out flows and weekly records give HR instant visibility into workforce presence.",
    icon: Timer,
    tone: "teal"
  },
  {
    title: "Seamless Payroll",
    description: "Read-only employee salary views and HR-controlled salary structures keep payroll accurate.",
    icon: WalletCards,
    tone: "indigo"
  }
];

function securePasswordSuggestion() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%";
  const pick = (value: string) => value[Math.floor(Math.random() * value.length)];

  return `${pick(letters).toUpperCase()}${pick(letters).toLowerCase()}${pick(numbers)}${pick(symbols)}${crypto.randomUUID().slice(0, 8)}`;
}

function mapApiErrors(errors: unknown): FieldErrors {
  if (!Array.isArray(errors)) {
    return {};
  }

  return errors.reduce<FieldErrors>((result, error) => {
    if (error && typeof error === "object" && "field" in error && "message" in error) {
      result[String(error.field)] = String(error.message);
    }

    return result;
  }, {});
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => ({ message: "Something went wrong" }));

  if (!response.ok) {
    throw data;
  }

  return data;
}

export function LandingPage({ navigate }: { navigate: (page: AppPage) => void }) {
  const { setCurrentUser } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [signupSuccess, setSignupSuccess] = useState<SignupSuccess | null>(null);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signinForm, setSigninForm] = useState({ loginIdOrEmail: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    role: "EMPLOYEE",
    password: "",
    confirmPassword: ""
  });

  const passwordChecklist = useMemo(() => {
    const value = signupForm.password;

    return [
      { label: "8+ characters", valid: value.length >= 8 },
      { label: "Uppercase", valid: /[A-Z]/.test(value) },
      { label: "Lowercase", valid: /[a-z]/.test(value) },
      { label: "Number", valid: /[0-9]/.test(value) },
      { label: "Symbol", valid: /[^A-Za-z0-9]/.test(value) }
    ];
  }, [signupForm.password]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setErrors({});
    setSignupSuccess(null);
  }

  function useSuggestedPassword() {
    const password = securePasswordSuggestion();
    setSignupForm((current) => ({ ...current, password, confirmPassword: password }));
    setErrors((current) => ({ ...current, password: "", confirmPassword: "" }));
  }

  async function handleSignin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});

    const parsed = loginSchema.safeParse(signinForm);
    if (!parsed.success) {
      setErrors(mapApiErrors(parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))));
      return;
    }

    setIsBusy(true);
    try {
      const data = await fetch("/auth/login", {
        method: "POST",
        headers: apiHeaders,
        credentials: "include",
        body: JSON.stringify(parsed.data)
      }).then(readApiResponse);

      setCurrentUser(data.user);
      setMessage("");
      navigate("dashboard");
    } catch (error) {
      const apiError = error as { code?: string; email?: string; employeeCode?: string; message?: string };
      if (apiError.code === "EMAIL_NOT_VERIFIED" && apiError.email) {
        setPendingVerification({
          email: apiError.email,
          employeeCode: apiError.employeeCode,
          token: ""
        });
      }
      setMessage(error instanceof Error ? error.message : String(apiError.message ?? "Unable to sign in"));
      setErrors(mapApiErrors((error as { errors?: unknown }).errors));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    setSignupSuccess(null);

    const parsed = signupSchema.safeParse(signupForm);
    if (!parsed.success) {
      setErrors(mapApiErrors(parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))));
      return;
    }

    setIsBusy(true);
    try {
      const data = await fetch("/auth/signup", {
        method: "POST",
        headers: apiHeaders,
        credentials: "include",
        body: JSON.stringify(parsed.data)
      }).then(readApiResponse);

      setSignupSuccess({
        employeeCode: data.employeeCode,
        verificationToken: data.verificationToken,
        email: parsed.data.email
      });
      setPendingVerification({
        email: parsed.data.email,
        employeeCode: data.employeeCode,
        token: data.verificationToken
      });
      setMessage(data.message);
    } catch (error) {
      setMessage(String((error as { message?: string }).message ?? "Unable to create account"));
      setErrors(mapApiErrors((error as { errors?: unknown }).errors));
    } finally {
      setIsBusy(false);
    }
  }

  async function verifyEmail() {
    const verification = pendingVerification ?? signupSuccess;

    if (!verification) {
      return;
    }

    const parsed = verifyEmailSchema.safeParse({
      email: verification.email,
      token: "token" in verification ? verification.token : verification.verificationToken
    });

    if (!parsed.success) {
      setMessage("Verification details are missing");
      return;
    }

    setIsBusy(true);
    try {
      const data = await fetch("/auth/verify-email", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(parsed.data)
      }).then(readApiResponse);

      setMessage(data.message);
      setPendingVerification(null);
      setSignupSuccess(null);
      switchMode("signin");
      setSigninForm((current) => ({
        ...current,
        loginIdOrEmail: verification.employeeCode || verification.email,
        password: signupForm.password || current.password
      }));
    } catch (error) {
      setMessage(String((error as { message?: string }).message ?? "Unable to verify email"));
    } finally {
      setIsBusy(false);
    }
  }

  async function resendVerification() {
    const loginIdOrEmail = pendingVerification?.email || signinForm.loginIdOrEmail;

    if (!loginIdOrEmail) {
      setMessage("Enter your email or Login ID first");
      return;
    }

    setIsBusy(true);
    try {
      const data = await fetch("/auth/resend-verification", {
        method: "POST",
        headers: apiHeaders,
        credentials: "include",
        body: JSON.stringify({ loginIdOrEmail })
      }).then(readApiResponse);

      setPendingVerification({
        email: data.email,
        employeeCode: data.employeeCode,
        token: data.verificationToken ?? ""
      });
      setMessage(data.message);
    } catch (error) {
      setMessage(String((error as { message?: string }).message ?? "Unable to generate verification token"));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="siteShell">
      <header className="topNav">
        <a className="brandMark" href="#home" aria-label="Odooo HR home">
          <img src={logoUrl} alt="" />
          Odooo HR
        </a>
        <nav aria-label="Primary navigation">
          <a className="active" href="#home">
            Home
          </a>
          <a href="#features">Features</a>
          <a href="#solutions">Solutions</a>
        </nav>
        <a className="navSignin" href="#signin" onClick={() => switchMode("signin")}>
          <LogIn size={16} />
          Sign In
        </a>
      </header>

      <main id="home">
        <section className="heroSection">
          <div className="heroContent">
            <p className="eyebrow">Human Resource Management System</p>
            <h1>
              Empowering People, <span>Streamlining Progress</span>
            </h1>
            <p className="heroCopy">
              A modern HR ecosystem for onboarding, attendance, leave approvals, payroll visibility, and clean role-based workflows.
            </p>
            <div className="heroActions">
              <a className="primaryButton heroButton" href="#signin" onClick={() => switchMode("signup")}>
                Get Started
              </a>
              <a className="secondaryButton heroButton" href="#features">
                <PlayCircle size={18} />
                Watch Demo
              </a>
            </div>
            <div className="trustStrip" aria-label="HRMS highlights">
              <span>Generated Login IDs</span>
              <span>Email verification</span>
              <span>Role-based access</span>
            </div>
          </div>

          <aside className="authPanel" id="signin" aria-label="Account access">
            <div className="authTabs" role="tablist" aria-label="Authentication options">
              <button className={mode === "signin" ? "selected" : ""} type="button" onClick={() => switchMode("signin")}>
                Sign In
              </button>
              <button className={mode === "signup" ? "selected" : ""} type="button" onClick={() => switchMode("signup")}>
                Sign Up
              </button>
            </div>

            {mode === "signin" ? (
              <form className="authForm" onSubmit={handleSignin}>
                <div>
                  <p className="formKicker">Welcome back</p>
                  <h2>Access your workspace</h2>
                </div>

                <label>
                  Login ID / Email
                  <input
                    value={signinForm.loginIdOrEmail}
                    onChange={(event) => setSigninForm((current) => ({ ...current, loginIdOrEmail: event.target.value }))}
                    autoComplete="username"
                    placeholder="OIJODO20260001 or name@company.com"
                  />
                  {errors.loginIdOrEmail ? <span className="fieldError">{errors.loginIdOrEmail}</span> : null}
                </label>

                <label>
                  Password
                  <span className="passwordField">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={signinForm.password}
                      onChange={(event) => setSigninForm((current) => ({ ...current, password: event.target.value }))}
                      autoComplete="current-password"
                      placeholder="Enter password"
                    />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label="Toggle password visibility">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                  {errors.password ? <span className="fieldError">{errors.password}</span> : null}
                </label>

                <button className="primaryButton" type="submit" disabled={isBusy}>
                  {isBusy ? "Signing in..." : "Sign In"}
                </button>
                <button className="linkButton" type="button" onClick={() => switchMode("signup")}>
                  Create a new employee account
                </button>
              </form>
            ) : (
              <form className="authForm signupForm" onSubmit={handleSignup}>
                <div className="signupHeader">
                  <div>
                    <p className="formKicker">HR/Admin setup</p>
                    <h2>Create account</h2>
                  </div>
                  <label className="uploadButton" title="Upload logo">
                    {logoPreview ? <img src={logoPreview} alt="Uploaded company logo preview" /> : <Upload size={18} />}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="formGrid">
                  <label>
                    Company Name
                    <input
                      value={signupForm.companyName}
                      onChange={(event) => setSignupForm((current) => ({ ...current, companyName: event.target.value }))}
                      placeholder="Odoo India"
                    />
                    {errors.companyName ? <span className="fieldError">{errors.companyName}</span> : null}
                  </label>
                  <label>
                    Role
                    <select value={signupForm.role} onChange={(event) => setSignupForm((current) => ({ ...current, role: event.target.value }))}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="HR">HR Officer</option>
                    </select>
                  </label>
                  <label>
                    Name
                    <input
                      value={signupForm.fullName}
                      onChange={(event) => setSignupForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="John Doe"
                    />
                    {errors.fullName ? <span className="fieldError">{errors.fullName}</span> : null}
                  </label>
                  <label>
                    Email
                    <input
                      value={signupForm.email}
                      onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
                      autoComplete="email"
                      placeholder="john@company.com"
                    />
                    {errors.email ? <span className="fieldError">{errors.email}</span> : null}
                  </label>
                  <label>
                    Phone
                    <input
                      value={signupForm.phone}
                      onChange={(event) => setSignupForm((current) => ({ ...current, phone: event.target.value }))}
                      autoComplete="tel"
                      placeholder="+91 90000 00000"
                    />
                    {errors.phone ? <span className="fieldError">{errors.phone}</span> : null}
                  </label>
                  <label>
                    Password
                    <span className="passwordField">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={signupForm.password}
                        onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label="Toggle password visibility">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                    {errors.password ? <span className="fieldError">{errors.password}</span> : null}
                  </label>
                  <label>
                    Confirm Password
                    <span className="passwordField">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={signupForm.confirmPassword}
                        onChange={(event) => setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label="Toggle confirm password visibility">
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </span>
                    {errors.confirmPassword ? <span className="fieldError">{errors.confirmPassword}</span> : null}
                  </label>
                </div>

                <div className="passwordRules" aria-label="Password rules">
                  {passwordChecklist.map((item) => (
                    <span className={item.valid ? "valid" : ""} key={item.label}>
                      {item.label}
                    </span>
                  ))}
                </div>

                <button className="secondaryButton" type="button" onClick={useSuggestedPassword}>
                  Generate secure password
                </button>
                <button className="primaryButton" type="submit" disabled={isBusy || !passwordSchema.safeParse(signupForm.password).success}>
                  {isBusy ? "Creating..." : "Sign Up"}
                </button>
              </form>
            )}

            {message ? (
              <p className={message.toLowerCase().includes("incorrect") || message.toLowerCase().includes("verify") ? "toast warning" : "toast"}>
                {message}
              </p>
            ) : null}

            {pendingVerification ? (
              <section className="verifyBox" aria-label="Email verification recovery">
                <div>
                  <strong>Email verification required</strong>
                  <span>{pendingVerification.email}</span>
                </div>
                <label>
                  Verification token
                  <input
                    value={pendingVerification.token}
                    onChange={(event) => setPendingVerification((current) => (current ? { ...current, token: event.target.value } : current))}
                    placeholder="Paste verification token"
                  />
                </label>
                {pendingVerification.token ? <small>Dev token: {pendingVerification.token}</small> : null}
                <div className="verifyActions">
                  <button type="button" onClick={verifyEmail} disabled={isBusy || !pendingVerification.token}>
                    Verify Email
                  </button>
                  <button type="button" onClick={resendVerification} disabled={isBusy}>
                    Resend Token
                  </button>
                </div>
              </section>
            ) : null}

            {signupSuccess ? (
              <section className="credentialCard" aria-label="Generated credentials">
                <span>Generated Login ID</span>
                <strong>{signupSuccess.employeeCode}</strong>
                <small>Dev verification token: {signupSuccess.verificationToken}</small>
                <button type="button" onClick={verifyEmail} disabled={isBusy}>
                  Verify Email Now
                </button>
              </section>
            ) : null}
          </aside>
        </section>

        <section className="pillarsSection" id="features">
          <div className="sectionIntro">
            <h2>Built for the Modern Workforce</h2>
            <p>Nexus HR integrates every touchpoint of the employee lifecycle into a single, cohesive source of truth.</p>
          </div>
          <div className="pillarGrid">
            {capabilityCards.map((card) => {
              const Icon = card.icon;
              return (
                <article className="pillarCard" key={card.title}>
                  <div className={`iconBox ${card.tone}`}>
                    <Icon size={22} />
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
