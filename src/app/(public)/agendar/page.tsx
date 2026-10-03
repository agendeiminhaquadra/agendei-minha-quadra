export default function PublicArena() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <section className="mb-16">
        <h2 className="text-3xl font-extrabold text-dark mb-8">Nossas Quadras</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <CourtCard name="Quadra 01 - Society" sport="Futebol" price="150" image="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800" />
          <CourtCard name="Quadra 02 - Beach Tennis" sport="Beach Tennis" price="80" image="https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&q=80&w=800" />
          <CourtCard name="Quadra 03 - Vôlei" sport="Vôlei" price="100" image="https://images.unsplash.com/photo-1592656670411-b19e9f39c395?auto=format&fit=crop&q=80&w=800" />
        </div>
      </section>
    </div>
  );
}

function CourtCard({ name, sport, price, image }: { name: string; sport: string; price: string; image: string }) {
  return (
    <div className="card-modern group cursor-pointer">
      <div className="h-48 overflow-hidden relative">
        <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-dark">
          R$ {price}/h
        </div>
      </div>
      <div className="p-6">
        <span className="text-xs font-bold uppercase tracking-wider text-primary-orange mb-2 block">{sport}</span>
        <h3 className="text-xl font-bold text-dark mb-4">{name}</h3>
        <button className="w-full py-2.5 rounded-button border-2 border-primary-orange text-primary-orange font-bold hover:bg-primary-orange hover:text-white transition-all">
          Ver Horários
        </button>
      </div>
    </div>
  );
}
