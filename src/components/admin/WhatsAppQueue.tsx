import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, Copy } from 'lucide-react';
import { messageLink } from '@/lib/management-rules';
import { toast } from 'sonner';

export type QueueRecipient = { id: string; name: string; phone: string; course?: string; lesson?: string; date?: string };
export function WhatsAppQueue({ recipients, initialTemplate }: { recipients: QueueRecipient[]; initialTemplate: string }) {
  const [template, setTemplate] = useState(initialTemplate);
  const [phones, setPhones] = useState<Record<string,string>>({});
  const [excluded, setExcluded] = useState<string[]>([]);
  const [opened, setOpened] = useState<string[]>([]);
  const selected = recipients.filter(r => !excluded.includes(r.id));
  const link = (r: QueueRecipient) => messageLink(phones[r.id] ?? r.phone, template, {name:r.name,course:r.course || '',lesson:r.lesson || '',date:r.date || ''});
  const open = (r: QueueRecipient) => {
    if (!template.trim()) return toast.error('মেসেজ লিখুন।');
    const url = link(r); if (!url) return toast.error('সম্পূর্ণ WhatsApp নম্বর দিন: 01… বা +880 1…');
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpened(ids => [...new Set([...ids,r.id])]);
  };
  const next = selected.find(r => !opened.includes(r.id));
  return <section className="space-y-4">
    <label className="block space-y-2"><span className="font-semibold">মেসেজ</span><Textarea aria-label="WhatsApp message" rows={6} maxLength={4000} value={template} onChange={e => setTemplate(e.target.value)} /></label>
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => next && open(next)} disabled={!next || !template.trim()}><MessageCircle size={16} />পরের WhatsApp খুলুন</Button>
      <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(selected.map(r => link(r)).filter(Boolean).join('\n')); toast.success('মেসেজ লিংক কপি হয়েছে'); } catch {toast.error('কপি করা যায়নি।');} }} disabled={!selected.length}><Copy size={16} />লিংক কপি</Button>
      <Button variant="ghost" onClick={() => setOpened([])} disabled={!opened.length}>আবার শুরু করুন</Button>
      <span className="text-sm text-muted-foreground">নির্বাচিত {selected.length} · খোলা {opened.length}</span>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="p-3">নির্বাচন</th><th className="p-3">শিক্ষার্থী</th><th className="p-3">WhatsApp</th><th className="p-3">মেসেজ</th></tr></thead><tbody>
      {recipients.map(r => <tr key={r.id} className="border-b border-border"><td className="p-3"><Checkbox aria-label={`Select ${r.name}`} checked={!excluded.includes(r.id)} onCheckedChange={checked => setExcluded(ids => checked ? ids.filter(id => id !== r.id) : [...ids,r.id])} /></td><td className="p-3"><p className="font-semibold">{r.name}</p>{r.course && <p className="text-muted-foreground">{r.course}</p>}</td><td className="p-3"><Input type="tel" aria-label={`WhatsApp ${r.name}`} value={phones[r.id] ?? r.phone} onChange={e => setPhones(values => ({...values,[r.id]:e.target.value}))} className="min-w-40" /></td><td className="p-3"><Button variant="outline" onClick={() => open(r)} disabled={excluded.includes(r.id)}><MessageCircle size={16} />{opened.includes(r.id) ? 'আবার খুলুন' : 'WhatsApp খুলুন'}</Button></td></tr>)}
    </tbody></table></div>
    {!recipients.length && <p className="text-muted-foreground">কোনো শিক্ষার্থী পাওয়া যায়নি।</p>}
  </section>;
}