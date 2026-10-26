import { X } from "lucide-react";

export const CONTACT = {
  whatsapp: "https://wa.me/8801789407200",
  facebook: "https://www.facebook.com/gatorslearning/",
  instagram: "https://www.instagram.com/gatorslearning?vrfl=NTdtYnU2eWF2ZHlu",
  email: "mailto:adel111@gmail.com",
};

const items = [
  { label: "Facebook Page", href: CONTACT.facebook, icon: "fa-brands fa-facebook-f", color: "#1877F2" },
  { label: "WhatsApp: 01789-407200", href: CONTACT.whatsapp, icon: "fa-brands fa-whatsapp", color: "#25D366" },
  { label: "Instagram", href: CONTACT.instagram, icon: "fa-brands fa-instagram", color: "#E1306C" },
  { label: "Gmail", href: CONTACT.email, icon: "fa-solid fa-envelope", color: "#EA4335" },
];

export function ContactPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl bg-background p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-ink-muted" aria-label="Close"><X size={18} /></button>
        <h3 className="text-2xl font-bold text-ink text-center">Contact Us</h3>
        <p className="text-sm text-ink-muted text-center mt-1 mb-6">যেকোনো মাধ্যমে আমাদের সাথে যোগাযোগ করুন</p>
        <div className="flex flex-col gap-3">
          {items.map((i) => (
            <a key={i.label} href={i.href} target="_blank" rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-border p-3 font-semibold text-ink hover:bg-surface-alt transition">
              <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: i.color, color: "#fff" }}>
                <i className={i.icon} />
              </span>
              {i.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FloatingWhatsApp() {
  return (
    <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp 01789-407200"
      className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg hover:scale-110 transition"
      style={{ background: "#25D366", color: "#fff" }}>
      <i className="fa-brands fa-whatsapp" />
    </a>
  );
}
