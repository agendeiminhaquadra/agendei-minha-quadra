export default function TvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-dark text-white overflow-hidden aspect-video">
      {/* Top Bar para TV */}
      <header className="h-24 bg-dark-secondary border-b border-white/10 flex items-center justify-between px-12">
        <div className="flex items-center gap-6">
          <div className="text-3xl font-black tracking-tighter">
            MINHA <span className="text-primary-orange">QUADRA</span>
          </div>
          <div className="h-10 w-[2px] bg-white/20"></div>
          <div className="text-2xl font-bold text-white/80 uppercase tracking-widest">
            Arena Central
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-right">
            <div className="text-4xl font-black text-primary-orange tabular-nums">19:45</div>
            <div className="text-sm font-bold text-white/40 uppercase">Sexta, 25 de Setembro</div>
          </div>
        </div>
      </header>

      {/* Grid de Quadras otimizado para TV */}
      <main className="p-10 h-[calc(100vh-6rem)]">
        {children}
      </main>

      {/* Footer / Ticker para TV */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-primary-orange flex items-center px-12 overflow-hidden">
        <div className="flex items-center gap-8 whitespace-nowrap animate-pulse">
          <span className="font-black uppercase tracking-tighter">Aviso:</span>
          <span className="font-bold">Reserve seu horário pelo site: www.minhaquadra.com.br/arena-central</span>
          <span className="opacity-50">•</span>
          <span className="font-bold">Horário de funcionamento: 08:00 às 23:00</span>
        </div>
      </footer>
    </div>
  );
}
