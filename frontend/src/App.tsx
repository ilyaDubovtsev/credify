import { FormEvent, useEffect, useState } from 'react'

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[]; l?: number }
    dataLayer?: unknown[]
  }
}

type Strategy = 'reduceTerm' | 'reducePayment'
type ExtraPayment = { id: string; date: string; amount: number }
type Payment = {
  number: number
  date: string
  regularPayment: number
  extraPayment: number
  interest: number
  principal: number
  remainingBalance: number
}
type Schedule = {
  initialMonthlyPayment: number
  totalInterest: number
  payments: Payment[]
}
type Comparison = {
  baseline: Schedule
  optimized: Schedule
  interestSavings: number
  monthsSaved: number
}
type Analysis = {
  baseline: Schedule
  reduceTerm: Comparison
  reducePayment: Comparison
  recommendedStrategy: Strategy
}
type SafePlan = {
  requiredReserve: number
  recommendedImmediatePayment: number
  savingsAfterPayment: number
  comparison: Comparison
}
type FormState = {
  principal: number
  annualRate: number
  termMonths: number
  startDate: string
  monthlyExtraPayment: number
  oneTimePayments: ExtraPayment[]
  safeMode: boolean
  currentSavings: number
  monthlyEssentialExpenses: number
  reserveMonths: number
}

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
})
const STORAGE_KEY = 'credify-scenario-v2'
const ANALYTICS_CONSENT_KEY = 'credify-analytics-consent'
const defaultForm: FormState = {
  principal: 1_000_000,
  annualRate: 18,
  termMonths: 60,
  startDate: new Date().toISOString().slice(0, 10),
  monthlyExtraPayment: 10_000,
  oneTimePayments: [],
  safeMode: false,
  currentSavings: 500_000,
  monthlyEssentialExpenses: 100_000,
  reserveMonths: 3,
}

function loadForm(): FormState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm
  } catch {
    return defaultForm
  }
}

function enableMetrika() {
  if (document.querySelector('script[data-yandex-metrika]')) return

  window.ym = window.ym || function (...args: unknown[]) {
    window.ym?.a?.push(args)
  }
  window.ym.a = window.ym.a || []
  window.ym.l = Date.now()
  window.dataLayer = window.dataLayer || []

  const script = document.createElement('script')
  script.async = true
  script.dataset.yandexMetrika = 'true'
  script.src = 'https://mc.yandex.ru/metrika/tag.js?id=111013567'
  document.head.appendChild(script)

  window.ym(111013567, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  })
}

function DebtChart({ analysis }: { analysis: Analysis }) {
  const points = 16
  const principal = Math.max(
    analysis.baseline.payments[0]?.remainingBalance ?? 1,
    1,
  )
  const series = [
    { key: 'baseline', label: 'Без досрочки', schedule: analysis.baseline },
    { key: 'payment', label: 'Меньше платёж', schedule: analysis.reducePayment.optimized },
    { key: 'term', label: 'Меньше срок', schedule: analysis.reduceTerm.optimized },
  ]
  const valueAt = (schedule: Schedule, point: number) => {
    const month = Math.round(point * (analysis.baseline.payments.length - 1) / (points - 1))
    return schedule.payments[month]?.remainingBalance ?? 0
  }

  return <section className="debt-section">
    <div className="section-heading">
      <div><span>Динамика долга</span><h2>Как быстро снижается остаток</h2></div>
      <div className="legend">{series.map(item =>
        <span key={item.key} className={item.key}>{item.label}</span>)}</div>
    </div>
    <div className="debt-chart" role="img" aria-label="Сравнение остатка долга по трём сценариям">
      {Array.from({ length: points }, (_, point) =>
        <div className="chart-point" key={point}>
          <div className="bar-group">
            {series.map(item => <i key={item.key} className={item.key}
              style={{ height: `${Math.max(1, valueAt(item.schedule, point) / principal * 100)}%` }} />)}
          </div>
          {(point === 0 || point === points - 1 || point === Math.floor(points / 2)) &&
            <small>{Math.round(point * (analysis.baseline.payments.length - 1) / (points - 1))} мес.</small>}
        </div>)}
    </div>
  </section>
}

export default function App() {
  const [form, setForm] = useState<FormState>(loadForm)
  const [result, setResult] = useState<Analysis | null>(null)
  const [safePlan, setSafePlan] = useState<SafePlan | null>(null)
  const [activeStrategy, setActiveStrategy] = useState<Strategy>('reduceTerm')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyticsConsent, setAnalyticsConsent] = useState<string | null>(
    () => localStorage.getItem(ANALYTICS_CONSENT_KEY),
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  useEffect(() => {
    if (analyticsConsent === 'accepted') enableMetrika()
  }, [analyticsConsent])

  const chooseAnalytics = (choice: 'accepted' | 'rejected') => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, choice)
    setAnalyticsConsent(choice)
  }

  const updateNumber = (name: keyof FormState, value: string) =>
    setForm(current => ({ ...current, [name]: Number(value) }))

  const addExtraPayment = () => {
    const date = new Date(`${form.startDate}T12:00:00`)
    date.setMonth(date.getMonth() + Math.min(6, Math.max(1, form.termMonths - 1)))
    setForm(current => ({
      ...current,
      oneTimePayments: [...current.oneTimePayments, {
        id: crypto.randomUUID(), date: date.toISOString().slice(0, 10), amount: 50_000,
      }],
    }))
  }

  const updateExtra = (id: string, field: 'date' | 'amount', value: string) =>
    setForm(current => ({
      ...current,
      oneTimePayments: current.oneTimePayments.map(payment =>
        payment.id === id ? { ...payment, [field]: field === 'amount' ? Number(value) : value } : payment),
    }))

  async function calculate(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const loan = {
        principal: form.principal,
        annualRate: form.annualRate,
        termMonths: form.termMonths,
        startDate: form.startDate,
        monthlyExtraPayment: form.monthlyExtraPayment,
        strategy: 'reduceTerm',
        oneTimePayments: form.oneTimePayments.map(({ date, amount }) => ({ date, amount })),
      }
      const analysisRequest = fetch('/api/loans/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loan),
      })
      const safeRequest = form.safeMode
        ? fetch('/api/loans/safe-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              loan,
              currentSavings: form.currentSavings,
              monthlyEssentialExpenses: form.monthlyEssentialExpenses,
              reserveMonths: form.reserveMonths,
            }),
          })
        : null
      const [response, safeResponse] = await Promise.all([analysisRequest, safeRequest])
      if (!response.ok || (safeResponse && !safeResponse.ok))
        throw new Error('Проверьте суммы и даты в сценарии.')
      const analysis: Analysis = await response.json()
      setResult(analysis)
      setSafePlan(safeResponse ? await safeResponse.json() : null)
      setActiveStrategy(analysis.recommendedStrategy)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось выполнить расчёт.')
    } finally {
      setLoading(false)
    }
  }

  const selected = result?.[activeStrategy]

  return <main>
    <header className="hero">
      <nav className="topbar">
        <a className="brand" href="/" aria-label="credify/кредифай">credify<span>/кредифай</span></a>
        <span className="nav-note"><i /> умный план погашения</span>
      </nav>
      <div className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Переплачивать — необязательно</span>
          <h1>Закройте кредит<br /><em>раньше срока.</em></h1>
          <p>Соберём персональный план досрочных платежей, сохраним финансовую подушку и покажем вашу выгоду в рублях.</p>
          <a className="hero-cta" href="#calculator">Рассчитать выгоду <span>↓</span></a>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-card orbit-main">
            <span>Потенциальная экономия</span>
            <strong>− 284 600 ₽</strong>
            <div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div>
          </div>
          <div className="orbit-card orbit-time"><span>Срок кредита</span><strong>− 19 мес.</strong></div>
          <div className="orbit-pill">Безопасно для подушки</div>
        </div>
      </div>
    </header>

    <section className="calculator" id="calculator">
      <div className="block-heading">
        <span>01 — параметры</span>
        <div><h2>Расскажите о кредите</h2><p>Все данные остаются только на вашем устройстве</p></div>
      </div>
      <form onSubmit={calculate}>
        <label>Остаток кредита
          <div className="input-unit"><input className="ym-disable-keys" type="number" min="1" value={form.principal}
            onChange={e => updateNumber('principal', e.target.value)} /><span>₽</span></div>
        </label>
        <label>Процентная ставка
          <div className="input-unit"><input className="ym-disable-keys" type="number" min="0" max="100" step="0.01" value={form.annualRate}
            onChange={e => updateNumber('annualRate', e.target.value)} /><span>%</span></div>
        </label>
        <label>Оставшийся срок
          <div className="input-unit"><input className="ym-disable-keys" type="number" min="1" max="600" value={form.termMonths}
            onChange={e => updateNumber('termMonths', e.target.value)} /><span>мес.</span></div>
        </label>
        <label>Первый платёж
          <input className="ym-disable-keys" type="date" value={form.startDate}
            onChange={e => setForm(current => ({ ...current, startDate: e.target.value }))} />
        </label>
        <label className="wide">Могу доплачивать каждый месяц
          <div className="input-unit"><input className="ym-disable-keys" type="number" min="0" step="100" value={form.monthlyExtraPayment}
            onChange={e => updateNumber('monthlyExtraPayment', e.target.value)} /><span>₽</span></div>
        </label>

        <div className="wide extras">
          <div className="extras-heading">
            <div><strong>Разовые досрочные платежи</strong><small>Например, премия или налоговый вычет</small></div>
            <button type="button" className="secondary" onClick={addExtraPayment}>+ Добавить платёж</button>
          </div>
          {form.oneTimePayments.map((payment, index) =>
            <div className="extra-row" key={payment.id}>
              <span>#{index + 1}</span>
              <label>Дата<input className="ym-disable-keys" type="date" value={payment.date}
                onChange={e => updateExtra(payment.id, 'date', e.target.value)} /></label>
              <label>Сумма<div className="input-unit"><input className="ym-disable-keys" type="number" min="1000" step="1000" value={payment.amount}
                onChange={e => updateExtra(payment.id, 'amount', e.target.value)} /><span>₽</span></div></label>
              <button type="button" className="remove" aria-label={`Удалить платёж ${index + 1}`}
                onClick={() => setForm(current => ({ ...current,
                  oneTimePayments: current.oneTimePayments.filter(item => item.id !== payment.id) }))}>×</button>
            </div>)}
        </div>

        <div className={`wide safe-mode ${form.safeMode ? 'enabled' : ''}`}>
          <label className="safe-toggle">
            <input className="ym-disable-keys" type="checkbox" checked={form.safeMode}
              onChange={e => setForm(current => ({ ...current, safeMode: e.target.checked }))} />
            <span><strong>Защитить финансовую подушку</strong>
              <small>Рассчитаем, сколько можно внести сейчас без риска остаться без резерва</small></span>
          </label>
          {form.safeMode && <div className="safe-fields">
            <label>Текущие накопления
              <div className="input-unit"><input className="ym-disable-keys" type="number" min="0" step="1000" value={form.currentSavings}
                onChange={e => updateNumber('currentSavings', e.target.value)} /><span>₽</span></div>
            </label>
            <label>Обязательные расходы в месяц
              <div className="input-unit"><input className="ym-disable-keys" type="number" min="0" step="1000" value={form.monthlyEssentialExpenses}
                onChange={e => updateNumber('monthlyEssentialExpenses', e.target.value)} /><span>₽</span></div>
            </label>
            <label>Размер подушки
              <div className="input-unit"><input className="ym-disable-keys" type="number" min="1" max="24" value={form.reserveMonths}
                onChange={e => updateNumber('reserveMonths', e.target.value)} /><span>мес.</span></div>
            </label>
          </div>}
        </div>

        <button className="wide primary" disabled={loading}>{loading ? 'Сравниваем…' : 'Найти лучший сценарий'}</button>
        {error && <p className="error wide">{error}</p>}
        <small className="autosave wide">Параметры автоматически сохраняются на этом устройстве</small>
      </form>
    </section>

    {result && selected && <section className="results">
      {safePlan && <div className="safe-result">
        <div>
          <span>Безопасный платёж сейчас</span>
          <strong>{money.format(safePlan.recommendedImmediatePayment)}</strong>
          <p>{safePlan.recommendedImmediatePayment > 0
            ? `После платежа останется подушка ${money.format(safePlan.savingsAfterPayment)}.`
            : 'Свободных накоплений сверх выбранной подушки пока нет.'}</p>
        </div>
        <div className="safe-result-metrics">
          <span>Целевая подушка <strong>{money.format(safePlan.requiredReserve)}</strong></span>
          <span>Экономия с безопасным планом <strong>{money.format(safePlan.comparison.interestSavings)}</strong></span>
        </div>
      </div>}
      <div className="recommendation">
        <span>Наша рекомендация</span>
        <h2>Уменьшайте срок кредита</h2>
        <p>Так вы сэкономите максимум — <strong>{money.format(result.reduceTerm.interestSavings)}</strong> —
          и освободитесь от кредита на <strong>{result.reduceTerm.monthsSaved} мес. раньше</strong>.</p>
      </div>

      <div className="strategy-grid">
        <button type="button" className={`strategy-card ${activeStrategy === 'reduceTerm' ? 'active' : ''}`}
          onClick={() => setActiveStrategy('reduceTerm')}>
          <span className="badge">Максимум выгоды</span>
          <small>Уменьшать срок</small>
          <strong>{money.format(result.reduceTerm.interestSavings)}</strong>
          <p>экономия · {result.reduceTerm.optimized.payments.length} мес. до закрытия</p>
        </button>
        <button type="button" className={`strategy-card ${activeStrategy === 'reducePayment' ? 'active' : ''}`}
          onClick={() => setActiveStrategy('reducePayment')}>
          <span className="badge calm">Комфортнее</span>
          <small>Уменьшать платёж</small>
          <strong>{money.format(result.reducePayment.interestSavings)}</strong>
          <p>экономия · платёж постепенно снижается</p>
        </button>
      </div>

      <div className="metrics">
        <article><span>Обычный платёж</span><strong>{money.format(result.baseline.initialMonthlyPayment)}</strong></article>
        <article><span>Проценты без досрочки</span><strong>{money.format(result.baseline.totalInterest)}</strong></article>
        <article><span>Проценты по сценарию</span><strong>{money.format(selected.optimized.totalInterest)}</strong></article>
        <article><span>Срок по сценарию</span><strong>{selected.optimized.payments.length} мес.</strong></article>
      </div>

      <DebtChart analysis={result} />

      <details>
        <summary>Показать график: {activeStrategy === 'reduceTerm' ? 'уменьшение срока' : 'уменьшение платежа'}</summary>
        <div className="table-wrap"><table>
          <thead><tr><th>№</th><th>Дата</th><th>Платёж</th><th>Досрочно</th><th>Проценты</th><th>Остаток</th></tr></thead>
          <tbody>{selected.optimized.payments.map(row =>
            <tr key={row.number}><td>{row.number}</td><td>{new Date(`${row.date}T12:00:00`).toLocaleDateString('ru-RU')}</td>
              <td>{money.format(row.regularPayment)}</td><td>{money.format(row.extraPayment)}</td>
              <td>{money.format(row.interest)}</td><td>{money.format(row.remainingBalance)}</td></tr>)}</tbody>
        </table></div>
      </details>
    </section>}

    <footer>
      <span className="footer-brand">credify/кредифай</span>
      <div className="footer-meta">
        <p>Расчёт ориентировочный и не учитывает правила конкретного банка, комиссии и страховки.</p>
        <a href="/privacy.html">Конфиденциальность</a>
      </div>
    </footer>
    {analyticsConsent === null && <aside className="cookie-banner" aria-label="Настройки аналитики">
      <div>
        <strong>Можно собирать анонимную статистику?</strong>
        <p>Яндекс Метрика использует cookie, чтобы помочь нам улучшать интерфейс.
          Финансовые поля скрыты от записи. <a href="/privacy.html">Подробнее</a></p>
      </div>
      <div className="cookie-actions">
        <button type="button" className="cookie-decline" onClick={() => chooseAnalytics('rejected')}>
          Только необходимые
        </button>
        <button type="button" className="cookie-accept" onClick={() => chooseAnalytics('accepted')}>
          Разрешить аналитику
        </button>
      </div>
    </aside>}
  </main>
}
