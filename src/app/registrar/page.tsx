"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Rocket,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { registrarAction, RegistrarResult } from "./actions";

const initialState: RegistrarResult = { ok: false, error: "", fieldErrors: {} };

function RegistrarSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="sm:col-span-2 w-full py-4 rounded-xl font-black text-white text-base bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] hover:shadow-[0_10px_28px_rgba(255,122,0,0.4)] hover:scale-[1.01] active:scale-[0.997] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
    >
      <Rocket size={18} />
      {pending ? "Criando sua conta..." : "Criar conta e começar teste grátis"}
      {!pending && <ArrowRight size={18} />}
    </button>
  );
}

function RegistrarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction] = useFormState(registrarAction, initialState);
  const [showPw, setShowPw] = useState(false);

  if (state.ok) {
    setTimeout(() => router.push("/login?created=1"), 0);
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#FFF9F2] via-[#FFFBF5] to-[#FFF0E0] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-6xl grid lg:grid-cols-5 gap-0 bg-white rounded-3xl overflow-hidden shadow-2xl border border-border">
        <div className="hidden lg:flex lg:col-span-2 flex-col justify-between p-10 bg-gradient-to-br from-[#FF8A00] via-[#FF7500] to-[#FF5A00] text-white relative overflow-hidden">
          <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#0B1220]/30 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur border border-white/20 mb-8">
              <Sparkles size={16} />
              <span className="text-sm font-black">7 DIAS GRÁTIS</span>
              <span className="text-xs font-bold opacity-80">sem cartão</span>
            </div>

            <h1 className="text-4xl font-black leading-tight mb-4">
              Comece a usar <br />hoje mesmo 🚀
            </h1>
            <p className="text-white/90 text-lg leading-relaxed">
              Crie sua conta gratuita, configure seu complexo e comece a vender horários online nos próximos 10 minutos.
            </p>
          </div>

          <div className="relative z-10 space-y-3 py-6">
            {[
              { icon: CheckCircle2, text: "Sem taxa de adesão, sem multa" },
              { icon: ShieldCheck, text: "Dados 100% privados e isolados" },
              { icon: CreditCard, text: "Não precisa cadastrar cartão" },
              { icon: Rocket, text: "Painel pronto em menos de 5 min" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-white/10 backdrop-blur border border-white/15 p-3 rounded-2xl">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={15} />
                </div>
                <span className="font-semibold">{text}</span>
              </div>
            ))}
          </div>

          <div className="relative z-10 pt-4 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">
                🎾
              </div>
              <div>
                <p className="font-black leading-none">Agendei</p>
                <p className="text-xs font-bold opacity-85 leading-none">Minha Quadra</p>
              </div>
            </div>
            <p className="text-white/60 text-xs">© 2026</p>
          </div>
        </div>

        <div className="lg:col-span-3 p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex lg:hidden items-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF8A00] to-[#FF6A00] flex items-center justify-center font-black text-xl shadow-lg">
              🎾
            </div>
            <div>
              <p className="font-black text-dark text-lg leading-none">Agendei</p>
              <p className="text-sm font-black text-[#FF8A00] leading-none">Minha Quadra</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF8A00]/10 border border-[#FF8A00]/20 text-[#FF6A00] text-xs font-black">
              <Sparkles size={13} />
              7 dias grátis
            </span>
          </div>

          <h2 className="text-3xl font-black text-dark mb-2">Criar minha conta</h2>
          <p className="text-text-secondary mb-7">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="text-[#FF8A00] font-bold hover:underline underline-offset-2"
            >
              Fazer login →
            </Link>
          </p>

          <form action={formAction} className="grid sm:grid-cols-2 gap-x-5 gap-y-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-dark mb-2">Seu nome completo</label>
              <input
                type="text"
                name="ownerName"
                required
                autoComplete="name"
                placeholder="João da Silva"
                defaultValue={searchParams.get("ownerName") || ""}
                className={cn(
                  "w-full px-4 py-3.5 rounded-xl border bg-white text-dark placeholder:text-gray-400 outline-none transition-all",
                  "focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15",
                  state.fieldErrors?.ownerName && "border-red-500 ring-4 ring-red-100",
                )}
              />
              {state.fieldErrors?.ownerName && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{state.fieldErrors.ownerName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-dark mb-2">Nome do seu complexo</label>
              <input
                type="text"
                name="companyName"
                required
                placeholder="Arena Sports Center"
                defaultValue={searchParams.get("companyName") || ""}
                className={cn(
                  "w-full px-4 py-3.5 rounded-xl border bg-white text-dark placeholder:text-gray-400 outline-none transition-all",
                  "focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15",
                  state.fieldErrors?.companyName && "border-red-500 ring-4 ring-red-100",
                )}
              />
              {state.fieldErrors?.companyName && (
                <p className="mt-1.5 text-sm text-red-600 font-medium">{state.fieldErrors.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-dark mb-2">Cidade</label>
              <input
                type="text"
                name="city"
                required
                placeholder="São Paulo - SP"
                defaultValue={searchParams.get("city") || ""}
                className={cn(
                  "w-full px-4 py-3.5 rounded-xl border bg-white text-dark placeholder:text-gray-400 outline-none transition-all",
                  "focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15",
                  state.fieldErrors?.city && "border-red-500 ring-4 ring-red-100",
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-dark mb-2">Seu e-mail</label>
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
              <label className="block text-sm font-bold text-dark mb-2">Telefone / WhatsApp</label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="(11) 99999-9999"
                defaultValue={searchParams.get("phone") || ""}
                className={cn(
                  "w-full px-4 py-3.5 rounded-xl border bg-white text-dark placeholder:text-gray-400 outline-none transition-all",
                  "focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15",
                  state.fieldErrors?.phone && "border-red-500 ring-4 ring-red-100",
                )}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-dark mb-2">Crie uma senha</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
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
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-2">
                <span className="font-black">⚠️</span>
                <span>{state.error}</span>
              </div>
            )}

            <RegistrarSubmitButton />

            <p className="sm:col-span-2 text-center text-xs text-text-secondary pt-1 leading-relaxed">
              Ao criar conta, você concorda com nossos{" "}
              <Link href="#" className="font-bold text-dark hover:underline">
                Termos de Uso
              </Link>{" "}
              e{" "}
              <Link href="#" className="font-bold text-dark hover:underline">
                Política de Privacidade
              </Link>
              . 100% livre de spam.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegistrarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2]">
          <div className="w-12 h-12 border-4 border-[#FF8A00] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RegistrarContent />
    </Suspense>
  );
}
