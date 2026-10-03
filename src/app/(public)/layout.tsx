import { Calendar, MapPin, Phone } from "lucide-react";
import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="text-2xl font-extrabold tracking-tight">
              Minha <span className="text-primary-orange">Quadra</span>
            </Link>
            
            <nav className="hidden md:flex space-x-8">
              <Link href="#" className="text-text-secondary hover:text-primary-orange font-medium">Modalidades</Link>
              <Link href="#" className="text-text-secondary hover:text-primary-orange font-medium">Preços</Link>
              <Link href="#" className="text-text-secondary hover:text-primary-orange font-medium">Localização</Link>
            </nav>

            <button className="btn-gradient px-6 py-2.5 rounded-button shadow-soft flex items-center gap-2">
              <Calendar size={18} /> Agendar Agora
            </button>
          </div>
        </div>
      </header>

      <main>
        {children}
      </main>

      <footer className="bg-dark text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-xl font-bold mb-6">Arena Central</h3>
            <p className="text-gray-400 leading-relaxed">
              O melhor complexo esportivo da região, com quadras profissionais e estrutura completa para você e sua equipe.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6">Contato</h3>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-gray-400">
                <MapPin size={18} className="text-primary-orange" />
                Rua dos Esportes, 123 - Centro
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <Phone size={18} className="text-primary-orange" />
                (11) 99999-9999
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-6">Minha Quadra SaaS</h3>
            <p className="text-gray-400 text-sm">
              Plataforma desenvolvida para gestão inteligente de complexos esportivos.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
