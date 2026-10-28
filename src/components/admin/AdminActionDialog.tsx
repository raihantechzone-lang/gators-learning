import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Request = { message: string; initial?: string; resolve: (value: string | boolean | null) => void };
const eventName = 'gators-admin-dialog';
export function adminConfirm(message: string): Promise<boolean> {
  return new Promise(resolve => window.dispatchEvent(new CustomEvent<Request>(eventName, { detail: { message, resolve: value => resolve(value === true) } })));
}
export function adminPrompt(message: string, initial = ''): Promise<string | null> {
  return new Promise(resolve => window.dispatchEvent(new CustomEvent<Request>(eventName, { detail: { message, initial, resolve: value => resolve(typeof value === 'string' ? value : null) } })));
}
export function AdminActionDialog() {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState('');
  useEffect(() => {
    const listener = (event: Event) => { const next = (event as CustomEvent<Request>).detail; setRequest(next); setValue(next.initial ?? ''); };
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, []);
  const close = (result: string | boolean | null) => { request?.resolve(result); setRequest(null); };
  return <Dialog open={!!request} onOpenChange={open => { if (!open) close(null); }}>
    <DialogContent aria-describedby="admin-action-message">
      <DialogHeader><DialogTitle>{request?.initial === undefined ? 'Confirm' : 'Edit / Save'}</DialogTitle><DialogDescription id="admin-action-message">{request?.message}</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); close(request?.initial === undefined ? true : value); }}>
        {request?.initial !== undefined && <Input aria-label={request.message} autoFocus value={value} onChange={event => setValue(event.target.value)} />}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => close(null)}>Cancel</Button><Button type="submit">{request?.initial === undefined ? 'Confirm' : 'Save'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}