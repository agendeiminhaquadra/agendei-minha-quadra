"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
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

  if (state.ok) {
    setTimeout(() => router.push("/admin"), 0);
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#FFF9F2] via-[#FFFBF5] to-[#FFF0E0] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 bg-white rounded-3xl overflow-hidden shadow-2xl border border-border">
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-[#0B1220] via-[#121C32] to-[#1A2742] text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#FF6A00] opacity-40 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-[#FF8A00] opacity-20 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
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

        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex md:hidden items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF8A00] to-[#FF6A00] flex items-center justify-center font-black text-xl shadow-lg">
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

          <h2 className="text-3xl font-black text-dark mb-2">Entrar no sistema</h2>
          <p className="text-text-secondary mb-7">
            Novo por aqui?{" "}
            <Link
              href="/registrar"
              className="text-[#FF8A00] font-bold hover:underline underline-offset-2"
            >
              Teste grátis por 7 dias →
            </Link>
          </p>

          <form action={formAction} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-dark mb-2">
                Seu e-mail
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
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
