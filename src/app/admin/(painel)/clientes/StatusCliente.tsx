'use client';
import { useState, useTransition } from 'react';
import { mudarStatusCliente } from '../../acoes';
import { STATUS_CLIENTE } from '@/lib/rotulos';

export default function StatusCliente({ id, status }: { id: string; status: string }) {
  const [valor, setValor] = useState(status);
  const [pendente, iniciar] = useTransition();
  return (
    <select
      className={`stsel t-${STATUS_CLIENTE[valor]?.[1] ?? 'mute'}`} value={valor} disabled={pendente} aria-label="Status do cliente"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { const v = e.target.value; setValor(v); iniciar(async () => { const r = await mudarStatusCliente(id, v); if (r.erro) { setValor(status); alert(r.erro); } }); }}
    >
      {Object.entries(STATUS_CLIENTE).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}
