'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Family = { id: string; name: string; phone: string | null; notes: string | null; status: 'active' | 'archived' };
type Account = { family_id: string; expected_amount_som: number; status: string; notes: string | null };
type Payment = { id: string; family_id: string; amount_som: number; paid_on: string; method: string; comment: string; created_at: string };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export default function RealPaymentsPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [families, setFamilies] = useState<Family[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [expected, setExpected] = useState('');
  const [comment, setComment] = useState('');
  const [method, setMethod] = useState('transfer');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const request = useCallback(async (path: string, options: RequestInit = {}, authToken = token) => {
    if (!url || !key) throw new Error('База ещё не подключена. Нужны NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
    const res = await fetch(url + path, {
      ...options,
      cache: 'no-store',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + (authToken || key),
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.msg || data.error_description || 'Ошибка сервера: ' + res.status);
    }
    return res.status === 204 ? null : res.json();
  }, [token]);

  const load = useCallback(async (authToken = token) => {
    const [fs, as, ps] = await Promise.all([
      request('/rest/v1/ql_families?select=id,name,phone,notes,status&order=created_at.desc', {}, authToken),
      request('/rest/v1/ql_payment_accounts?select=family_id,expected_amount_som,status,notes', {}, authToken),
      request('/rest/v1/ql_payment_transactions?select=id,family_id,amount_som,paid_on,method,comment,created_at&order=created_at.desc', {}, authToken),
    ]);
    setFamilies(fs); setAccounts(as); setPayments(ps);
  }, [request, token]);

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Неизвестная ошибка'); }
    finally { setBusy(false); }
  }

  async function signIn() {
    await run(async () => {
      const data = await request('/auth/v1/token?grant_type=password', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }, '');
      if (!data.access_token || !data.user?.id) throw new Error('Не удалось войти');
      setToken(data.access_token); setUserId(data.user.id); setPassword('');
      await load(data.access_token);
    });
  }

  useEffect(() => {
    if (!token) return;
    // Expired sessions must not silently show stale financial data.
    const id = setInterval(() => {
      // Session is intentionally kept in memory only; refresh via login when expired.
      if (document.visibilityState === 'visible') load().catch(() => { setToken(''); setUserId(''); setFamilies([]); setPayments([]); setAccounts([]); });
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [token, load]);

  const current = families.find(f => f.id === selected);
  const currentAccount = accounts.find(a => a.family_id === selected);
  const currentPayments = useMemo(() => payments.filter(p => p.family_id === selected), [payments, selected]);
  const paid = currentPayments.reduce((sum, p) => sum + Number(p.amount_som), 0);
  const due = Number(currentAccount?.expected_amount_som || 0);
  const fmt = (value: number) => new Intl.NumberFormat('ru-RU').format(value) + ' сом';

  async function addFamily() {
    await run(async () => {
      if (!name.trim()) throw new Error('Введите название семьи');
      const rows = await request('/rest/v1/ql_families?select=id', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ owner_id: userId, name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null }),
      });
      const id = rows[0].id;
      await request('/rest/v1/ql_payment_accounts', {
        method: 'POST', body: JSON.stringify({ owner_id: userId, family_id: id }),
      });
      setName(''); setPhone(''); setNotes(''); setSelected(id);
      await load(); setNotice('Семья сохранена в базе');
    });
  }

  async function setExpectedAmount() {
    await run(async () => {
      if (!selected || !/^\d+$/.test(expected) || !Number.isSafeInteger(Number(expected))) throw new Error('Введите корректную сумму');
      await request('/rest/v1/ql_payment_accounts?family_id=eq.' + encodeURIComponent(selected), {
        method: 'PATCH', body: JSON.stringify({ expected_amount_som: Number(expected) }),
      });
      await load(); setNotice('Сумма к оплате сохранена');
    });
  }

  async function addPayment() {
    await run(async () => {
      const n = Number(amount);
      if (!selected || !/^\d+$/.test(amount) || !Number.isSafeInteger(n) || n <= 0) throw new Error('Введите положительную сумму в сомах');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Укажите дату');
      await request('/rest/v1/ql_payment_transactions', {
        method: 'POST', body: JSON.stringify({ owner_id: userId, family_id: selected, amount_som: n, paid_on: date, method, comment: comment.trim() }),
      });
      setAmount(''); setComment('');
      await load(); setNotice('Платёж сохранён в базе');
    });
  }

  const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900';
  const button = 'rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
  return <main className="mx-auto max-w-5xl p-4 md:p-8 space-y-5 text-slate-900">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Реальные семьи и платежи</h1><p className="text-sm text-slate-500">Защищённый журнал оплат QuranLearn</p></div><Link href="/support" className="text-sm text-emerald-700">← Поддержка</Link></div>
    {!url || !key ? <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4">Серверная база ещё не настроена. Данные вводить нельзя.</div> :
      !token ? <form className="max-w-md space-y-3 rounded-2xl border bg-white p-5" onSubmit={e => { e.preventDefault(); void signIn(); }}>
        <h2 className="font-semibold">Вход администратора</h2>
        <input className={field} type="email" autoComplete="username" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)}/>
        <input className={field} type="password" autoComplete="current-password" placeholder="Пароль" required value={password} onChange={e => setPassword(e.target.value)}/>
        <button disabled={busy} className={button}>Войти</button>
      </form> : <>
        <div className="flex justify-end"><button className="text-sm text-slate-600 underline" onClick={() => { setToken(''); setUserId(''); setFamilies([]); setPayments([]); setAccounts([]); }}>Выйти</button></div>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold">Создать семью</h2>
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); void addFamily(); }}>
              <input className={field} required maxLength={200} placeholder="Название семьи / ФИО родителя" value={name} onChange={e => setName(e.target.value)}/>
              <input className={field} type="tel" placeholder="Телефон (необязательно)" value={phone} onChange={e => setPhone(e.target.value)}/>
              <textarea className={field} placeholder="Комментарий о семье" value={notes} onChange={e => setNotes(e.target.value)}/>
              <button className={button} disabled={busy}>Сохранить семью</button>
            </form>
          </section>
          <section className="rounded-2xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold">Выбрать семью</h2>
            <select className={field} value={selected} onChange={e => { setSelected(e.target.value); setExpected(''); }}>
              <option value="">Выберите семью</option>
              {families.filter(f => f.status === 'active').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {current && <><p className="text-sm text-slate-600">{current.phone || 'Телефон не указан'}</p><p className="text-sm text-slate-600">{current.notes}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">К оплате<br/><b>{fmt(due)}</b></div>
                <div className="rounded-xl bg-emerald-50 p-3">Получено<br/><b>{fmt(paid)}</b></div>
                <div className="rounded-xl bg-slate-50 p-3">Остаток<br/><b>{fmt(Math.max(0, due - paid))}</b></div>
                <div className="rounded-xl bg-slate-50 p-3">Статус<br/><b>{due > 0 && paid >= due ? 'Оплачено' : paid > 0 ? 'Частично' : 'Не оплачено'}</b></div>
              </div>
              <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void setExpectedAmount(); }}>
                <input className={field} type="number" min="0" step="1" placeholder="Сумма к оплате" value={expected} onChange={e => setExpected(e.target.value)}/>
                <button className={button} disabled={busy}>Сохранить</button>
              </form>
            </>}
          </section>
        </div>
        {current && <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold">Добавить платёж — {current.name}</h2>
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); void addPayment(); }}>
              <input className={field} type="number" min="1" step="1" required placeholder="Сумма в сомах" value={amount} onChange={e => setAmount(e.target.value)}/>
              <input className={field} type="date" required value={date} onChange={e => setDate(e.target.value)}/>
              <select className={field} value={method} onChange={e => setMethod(e.target.value)}><option value="transfer">Перевод</option><option value="cash">Наличные</option><option value="other">Другое</option></select>
              <textarea className={field} placeholder="Комментарий: бронь, частичная оплата..." value={comment} onChange={e => setComment(e.target.value)}/>
              <button className={button} disabled={busy}>Сохранить платёж</button>
            </form>
          </section>
          <section className="rounded-2xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold">История переводов</h2>
            {currentPayments.length === 0 ? <p className="text-sm text-slate-500">Платежей пока нет</p> : currentPayments.map(p => <div key={p.id} className="border-b pb-3 text-sm">
              <div className="flex justify-between gap-2"><span>{p.paid_on}</span><b>{fmt(Number(p.amount_som))}</b></div>
              <p className="text-slate-500">{p.comment || 'Без комментария'} · {p.method}</p>
            </div>)}
          </section>
        </div>}
      </>}
    {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
  </main>;
}
