"use client";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { LogIn, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { loginAction, LoginResult } from "./actions";

const initialState: LoginResult = { ok: false, error: "", fieldErrors: {} };

function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-4 rounded-xl font-black text-white text-base bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] hover:shadow-[0_10px_28px_rgba(255,122,0,0.4)] hover:scale-[1.01] active:scale-[0.997] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
    >
      <LogIn size={18} />
      {pending ? "Entrando..." : "Entrar no painel"}
      {!pending && <ArrowRight size={18} />}
    </button>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const created = searchParams.get("created");
  const [state, formAction] = useFormState(loginAction, initialState);
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("mq_saved_email");
      if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
    } catch { /* armazenamento local indisponível neste navegador */ }
  }, []);

  function handleRememberPreference() {
    try {
      if (rememberMe && email.trim()) localStorage.setItem("mq_saved_email", email.trim());
      else localStorage.removeItem("mq_saved_email");
    } catch { /* armazenamento local indisponível neste navegador */ }
  }

  if (state.ok) {
    const nextUrl = searchParams.get("next");
    if (nextUrl) {
      setTimeout(() => router.push(nextUrl), 0);
    } else {
      const destination = state.role === "SUPERADMIN" ? "/superadmin" : "/admin";
      setTimeout(() => router.push(destination), 0);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f5f2ee] p-4 sm:p-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-orange-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-amber-100 blur-3xl" />
      <div className="relative w-full max-w-6xl grid md:grid-cols-2 bg-white rounded-[2rem] overflow-hidden shadow-[0_32px_90px_-34px_rgba(22,28,40,0.38)] border border-white/70">
        <div className="hidden md:flex flex-col justify-between p-10 lg:p-14 bg-gradient-to-br from-[#0B1220] via-[#121C32] to-[#1A2742] text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FF6A00] opacity-40 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-[#FF8A00] opacity-20 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-8 inline-flex rounded-2xl border border-white/10 bg-black/20 p-2 shadow-xl">
              <Image src="/logo.png" alt="Agendei Minha Quadra" width={270} height={180} priority className="h-auto w-56 rounded-xl object-contain" />
            </div>
            <div className="hidden items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF8A00] to-[#FF6A00] flex items-center justify-center font-black text-2xl shadow-lg">
                🎾
              </div>
              <div>
                <p className="font-black text-xl leading-none">Agendei</p>
                <p className="text-sm font-black text-[#FF8A00] leading-none">Minha Quadra</p>
              </div>
            </div>

            <h1 className="text-4xl font-black leading-tight mb-5">
              Bem-vindo de<br />volta. 👋
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Acesse seu painel e continue gerenciando suas quadras, agendamentos e recebendo por Pix automaticamente.
            </p>
          </div>

          <div className="relative z-10 space-y-4 pt-8">
            {[
              "Dashboard com métricas em tempo real",
              "Agendamento online 24h por dia",
              "Pix integrado sem taxa de setup",
              "7 dias grátis para testar tudo",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#FF8A00]/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={14} className="text-[#FF8A00]" />
                </div>
                <span className="text-white/80">{item}</span>
              </div>
            ))}
          </div>

          <p className="relative z-10 text-white/40 text-sm pt-8">
            © 2026 Agendei Minha Quadra — Sistema completo para arenas.
          </p>
        </div>

        <div className="p-7 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="flex md:hidden items-center gap-4 mb-8">
            <Image src="/logo.png" alt="Agendei Minha Quadra" width={170} height={114} priority className="h-[72px] w-28 rounded-xl bg-[#0B1220] object-contain p-1" />
            <div className="hidden w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF8A00] to-[#FF6A00] items-center justify-center font-black text-xl shadow-lg">
              🎾
            </div>
            <div>
              <p className="font-black text-dark text-lg leading-none">Agendei</p>
              <p className="text-sm font-black text-[#FF8A00] leading-none">Minha Quadra</p>
            </div>
          </div>

          {created && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
              <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <div className="text-sm">
                <p className="font-bold">Conta criada com sucesso! 🎉</p>
                <p className="text-emerald-700 mt-1">
                  Seus 7 dias grátis começaram hoje. Faça login abaixo.
                </p>
              </div>
            </div>
          )}

          <p className="mb-3 hidden text-xs font-black uppercase tracking-[0.2em] text-orange-600 md:block">Acesso do administrador</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-dark mb-2">Entrar no sistema</h2>
          <p className="text-text-secondary mb-8">
            Novo por aqui?{" "}
            <Link
              href="/registrar"
              className="text-[#FF8A00] font-bold hover:underline underline-offset-2"
            >
              Teste grátis por 7 dias →
            </Link>
          </p>

          <form action={formAction} onSubmit={handleRememberPreference} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-dark mb-2">
                Seu e-mail
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@suaarena.com.br"
                className={cn(
                  "w-full px-4 py-3.5 rounded-xl border bg-white text-dark placeholder:text-gray-400 outline-none transition-all",
                  "focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15",
                  state.fieldErrors?.email && "border-red-500 ring-4 ring-red-100",
                )}
              />
              {state.fieldErrors?.email && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{state.fieldErrors.email}</p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="rememberMe" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-[#FF8A00]" />
              Lembrar meu e-mail e manter conectado por 30 dias neste dispositivo
            </label>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-dark">Sua senha</label>
                <Link
                  href="/registrar"
                  className="text-xs font-bold text-[#FF8A00] hover:underline"
                >
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    "w-full px-4 pr-12 py-3.5 rounded-xl border bg-white text-dark placeholder:text-gray-400 outline-none transition-all",
                    "focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15",
                    state.fieldErrors?.password && "border-red-500 ring-4 ring-red-100",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {state.fieldErrors?.password && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{state.fieldErrors.password}</p>
              )}
            </div>

            {state.error && !state.fieldErrors && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-2">
                <span className="font-black">⚠️</span>
                <span>{state.error}</span>
              </div>
            )}

            <LoginSubmitButton />

            <div className="text-center pt-2">
              <p className="text-sm text-text-secondary">
                Ainda não tem acesso?{" "}
                <Link
                  href="/registrar"
                  className="font-black text-[#FF8A00] hover:underline underline-offset-2"
                >
                  Criar conta grátis
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2]">
          <div className="w-12 h-12 border-4 border-[#FF8A00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
