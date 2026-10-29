import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEVELOPER_EMAIL = "raihan111@gmail.com";

export function safeDevUrl(u: string) {
  try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch { return ""; }
}

export async function loadDeveloperCredit() {
  const { data } = await (supabase as any).from("settings").select("setting_key,setting_value").in("setting_key", ["developer_name", "developer_url"]);
  const c = { name: "Raihan Tech Zone", url: "" };
  (data || []).forEach((r: any) => {
    if (r.setting_key === "developer_name" && r.setting_value) c.name = r.setting_value;
    if (r.setting_key === "developer_url") c.url = r.setting_value || "";
  });
  return c;
}

/** Footer bottom bar matching the reference: copyright | Developed By: <bold cyan link>. */
export function FooterCredit({ className = "" }: { className?: string }) {
  const [c, setC] = useState({ name: "Raihan Tech Zone", url: "" });
  useEffect(() => { loadDeveloperCredit().then(setC).catch(() => {}); }, []);
  const url = safeDevUrl(c.url);
  return (
    <p className={`text-sm leading-relaxed ${className}`}>
      Copyright © {new Date().getFullYear()} <strong>Gators Learning.</strong> All rights reserved
      <span className="mx-2 opacity-60">|</span>
      <br className="sm:hidden" />
      Developed By:{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-dev-credit hover:underline">{c.name}</a>
      ) : (
        <span className="font-bold text-dev-credit">{c.name}</span>
      )}
    </p>
  );
}
