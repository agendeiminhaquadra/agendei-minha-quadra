"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, MessageCircle, Share2, X } from "lucide-react";
import { formatCurrency, formatSaoPauloTime } from "@/lib/utils";

type Props = {
  bookingId: string;
  customerName: string;
  customerPhone: string | null;
  courtName: string;
  modalityName: string | null;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  isPaid: boolean;
  onClose: () => void;
};

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;",
  })[character] || character);
}

export function BookingReceiptDialog({
  bookingId, customerName, customerPhone, courtName, modalityName,
  startTime, endTime, totalPrice, isPaid, onClose,
}: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [canShareImage, setCanShareImage] = useState(false);
  const protocol = bookingId.slice(-8).toUpperCase();
  const bookingDate = startTime.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });
  const message = [
    `Olá, ${customerName}! Sua reserva foi confirmada.`, "",
    `Protocolo: ${protocol}`, `Quadra: ${courtName}`, `Modalidade: ${modalityName || "Livre"}`,
    `Data: ${bookingDate}`, `Horário: ${formatSaoPauloTime(startTime)} às ${formatSaoPauloTime(endTime)}`,
    `Valor: ${formatCurrency(totalPrice)}`, `Pagamento: ${isPaid ? "pago" : "pendente (pagamento no local)"}`,
  ].join("\n");
  const svg = useMemo(() => {
    const fields = [
      ["QUADRA", courtName], ["DATA", bookingDate],
      ["HORÁRIO", `${formatSaoPauloTime(startTime)} às ${formatSaoPauloTime(endTime)}`],
      ["VALOR", formatCurrency(totalPrice)], ["PAGAMENTO", isPaid ? "Pago" : "Pendente (pagamento no local)"],
    ];
    const rows = fields.map(([label, value], index) => {
      const y = 500 + index * 92;
      return `<text x="110" y="${y}" class="label">${escapeXml(label)}</text><text x="110" y="${y + 30}" class="value">${escapeXml(value)}</text>${index < fields.length - 1 ? `<line x1="110" y1="${y + 50}" x2="790" y2="${y + 68}" stroke="#dbe5ef" stroke-width="2"/>` : ""}`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><defs><style>.label{font:700 16px Arial,sans-serif;fill:#64748b;letter-spacing:1px}.value{font:700 25px Arial,sans-serif;fill:#10243e}</style><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07172d"/><stop offset="1" stop-color="#12375c"/></linearGradient><linearGradient id="orange" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff9f00"/><stop offset="1" stop-color="#ff501f"/></linearGradient></defs><rect width="900" height="1200" fill="#f3f7fb"/><path d="M0 0h900v270H0z" fill="url(#bg)"/><path d="M0 248h900v22H0z" fill="url(#orange)"/><text x="64" y="84" fill="#ff9f00" font-size="25" font-weight="800" font-family="Arial,sans-serif">Agendei</text><text x="64" y="142" fill="#fff" font-size="48" font-weight="900" font-family="Arial,sans-serif">Minha Quadra</text><text x="66" y="180" fill="#d6e1ed" font-size="18" letter-spacing="4" font-weight="700" font-family="Arial,sans-serif">SUA QUADRA, NA HORA CERTA</text><text x="66" y="228" fill="#fff" font-size="20" font-weight="700" font-family="Arial,sans-serif">SUA RESERVA ESTÁ GARANTIDA</text><rect x="42" y="300" width="816" height="812" rx="34" fill="#fff"/><circle cx="120" cy="376" r="34" fill="#12b76a"/><path d="m104 376 11 11 22-24" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><text x="174" y="371" fill="#10243e" font-size="34" font-weight="900" font-family="Arial,sans-serif">Comprovante de Reserva</text><text x="174" y="405" fill="#66758a" font-size="20" font-family="Arial,sans-serif">Agendamento confirmado com sucesso</text><rect x="110" y="430" width="680" height="44" rx="14" fill="#eaf8f0"/><text x="132" y="459" fill="#078749" font-size="18" font-weight="800" font-family="Arial,sans-serif">PROTOCOLO  ${protocol}</text>${rows}<rect x="110" y="955" width="680" height="125" rx="18" fill="#fff7ed"/><text x="136" y="990" fill="#a34a00" font-size="17" font-weight="800" font-family="Arial,sans-serif">IMPORTANTE</text><text x="136" y="1022" fill="#60452f" font-size="16" font-family="Arial,sans-serif">Chegue com 10 minutos de antecedência. Pagamento no local.</text><text x="450" y="1160" text-anchor="middle" fill="#52647a" font-size="17" font-family="Arial,sans-serif">Boa partida! • Agendei Minha Quadra</text></svg>`;
  }, [bookingDate, courtName, endTime, isPaid, protocol, startTime, totalPrice]);
  const previewUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  useEffect(() => {
    let canceled = false;
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    createImageBitmap(svgBlob).then((bitmap) => {
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 1200;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a imagem.");
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      canvas.toBlob((blob) => {
        if (!blob || canceled) return;
        const file = new File([blob], `comprovante-${protocol}.png`, { type: "image/png" });
        setImageFile(file);
        setCanShareImage(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
      }, "image/png");
    }).catch(() => { if (!canceled) setImageFile(null); });
    return () => { canceled = true; };
  }, [protocol, svg]);

  function downloadImage() {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = imageFile.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareImage() {
    if (!imageFile || !canShareImage) return;
    try {
      await navigator.share({ files: [imageFile], title: "Comprovante de reserva", text: message });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") window.alert("Não foi possível abrir o compartilhamento. Baixe a imagem e anexe no WhatsApp.");
    }
  }

  function openWhatsApp() {
    const digits = customerPhone?.replace(/\D/g, "") || "";
    if (!digits) {
      window.alert("Este cliente não tem telefone cadastrado.");
      return;
    }
    const phone = digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits : `55${digits}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div><h2 id="receipt-title" className="font-bold text-dark">Comprovante da reserva</h2><p className="text-xs text-text-secondary">A imagem não tem QR Code.</p></div>
          <button aria-label="Fechar comprovante" onClick={onClose} className="rounded-lg p-2 text-text-secondary hover:bg-background-light"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto bg-slate-100 p-4"><img src={previewUrl} alt="Prévia do comprovante de reserva" className="mx-auto h-auto w-full max-w-[360px] rounded-xl shadow" /></div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {canShareImage && <button disabled={!imageFile} onClick={() => void shareImage()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 sm:col-span-2"><Share2 size={17} />{imageFile ? "Escolher onde compartilhar a foto" : "Preparando imagem..."}</button>}
          <button disabled={!imageFile} onClick={downloadImage} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-dark hover:bg-background-light disabled:opacity-50"><Download size={17} />Baixar imagem</button>
          <button onClick={openWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white hover:brightness-95"><MessageCircle size={17} />Abrir conversa</button>
        </div>
        <p className="px-4 pb-4 text-center text-xs text-text-secondary">No celular, escolha WhatsApp no compartilhamento. No computador, baixe a imagem e anexe na conversa.</p>
      </section>
    </div>
  );
}
