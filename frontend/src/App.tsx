import { FormEvent, useState } from 'react'

type Strategy = 'reduceTerm' | 'reducePayment'

type Payment = {
  number: number
  date: string
  regularPayment: number
  extraPayment: number
  interest: number
  principal: number
  remainingBalance: number
}

type Comparison = {
  baseline: { initialMonthlyPayment: number; totalInterest: number; payments: Payment[] }
  optimized: { initialMonthlyPayment: number; totalInterest: number; payments: Payment[] }
  interestSavings: number
  monthsSaved: number
}

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

const initialDate = new Date().toISOString().slice(0, 10)

export default function App() {
  const [form, setForm] = useState({
    principal: 1_000_000,
    annualRate: 18,
    termMonths: 60,
    startDate: initialDate,
    monthlyExtraPayment: 10_000,
    strategy: 'reduceTerm' as Strategy,
  })
  const [result, setResult] = useState<Comparison | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const updateNumber = (name: string, value: string) =>
    setForm(current => ({ ...current, [name]: Number(value) }))

  async function calculate(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/loans/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error('Проверьте введённые значения.')
      setResult(await response.json())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось выполнить расчёт.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <header>
        <span className="brand">CREDIFY</span>
        <h1>Погасите кредит раньше.<br />Без лишнего напряжения.</h1>
        <p>Узнайте, сколько процентов и времени сэкономит комфортный досрочный платёж.</p>
      </header>

      <section className="calculator">
        <form onSubmit={calculate}>
          <label>Остаток кредита
            <div className="input-unit"><input type="number" min="1" value={form.principal}
              onChange={e => updateNumber('principal', e.target.value)} /><span>₽</span></div>
          </label>
          <label>Процентная ставка
            <div className="input-unit"><input type="number" min="0" max="100" step="0.01" value={form.annualRate}
              onChange={e => updateNumber('annualRate', e.target.value)} /><span>%</span></div>
          </label>
          <label>Оставшийся срок
            <div className="input-unit"><input type="number" min="1" max="600" value={form.termMonths}
              onChange={e => updateNumber('termMonths', e.target.value)} /><span>мес.</span></div>
          </label>
          <label>Первый платёж
            <input type="date" value={form.startDate}
              onChange={e => setForm(current => ({ ...current, startDate: e.target.value }))} />
          </label>
          <label className="wide">Могу доплачивать каждый месяц
            <div className="input-unit"><input type="number" min="0" step="100" value={form.monthlyExtraPayment}
              onChange={e => updateNumber('monthlyExtraPayment', e.target.value)} /><span>₽</span></div>
          </label>
          <fieldset className="wide">
            <legend>После досрочного платежа</legend>
            <label className="radio"><input type="radio" checked={form.strategy === 'reduceTerm'}
              onChange={() => setForm(current => ({ ...current, strategy: 'reduceTerm' }))} />
              Уменьшать срок <small>Максимальная экономия</small></label>
            <label className="radio"><input type="radio" checked={form.strategy === 'reducePayment'}
              onChange={() => setForm(current => ({ ...current, strategy: 'reducePayment' }))} />
              Уменьшать платёж <small>Меньше нагрузка</small></label>
          </fieldset>
          <button className="wide" disabled={loading}>{loading ? 'Считаем…' : 'Рассчитать выгоду'}</button>
          {error && <p className="error wide">{error}</p>}
        </form>
      </section>

      {result && <section className="results">
        <div className="result-title">
          <div><span>Ваша экономия</span><strong>{money.format(result.interestSavings)}</strong></div>
          <p>{form.strategy === 'reduceTerm'
            ? `Кредит закончится на ${result.monthsSaved} мес. раньше`
            : 'Ежемесячная нагрузка будет постепенно снижаться'}</p>
        </div>
        <div className="metrics">
          <article><span>Обычный платёж</span><strong>{money.format(result.baseline.initialMonthlyPayment)}</strong></article>
          <article><span>Проценты без досрочки</span><strong>{money.format(result.baseline.totalInterest)}</strong></article>
          <article><span>Проценты с досрочкой</span><strong>{money.format(result.optimized.totalInterest)}</strong></article>
          <article><span>Новый срок</span><strong>{result.optimized.payments.length} мес.</strong></article>
        </div>
        <details>
          <summary>Показать график платежей</summary>
          <div className="table-wrap"><table>
            <thead><tr><th>№</th><th>Дата</th><th>Платёж</th><th>Досрочно</th><th>Проценты</th><th>Остаток</th></tr></thead>
            <tbody>{result.optimized.payments.map(row =>
              <tr key={row.number}><td>{row.number}</td><td>{new Date(row.date).toLocaleDateString('ru-RU')}</td>
                <td>{money.format(row.regularPayment)}</td><td>{money.format(row.extraPayment)}</td>
                <td>{money.format(row.interest)}</td><td>{money.format(row.remainingBalance)}</td></tr>)}</tbody>
          </table></div>
        </details>
      </section>}

      <footer>Расчёт ориентировочный и не учитывает правила конкретного банка, комиссии и страховки.</footer>
    </main>
  )
}

