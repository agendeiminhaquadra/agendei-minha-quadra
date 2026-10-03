export default function TvDisplay() {
  return (
    <div className="grid grid-cols-4 gap-6 h-full">
      <TvCourtColumn name="Quadra 01" sport="Society" status="RESERVADO" time="19:00 - 20:00" team="Os Galáticos" />
      <TvCourtColumn name="Quadra 02" sport="Beach" status="LIVRE" time="19:00 - 20:00" />
      <TvCourtColumn name="Quadra 03" sport="Vôlei" status="RESERVADO" time="19:00 - 20:00" team="Vôlei Mix" />
      <TvCourtColumn name="Quadra 04" sport="Society" status="PENDENTE" time="20:00 - 21:00" team="Amigos do Fds" />
    </div>
  );
}

function TvCourtColumn({ name, sport, status, time, team }: { name: string; sport: string; status: 'RESERVADO' | 'LIVRE' | 'PENDENTE'; time: string; team?: string }) {
  const statusColors = {
    RESERVADO: 'bg-red',
    LIVRE: 'bg-status-confirmed',
    PENDENTE: 'bg-status-pending',
  };

  return (
    <div className="bg-dark-secondary rounded-card border border-white/5 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="text-primary-orange font-black text-xl mb-1">{sport}</div>
        <div className="text-3xl font-bold">{name}</div>
      </div>
      
      <div className="flex-1 p-6 flex flex-col justify-center items-center text-center">
        <div className="text-white/40 text-lg font-bold uppercase mb-2">Agora</div>
        <div className="text-2xl font-black mb-4">{time}</div>
        
        <div className={`px-6 py-3 rounded-full text-xl font-black mb-6 ${statusColors[status]}`}>
          {status}
        </div>
        
        {team && (
          <div className="text-3xl font-bold text-white tracking-tight">
            {team}
          </div>
        )}
      </div>

      <div className="p-6 bg-white/5 text-center">
        <div className="text-white/40 text-sm font-bold uppercase mb-1">Próximo Horário</div>
        <div className="font-bold">20:00 - Disponível</div>
      </div>
    </div>
  );
}
