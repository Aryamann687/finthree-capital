'use client'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import emailjs from "@emailjs/browser";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Leaf,
  Mail,
  MapPin,
  Menu,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
  Info,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

// Brand chart colors — keep in sync with the navy/gold design tokens used
// elsewhere on the page (tailwind.config primary/accent). Recharts needs
// literal color values, so these mirror --primary and --accent.
const CHART_COLORS = {
  mutualFund: '#C9A227', // gold — accent
  fd: '#0B1F3A', // navy — primary
  ppf: '#1F6E52', // elegant emerald, kept muted and premium
  savings: '#A3A098', // muted, kept intentionally quiet
}

const logo = '/logo.jpeg'

const navItems = ['Home', 'About', 'Services', 'Why Us', 'Contact']

const services = [
  {
    icon: TrendingUp,
    title: 'Systematic Investment Plan',
    short: 'SIP',
    text: 'Build wealth gradually with regular, disciplined investments.',
  },
  {
    icon: ArrowRight,
    title: 'Systematic Transfer Plan',
    short: 'STP',
    text: 'Transfer investments systematically to optimize returns.',
  },
  {
    icon: Wallet,
    title: 'One-time Investment',
    short: 'Lumpsum',
    text: 'Invest a significant amount for potential long-term growth.',
  },
  {
    icon: ArrowRight,
    title: 'Systematic Withdrawal Plan',
    short: 'SWP',
    text: 'Generate regular income from your mutual fund investments.',
  },
]

const reasons = [
  {
    title: "Goal-Based Financial Planning",
    description:
      "Investment strategies tailored for retirement, wealth creation, children's education, and other life goals.",
  },
  {
    title: "SIP & Lumpsum Investment Planning",
    description:
      "Disciplined long-term investing through SIPs and structured deployment of surplus funds.",
  },
  {
    title: "Portfolio Review & Rebalancing",
    description:
      "Regular performance reviews and adjustments to keep your investments aligned with your goals.",
  },
  {
    title: "Retirement & Future Planning",
    description:
      "Building a sustainable financial roadmap for retirement and major future milestones.",
  },
  {
    title: "Risk Profiling & Tax-Efficient Investing",
    description:
      "Recommendations based on your risk appetite while exploring suitable tax-saving mutual fund options.",
  },
  {
    title: "Ongoing Investor Support",
    description:
      "Assistance with SIPs, redemptions, statements, nominations, and continuous investment guidance.",
  },
]
const brandContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.5,
    },
  },
}

const letterAnimation = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
}

const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

/* ============================================================
   Wealth Growth Calculator — helpers
   All figures are illustrative projections, not guarantees.
   ============================================================ */

const CALC_DEFAULTS = {
  monthlyInvestment: 10000,
  expectedReturn: 12, // %, drives the "Mutual Fund" line
  years: 15,
}

const FD_RATE = 6 // %, fixed assumption
const PPF_RATE = 7.1 // %, fixed assumption
const SAVINGS_RATE = 3 // %, fixed assumption

// The comparison charts always project across a fixed horizon (selectable
// via the timeline buttons), independent of the SIP calculator's own period.
const COMPARISON_HORIZONS = [5, 10, 15, 20] as const
const DEFAULT_COMPARISON_YEARS = 20

/** Future value of a monthly SIP compounding at `annualRatePct` for `years`. */
function sipFutureValue(monthlyAmount: number, annualRatePct: number, years: number) {
  const months = Math.round(years * 12)
  const i = annualRatePct / 100 / 12
  if (i === 0) return monthlyAmount * months
  return monthlyAmount * ((Math.pow(1 + i, months) - 1) / i) * (1 + i)
}


/** Future value of a one-time investment compounded annually. */
function lumpsumFutureValue(amount: number, annualRatePct: number, years: number) {
  return amount * Math.pow(1 + annualRatePct / 100, years)
}

/**
 * Step-up SIP projection. The SIP increases at the start of every investment year.
 * Contributions follow the same beginning-of-period convention as the existing SIP formula.
 */
function stepUpSipProjection(initialMonthlyAmount: number, annualStepUpPct: number, annualRatePct: number, years: number) {
  const months = Math.round(years * 12)
  const monthlyRate = annualRatePct / 100 / 12
  let invested = 0
  let totalValue = 0

  for (let month = 0; month < months; month++) {
    const investmentYear = Math.floor(month / 12)
    const contribution = initialMonthlyAmount * Math.pow(1 + annualStepUpPct / 100, investmentYear)
    invested += contribution
    totalValue += contribution * Math.pow(1 + monthlyRate, months - month)
  }

  return { invested, totalValue, estimatedReturns: Math.max(totalValue - invested, 0) }
}

/** Year-by-year projection (year 0..years) for a monthly SIP at a given rate. */
function buildGrowthSeries(monthlyAmount: number, annualRatePct: number, years: number) {
  const series: number[] = []
  for (let y = 0; y <= years; y++) {
    series.push(Math.round(sipFutureValue(monthlyAmount, annualRatePct, y)))
  }
  return series
}

/** Indian digit grouping, e.g. 1234567 -> "12,34,567" */
function formatIndianDigits(value: number) {
  const rounded = Math.round(Math.abs(value))
  const str = rounded.toString()
  if (str.length <= 3) return (value < 0 ? '-' : '') + str
  const last3 = str.slice(-3)
  const rest = str.slice(0, -3)
  const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return (value < 0 ? '-' : '') + groupedRest + ',' + last3
}

/** ₹ formatter. Set `compact` to switch to Cr for values ≥ 1 crore. */
function formatINR(value: number, compact = false) {
  if (compact && Math.abs(value) >= 1e7) {
    return `₹${(value / 1e7).toFixed(2)} Cr`
  }
  return `₹${formatIndianDigits(value)}`
}

function formatYearLabel(year: number) {
  return `Yr ${year}`
}

/* ============================================================
   Ask Finthree — lightweight local FAQ chatbot (no external APIs)
   ============================================================ */

type ChatRole = 'user' | 'bot'
type ChatCta = 'calculator' | 'whatsapp' | null

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  cta?: ChatCta
}

const CHAT_DISCLAIMER =
  "This assistant shares general, educational information only — it can't offer personalized investment advice, fund/stock recommendations, or guaranteed returns. For advice tailored to you, please talk to our team."

const SUGGESTED_QUESTIONS = [
  'What is SIP?',
  'SIP vs Lumpsum?',
  'What is a Step-up SIP?',
  'What is SWP?',
  'How does compounding work?',
  "What's my risk appetite?",
]

const FAQ_TOPICS: { keywords: string[]; answer: string; cta?: ChatCta }[] = [
  {
    keywords: ['step up', 'step-up', 'stepup', 'top up sip', 'top-up sip'],
    answer:
      "A Step-up SIP automatically increases your monthly investment by a fixed percentage every year, helping your contributions keep pace with rising income and inflation over time.",
    cta: 'calculator',
  },
  {
    keywords: ['sip vs lumpsum', 'sip or lumpsum', 'lumpsum vs sip', 'sip versus lumpsum'],
    answer:
      "SIPs spread your investment over time, which can smooth out market ups and downs through rupee-cost averaging. Lumpsum investing puts your full amount to work immediately, which suits investors with surplus funds who are comfortable with short-term volatility. Many investors use a mix of both, depending on their cash flow and goals.",
    cta: 'calculator',
  },
  {
    keywords: ['swp', 'systematic withdrawal'],
    answer:
      "A Systematic Withdrawal Plan (SWP) lets you withdraw a fixed amount from your mutual fund investment at regular intervals — useful for generating a steady income stream, such as during retirement.",
  },
  {
    keywords: ['goal sip', 'goal based', 'goal-based', 'financial goal'],
    answer:
      "A goal-based SIP is simply an SIP planned around a specific target — like a child's education, a home down payment, or retirement — so the monthly amount and duration are chosen to work toward that goal.",
    cta: 'calculator',
  },
  {
    keywords: ['inflation'],
    answer:
      "Inflation is the gradual rise in prices over time, which reduces the purchasing power of money. Investments that aim to grow faster than inflation can help preserve and grow your real wealth over the long term.",
  },
  {
    keywords: ['compound', 'compounding'],
    answer:
      "Compounding happens when your investment returns start generating their own returns, so your money can grow faster the longer it stays invested. This is why starting early and staying invested for the long term matters.",
    cta: 'calculator',
  },
  {
    keywords: ['diversif'],
    answer:
      "Diversification means spreading your investments across different asset classes, sectors, or funds so the impact of any single investment performing poorly is reduced.",
  },
  {
    keywords: ['index fund'],
    answer:
      "An index fund aims to mirror the performance of a market index, such as the Nifty 50, by holding similar stocks in similar proportions — typically at a lower cost than actively managed funds.",
  },
  {
    keywords: ['equity', 'debt fund', 'equity vs debt', 'equity and debt'],
    answer:
      "Equity funds invest mainly in stocks and tend to offer higher growth potential with higher volatility. Debt funds invest in fixed-income instruments and generally aim for more stability with comparatively lower, steadier returns.",
  },
  {
    keywords: ['risk appetite', 'risk profile', 'how much risk'],
    answer:
      "Risk appetite is how much market fluctuation you're comfortable with while pursuing returns. It depends on your investment horizon, financial goals, and personal comfort with volatility. It's worth having a proper conversation with our team to assess yours.",
    cta: 'whatsapp',
  },
  {
    keywords: ['lumpsum', 'lump sum'],
    answer:
      "A lumpsum investment means putting in a large amount in one go rather than in installments. It can suit investors who have surplus funds and are comfortable with the full amount being exposed to market movements from day one.",
    cta: 'calculator',
  },
  {
    keywords: ['sip', 'systematic investment'],
    answer:
      "A Systematic Investment Plan (SIP) lets you invest a fixed amount regularly — usually monthly — into a mutual fund. It encourages disciplined investing and can help average out purchase cost over time.",
    cta: 'calculator',
  },
  {
    keywords: ['mutual fund'],
    answer:
      "A mutual fund pools money from many investors and is professionally managed to invest in a mix of stocks, bonds, or other securities, based on the fund's stated objective.",
  },
]

function matchFaqAnswer(rawQuery: string): { answer: string; cta?: ChatCta } {
  const query = rawQuery.toLowerCase()
  for (const topic of FAQ_TOPICS) {
    if (topic.keywords.some((keyword) => query.includes(keyword))) {
      return { answer: topic.answer, cta: topic.cta ?? null }
    }
  }
  return {
    answer:
      "I don't have a specific answer for that yet, but I'd love to help. Try asking about SIP, Lumpsum, Step-up SIP, SWP, compounding, diversification or risk appetite — or reach our team directly for anything more specific to your situation.",
    cta: 'whatsapp',
  }
}

export function FinthreeSite() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  // ---- Financial Calculator Hub state ----
  // One numeric source of truth per control keeps each slider and input synchronized.
  const [activeCalculator, setActiveCalculator] = useState<'sip' | 'lumpsum' | 'stepup'>('sip')
  const [monthlyInvestment, setMonthlyInvestment] = useState(CALC_DEFAULTS.monthlyInvestment)
  const [expectedReturn, setExpectedReturn] = useState(CALC_DEFAULTS.expectedReturn)
  const [years, setYears] = useState(CALC_DEFAULTS.years)
  const [lumpsumInvestment, setLumpsumInvestment] = useState(500000)
  const [lumpsumReturn, setLumpsumReturn] = useState(CALC_DEFAULTS.expectedReturn)
  const [lumpsumYears, setLumpsumYears] = useState(CALC_DEFAULTS.years)
  const [stepUpMonthlyInvestment, setStepUpMonthlyInvestment] = useState(CALC_DEFAULTS.monthlyInvestment)
  const [stepUpRate, setStepUpRate] = useState(10)
  const [stepUpReturn, setStepUpReturn] = useState(CALC_DEFAULTS.expectedReturn)
  const [stepUpYears, setStepUpYears] = useState(CALC_DEFAULTS.years)
  const [compareTab, setCompareTab] = useState<'mf' | 'fd' | 'ppf' | 'savings'>('mf')
  // Comparison charts always project across a fixed horizon, selectable via
  // the timeline buttons — independent of the calculator's own period above.
  const [comparisonYears, setComparisonYears] = useState<number>(DEFAULT_COMPARISON_YEARS)
  // ---- Ethical Investing Focus modal state ----
  const [ethicalModalOpen, setEthicalModalOpen] = useState(false)

  // Keep the primary calculator controls and summary immediate while allowing
  // heavier comparison charts lower on the page to update at a lower priority.
  const deferredMonthlyInvestment = useDeferredValue(monthlyInvestment)
  const deferredExpectedReturn = useDeferredValue(expectedReturn)

  const [formData, setFormData] = useState({
  name: "", email: "", phone: "", message: "",
});
const [sending, setSending] = useState(false)

const handleFormFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target
  setFormData((prev) => ({ ...prev, [name]: value }))
}

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  setSending(true)
  try {
    await emailjs.send(process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID as string, process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID as string, {
      from_name: formData.name, from_email: formData.email, phone: formData.phone, message: formData.message,
    }, process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY as string)
    setSubmitted(true)
    setFormData({ name: '', email: '', phone: '', message: '' })
  } catch (error) {
    console.error('EmailJS send failed:', error)
    alert('Sorry, something went wrong while sending your message. Please try again or contact us directly.')
  } finally { setSending(false) }
}

  const clampMonthlyInvestment = (value: number) => Math.min(100000, Math.max(500, Math.round(value / 500) * 500))
  const clampExpectedReturn = (value: number) => Math.min(30, Math.max(1, Math.round(value * 10) / 10))
  const clampYears = (value: number) => Math.min(40, Math.max(1, Math.round(value)))
  const clampLumpsumInvestment = (value: number) => Math.min(10000000, Math.max(10000, Math.round(value / 10000) * 10000))
  const clampStepUpRate = (value: number) => Math.min(30, Math.max(0, Math.round(value * 10) / 10))

  const totalInvested = useMemo(
    () => monthlyInvestment * years * 12,
    [monthlyInvestment, years],
  )
  const futureValueMF = useMemo(
    () => sipFutureValue(monthlyInvestment, expectedReturn, years),
    [monthlyInvestment, expectedReturn, years],
  )
  const estimatedReturns = useMemo(
    () => Math.max(futureValueMF - totalInvested, 0),
    [futureValueMF, totalInvested],
  )
  const yearlyProjection = useMemo(
    () => Array.from({ length: years }, (_, index) => {
      const year = index + 1
      const invested = monthlyInvestment * year * 12
      const totalValue = sipFutureValue(monthlyInvestment, expectedReturn, year)
      return { year, invested, estimatedReturns: Math.max(totalValue - invested, 0), totalValue }
    }),
    [monthlyInvestment, expectedReturn, years],
  )
  const lumpsumFutureValueTotal = useMemo(
    () => lumpsumFutureValue(lumpsumInvestment, lumpsumReturn, lumpsumYears),
    [lumpsumInvestment, lumpsumReturn, lumpsumYears],
  )
  const lumpsumEstimatedReturns = useMemo(
    () => Math.max(lumpsumFutureValueTotal - lumpsumInvestment, 0),
    [lumpsumFutureValueTotal, lumpsumInvestment],
  )
  const lumpsumProjection = useMemo(
    () => Array.from({ length: lumpsumYears }, (_, index) => {
      const year = index + 1
      const totalValue = lumpsumFutureValue(lumpsumInvestment, lumpsumReturn, year)
      return { year, invested: lumpsumInvestment, estimatedReturns: Math.max(totalValue - lumpsumInvestment, 0), totalValue }
    }),
    [lumpsumInvestment, lumpsumReturn, lumpsumYears],
  )
  const stepUpProjectionFinal = useMemo(
    () => stepUpSipProjection(stepUpMonthlyInvestment, stepUpRate, stepUpReturn, stepUpYears),
    [stepUpMonthlyInvestment, stepUpRate, stepUpReturn, stepUpYears],
  )
  const stepUpYearlyProjection = useMemo(
    () => Array.from({ length: stepUpYears }, (_, index) => {
      const year = index + 1
      const projection = stepUpSipProjection(stepUpMonthlyInvestment, stepUpRate, stepUpReturn, year)
      return { year, ...projection }
    }),
    [stepUpMonthlyInvestment, stepUpRate, stepUpReturn, stepUpYears],
  )

  // Savings figure at the calculator's own period — feeds the top insight
  // sentence only; the comparison charts below use the fixed horizon instead.
  const futureValueSavings = useMemo(
    () => sipFutureValue(monthlyInvestment, SAVINGS_RATE, years),
    [monthlyInvestment, years],
  )

  // ---- Fixed-horizon comparison figures (drive charts, tabs & highlight card) ----
  const compFutureValueMF = useMemo(
    () => sipFutureValue(deferredMonthlyInvestment, deferredExpectedReturn, comparisonYears),
    [deferredMonthlyInvestment, deferredExpectedReturn, comparisonYears],
  )
  const compFutureValueFD = useMemo(
    () => sipFutureValue(deferredMonthlyInvestment, FD_RATE, comparisonYears),
    [deferredMonthlyInvestment, comparisonYears],
  )
  const compFutureValuePPF = useMemo(
    () => sipFutureValue(deferredMonthlyInvestment, PPF_RATE, comparisonYears),
    [deferredMonthlyInvestment, comparisonYears],
  )
  const compFutureValueSavings = useMemo(
    () => sipFutureValue(deferredMonthlyInvestment, SAVINGS_RATE, comparisonYears),
    [deferredMonthlyInvestment, comparisonYears],
  )

  const growthSeries = useMemo(() => {
    const mf = buildGrowthSeries(deferredMonthlyInvestment, deferredExpectedReturn, comparisonYears)
    const fd = buildGrowthSeries(deferredMonthlyInvestment, FD_RATE, comparisonYears)
    const ppf = buildGrowthSeries(deferredMonthlyInvestment, PPF_RATE, comparisonYears)
    const savings = buildGrowthSeries(deferredMonthlyInvestment, SAVINGS_RATE, comparisonYears)
    // Sample at most ~12 points so the chart stays crisp on long horizons
    const step = Math.max(1, Math.ceil(comparisonYears / 12))
    const points: { year: number; mf: number; fd: number; ppf: number; savings: number }[] = []
    for (let y = 0; y <= comparisonYears; y += step) {
      points.push({ year: y, mf: mf[y], fd: fd[y], ppf: ppf[y], savings: savings[y] })
    }
    if (points[points.length - 1]?.year !== comparisonYears) {
      points.push({
        year: comparisonYears,
        mf: mf[comparisonYears],
        fd: fd[comparisonYears],
        ppf: ppf[comparisonYears],
        savings: savings[comparisonYears],
      })
    }
    return points
  }, [deferredMonthlyInvestment, deferredExpectedReturn, comparisonYears])

  const comparisonBars = useMemo(
    () => [
      { key: 'mf', label: 'Mutual Fund', rate: deferredExpectedReturn, value: compFutureValueMF, color: CHART_COLORS.mutualFund },
      { key: 'fd', label: 'Fixed Deposit', rate: FD_RATE, value: compFutureValueFD, color: CHART_COLORS.fd },
      { key: 'ppf', label: 'PPF', rate: PPF_RATE, value: compFutureValuePPF, color: CHART_COLORS.ppf },
      { key: 'savings', label: 'Savings', rate: SAVINGS_RATE, value: compFutureValueSavings, color: CHART_COLORS.savings },
    ],
    [deferredExpectedReturn, compFutureValueMF, compFutureValueFD, compFutureValuePPF, compFutureValueSavings],
  )

  const activeComparison = comparisonBars.find((b) => b.key === compareTab) ?? comparisonBars[0]

  const gapVsSavings = Math.max(futureValueMF - futureValueSavings, 0)
  const compGapVsSavings = Math.max(compFutureValueMF - compFutureValueSavings, 0)
  const insightMessage = useMemo(
    () =>
      `Investing ${formatINR(monthlyInvestment)} every month for ${years} year${
        years === 1 ? '' : 's'
      } at an assumed ${expectedReturn}% annual return could grow to roughly ${formatINR(
        futureValueMF,
        true,
      )} — about ${formatINR(gapVsSavings, true)} more than keeping the same money in a regular savings account.`,
    [monthlyInvestment, years, expectedReturn, futureValueMF, gapVsSavings],
  )


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the Ethical Investing modal on Escape.
  useEffect(() => {
    if (!ethicalModalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEthicalModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [ethicalModalOpen])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    
    <div className="min-h-screen bg-background font-body text-foreground antialiased">
      {/* Fonts: Fraunces for display headings, Inter for body/UI copy.
          Move this import into your root layout <head> in production. */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,550;9..144,650&family=Inter:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }

        /* Wealth calculator slider — visible gold progress track + navy/cream remainder */
        .ft-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 10px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
          background-color: #E5E1D8;
        }
        .ft-range::-webkit-slider-runnable-track { height: 10px; border-radius: 9999px; background: transparent; }
        .ft-range::-moz-range-track { height: 10px; border: none; border-radius: 9999px; background: transparent; }
        .ft-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: #C9A227;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 6px rgba(11, 31, 58, 0.3), 0 0 0 1px rgba(201,162,39,0.25), 0 0 0 8px rgba(201,162,39,0.12);
          margin-top: -7px;
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease;
        }
        .ft-range::-webkit-slider-thumb:hover { transform: scale(1.15); box-shadow: 0 2px 8px rgba(11, 31, 58, 0.32), 0 0 0 1px rgba(201,162,39,0.3), 0 0 0 10px rgba(201,162,39,0.16); }
        .ft-range::-webkit-slider-thumb:active { transform: scale(1.05); }
        .ft-range::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: #C9A227;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 6px rgba(11, 31, 58, 0.3), 0 0 0 1px rgba(201,162,39,0.25), 0 0 0 8px rgba(201,162,39,0.12);
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease;
        }
        .ft-range::-moz-range-thumb:hover { transform: scale(1.15); }
        .ft-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgba(201,162,39,0.3), 0 0 0 10px rgba(201,162,39,0.14); }
        .ft-range:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 4px rgba(201,162,39,0.3), 0 0 0 10px rgba(201,162,39,0.14); }

        /* Premium number inputs (monthly SIP / investment period) */
        .ft-input-shell {
          transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .ft-input-shell:focus-within {
          border-color: #C9A227;
          box-shadow: 0 0 0 4px rgba(201,162,39,0.16), 0 4px 14px rgba(11,31,58,0.08);
        }

        /* Timeline segmented buttons */
        .ft-timeline-btn { transition: color 0.25s ease; }
      `}</style>

      {/* ---------------- Header ---------------- */}
<header
  className={`sticky top-0 z-50 border-b transition-all duration-300 ${
    scrolled
      ? 'border-black/5 bg-[#F1F1ED]/95 shadow-sm backdrop-blur-xl'
      : 'border-transparent bg-[#F1F1ED]/80 backdrop-blur-md'
  }`}
>
  <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
    <button
      aria-label="Finthree Capital home"
      onClick={() => scrollTo('home')}
      className="flex items-center gap-3 transition-opacity hover:opacity-90"
    >
      <img
        src={logo}
        alt="Finthree Capital logo"
        className="size-14 rounded-full object-cover ring-1 ring-primary/10"
      />
      <div className="hidden text-left sm:block">
        <p className="font-display text-lg font-semibold leading-none tracking-tight text-primary">
          Finthree Capital
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Private Limited
        </p>
      </div>
    </button>

    <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
      {navItems.map((item) => (
        <NavLink
          key={item}
          label={item}
          onClick={() => scrollTo(item === 'Why Us' ? 'why-us' : item.toLowerCase())}
        />
      ))}
    </nav>

    <button
      onClick={() => scrollTo('contact')}
      className="hidden rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-sm shadow-accent/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30 md:block"
    >
      Contact Us
    </button>

    <button
      className="rounded-md p-2 text-primary md:hidden"
      aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen(!menuOpen)}
    >
      {menuOpen ? <X /> : <Menu />}
    </button>
  </div>

  {menuOpen && (
    <nav className="flex flex-col gap-4 border-t border-black/5 bg-[#F8F8F6] px-5 py-6 md:hidden">
      {navItems.map((item) => (
        <button
          key={item}
          onClick={() => scrollTo(item === 'Why Us' ? 'why-us' : item.toLowerCase())}
          className="text-left font-semibold text-primary"
        >
          {item}
        </button>
      ))}
      <button
        onClick={() => scrollTo('contact')}
        className="rounded-full bg-accent px-5 py-3 font-bold text-accent-foreground"
      >
        Contact Us
      </button>
    </nav>
  )}
</header>
    <main>
        {/* ---------------- Hero ---------------- */}
        <section
          id="home"
          className="relative overflow-hidden bg-gradient-to-b from-white via-white to-accent/[0.06]"
        >
          {/* Animated Hero background */}
<div
  aria-hidden
  className="pointer-events-none absolute inset-0 overflow-hidden"
>
  {/* Animated navy glow */}
  <motion.div
    className="absolute -left-40 top-[10%] size-[560px] rounded-full bg-primary/[0.16] blur-[100px]"
    animate={{
      x: [0, 80, 20, 0],
      y: [0, 40, -20, 0],
      scale: [1, 1.12, 0.96, 1],
    }}
    transition={{
      duration: 14,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />

  {/* Animated gold glow */}
  <motion.div
    className="absolute -right-32 -top-28 size-[620px] rounded-full bg-accent/[0.28] blur-[110px]"
    animate={{
      x: [0, -70, -20, 0],
      y: [0, 50, 20, 0],
      scale: [1, 1.15, 1.05, 1],
    }}
    transition={{
      duration: 16,
      repeat: Infinity,
      ease: "easeInOut",
      delay: 1,
    }}
  />

  {/* Animated gold glow at bottom */}
  <motion.div
    className="absolute -bottom-40 left-1/2 h-[380px] w-[850px] -translate-x-1/2 rounded-full bg-accent/[0.18] blur-[100px]"
    animate={{
      scale: [1, 1.12, 1],
      opacity: [0.55, 1, 0.55],
      x: ["-50%", "-46%", "-50%"],
    }}
    transition={{
      duration: 12,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />

  {/* Animated gold grid */}
  <motion.div
    className="absolute right-0 top-0 h-[65%] w-[48%]"
    style={{
      backgroundImage: `
        linear-gradient(rgba(201,162,39,0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(201,162,39,0.5) 1px, transparent 1px)
      `,
      backgroundSize: "24px 24px",
      maskImage:
        "radial-gradient(ellipse at top right, black 10%, transparent 72%)",
      WebkitMaskImage:
        "radial-gradient(ellipse at top right, black 10%, transparent 72%)",
    }}
    animate={{
      opacity: [0.22, 0.42, 0.3, 0.22],
      x: [0, -12, 0],
      y: [0, 8, 0],
    }}
    transition={{
      duration: 12,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />

  {/* Animated navy grid */}
  <motion.div
    className="absolute bottom-0 left-0 h-[45%] w-[35%]"
    style={{
      backgroundImage: `
        linear-gradient(rgba(11,31,58,0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(11,31,58,0.5) 1px, transparent 1px)
      `,
      backgroundSize: "28px 28px",
      maskImage:
        "radial-gradient(ellipse at bottom left, black 5%, transparent 70%)",
      WebkitMaskImage:
        "radial-gradient(ellipse at bottom left, black 5%, transparent 70%)",
    }}
    animate={{
      opacity: [0.1, 0.28, 0.18, 0.1],
      x: [0, 10, 0],
    }}
    transition={{
      duration: 15,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />

  {/* Animated gold dots */}
  <motion.div
    className="absolute left-0 top-12 h-72 w-56"
    style={{
      backgroundImage:
        "radial-gradient(circle, #C9A227 1.8px, transparent 1.8px)",
      backgroundSize: "30px 30px",
      maskImage:
        "linear-gradient(to right, black 10%, transparent 85%)",
      WebkitMaskImage:
        "linear-gradient(to right, black 10%, transparent 85%)",
    }}
    animate={{
      opacity: [0.25, 0.7, 0.4, 0.25],
      y: [0, 12, 0],
    }}
    transition={{
      duration: 10,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />

  {/* Animated navy dots */}
  <motion.div
    className="absolute bottom-20 right-0 h-56 w-64"
    style={{
      backgroundImage:
        "radial-gradient(circle, #0B1F3A 1.8px, transparent 1.8px)",
      backgroundSize: "30px 30px",
      maskImage:
        "linear-gradient(to left, black 10%, transparent 85%)",
      WebkitMaskImage:
        "linear-gradient(to left, black 10%, transparent 85%)",
    }}
    animate={{
      opacity: [0.18, 0.58, 0.3, 0.18],
      y: [0, -10, 0],
    }}
    transition={{
      duration: 11,
      repeat: Infinity,
      ease: "easeInOut",
      delay: 2,
    }}
  />

  {/* Animated upward financial growth line */}
  <motion.svg
    className="absolute right-0 top-[8%] h-[62%] w-[52%]"
    viewBox="0 0 700 500"
    preserveAspectRatio="none"
    animate={{ opacity: [0.25, 0.7, 0.45, 0.25] }}
    transition={{
      duration: 10,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <motion.path
      d="M0 420
         C90 400, 120 370, 185 350
         S285 290, 350 250
         S450 210, 500 130
         S600 55, 700 20"
      fill="none"
      stroke="#C9A227"
      strokeWidth="2.5"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{
        pathLength: [0, 1, 1],
        opacity: [0, 1, 0.7],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        repeatDelay: 4,
        ease: "easeInOut",
      }}
    />

    <motion.circle
      cx="185"
      cy="350"
      r="6"
      fill="#C9A227"
      animate={{
        scale: [0.8, 1.4, 0.8],
        opacity: [0.4, 1, 0.4],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />

    <motion.circle
      cx="350"
      cy="250"
      r="7"
      fill="#C9A227"
      animate={{
        scale: [0.8, 1.4, 0.8],
        opacity: [0.4, 1, 0.4],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.8,
      }}
    />

    <motion.circle
      cx="500"
      cy="130"
      r="8"
      fill="#C9A227"
      animate={{
        scale: [0.8, 1.4, 0.8],
        opacity: [0.4, 1, 0.4],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 1.6,
      }}
    />
  </motion.svg>

  {/* Animated flowing lines at bottom */}
  <motion.svg
    className="absolute bottom-0 left-0 h-[48%] w-full"
    viewBox="0 0 1440 400"
    preserveAspectRatio="none"
    animate={{ y: [0, -8, 0] }}
    transition={{
      duration: 9,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    {[0, 22, 44, 66, 88, 110].map((offset, index) => (
      <motion.path
        key={offset}
        d={`M0 ${290 + offset}
          C160 ${370 + offset}, 270 ${120 + offset}, 440 ${245 + offset}
          S690 ${380 + offset}, 850 ${210 + offset}
          S1120 ${390 + offset}, 1440 ${230 + offset}`}
        fill="none"
        stroke={offset % 44 === 0 ? "#0B1F3A" : "#C9A227"}
        strokeWidth="1.4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: [0, 1],
          opacity: [0, 0.42],
        }}
        transition={{
          duration: 4 + index * 0.5,
          delay: index * 0.2,
          ease: "easeOut",
        }}
      />
    ))}
  </motion.svg>
</div>
          {/* signature element: a faint hand-drawn growth curve */}
          <svg
            aria-hidden
            viewBox="0 0 900 300"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-48 w-full text-primary opacity-[0.07] lg:block"
          >
            <motion.path
              d="M0,270 C130,235 190,110 300,130 C410,150 450,30 590,55 C700,75 740,15 900,0"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.4, delay: 0.5, ease: 'easeInOut' }}
            />
          </svg>

          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 pb-24 pt-20 text-center lg:px-8 lg:pb-32 lg:pt-28">
            <motion.img
              src={logo}
              alt="Finthree Capital logo"
              className="mb-8 size-24 rounded-full object-cover shadow-lg shadow-primary/10 ring-4 ring-white lg:size-28"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />

            <motion.div
              variants={brandContainer}
              initial="hidden"
              animate="show"
              className="flex flex-wrap justify-center font-display text-4xl font-semibold leading-[1.05] tracking-tight text-primary sm:text-6xl lg:text-7xl"
            >
              {'Finthree Capital'.split('').map((letter, index) => (
                <motion.span key={index} variants={letterAnimation}>
                  {letter === ' ' ? '\u00A0' : letter}
                </motion.span>
              ))}
            </motion.div>

            <motion.p
              className="mt-3 text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.9, duration: 0.6 }}
            >
              Private Limited
              <br></br>
              <ShieldCheck className="size-5 text-accent" />
              AMFI-registered mutual fund distributor
            </motion.p>
             

            <motion.div
              className="font-display mt-8 max-w-2xl text-2xl italic leading-snug text-primary sm:text-3xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.15, duration: 0.7 }}
            >
      <p className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
  Your money needs a <span className="text-accent not-italic">plan</span> not just a product.
</p>
             
            </motion.div>

            <motion.p
              className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.45, duration: 0.7 }}
            >
              Helping individuals and families invest wisely through SIP, STP, Lumpsum and
              SWP solutions tailored to their financial goals.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.75, duration: 0.6 }}
            >
              <button
                onClick={() => scrollTo('contact')}
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 font-bold text-accent-foreground shadow-md shadow-accent/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/30"
              >
                Contact Us
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => scrollTo('services')}
                className="rounded-full border border-primary/15 px-8 py-4 font-bold text-primary transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:text-accent"
              >
                Explore Services
              </button>
            </motion.div>
          </div>
        </section>

        {/* ---------------- About ---------------- */}
        <section id="about" className="bg-secondary/40 px-5 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              className="mx-auto max-w-3xl text-center"
            >
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-accent">
                Built around you
              </p>
              <h2 className="font-display mt-5 text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
                A clear path to financial growth.
              </h2>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                An AMFI-registered mutual fund distributor helping individuals achieve
                financial growth through disciplined investing. We believe in building
                long-term wealth through informed decisions and personalized strategies.
              </p>
            </motion.div>

            <motion.div
              variants={staggerParent}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="mt-16 grid gap-6 md:grid-cols-3"
            >
              <Feature
                icon={ShieldCheck}
                title="Trust"
                text="AMFI-registered and compliant with regulatory standards."
              />
              <Feature
                icon={Sparkles}
                title="Transparency"
                text="Clear insights into your investments and performance."
              />
              <Feature
                icon={Target}
                title="Tailored Solutions"
                text="Customized strategies aligned with your financial goals."
              />
            </motion.div>
          </div>
        </section>

        {/* ---------------- Services ---------------- */}
        <section id="services" className="mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"
          >
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-accent">
                Our expertise
              </p>
              <h2 className="font-display mt-4 text-4xl font-semibold text-primary sm:text-5xl">
                Investment solutions
                <br className="hidden sm:block" /> that fit your goals.
              </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-muted-foreground">
              Choose the investment strategy that aligns with your financial objectives and
              current stage of life.
            </p>
          </motion.div>
          <motion.div
  variants={fadeUp}
  initial="hidden"
  whileInView="show"
  viewport={{ once: true, amount: 0.2 }}
  role="button"
  tabIndex={0}
  aria-haspopup="dialog"
  onClick={() => setEthicalModalOpen(true)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setEthicalModalOpen(true)
    }
  }}
  className="mt-10 cursor-pointer rounded-2xl border border-accent/30 bg-accent/10 p-5 outline-none transition-all duration-300 hover:border-accent/50 hover:bg-accent/[0.14] hover:shadow-md hover:shadow-accent/10 focus-visible:ring-2 focus-visible:ring-accent/40 active:scale-[0.995]"
>
  <div className="inline-flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3">
  <Leaf className="size-6 text-green-600" />
  <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
    Ethical Investing Focus
  </p>
</div>

  <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
    We help clients explore ESG and ethical mutual fund opportunities that
    align with their values while pursuing long-term wealth creation.
  </p>
</motion.div> 

          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {services.map(({ icon: Icon, title, short, text }) => (
              <motion.article
                key={short}
                variants={fadeUp}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-2xl hover:shadow-primary/[0.08]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.05] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent transition-transform duration-500 group-hover:scale-110">
                  <Icon className="size-6" />
                </div>
                <p className="relative mt-7 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  {short}
                </p>
                <h3 className="relative mt-2 text-xl font-bold text-primary">{title}</h3>
                <p className="relative mt-4 leading-7 text-muted-foreground">{text}</p>
                <button
                  onClick={() => scrollTo('contact')}
                  className="relative mt-auto inline-flex items-center gap-2 pt-7 text-sm font-bold text-primary transition-colors group-hover:text-accent"
                >
                  Learn more
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </motion.article>
            ))}
          </motion.div>
        </section>

        {/* ---------------- Financial Calculator Hub ---------------- */}
        <section id="calculator" className="relative overflow-hidden bg-secondary/40 px-5 py-24 lg:px-8 lg:py-32">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 left-1/4 size-[360px] rounded-full bg-accent/[0.06] blur-3xl" />
            <div className="absolute bottom-0 right-0 size-[320px] rounded-full bg-primary/[0.04] blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-accent">Plan with clarity</p>
              <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight text-primary sm:text-5xl">Financial Calculators</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">Explore SIP, one-time investment and step-up SIP projections with interactive estimates.</p>
            </motion.div>

            <div role="tablist" aria-label="Financial calculator selector" className="mt-10 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:mx-auto sm:max-w-xl">
              {[
                ['sip', 'SIP'],
                ['lumpsum', 'Lumpsum'],
                ['stepup', 'Step-up SIP'],
              ].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={activeCalculator === key} onClick={() => setActiveCalculator(key as 'sip' | 'lumpsum' | 'stepup')} className={`min-w-0 rounded-xl px-2 py-3 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${activeCalculator === key ? 'bg-accent text-accent-foreground shadow-sm' : 'text-primary/70 hover:bg-secondary hover:text-primary'}`}>
                  <span className="block truncate">{label}</span>
                </button>
              ))}
            </div>

            {activeCalculator === 'sip' && (
              <>
                <motion.div key="sip" variants={fadeUp} initial="hidden" animate="show" className="mt-8 grid min-w-0 gap-8 rounded-[2rem] border border-border bg-card p-5 shadow-xl shadow-primary/[0.06] sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:p-10">
                  <div className="flex min-w-0 flex-col justify-center gap-8">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent"><Sparkles className="size-3.5" />Illustrative Estimate</div>
                    <CalculatorControl id="monthly-sip" label="Monthly SIP" minLabel="₹500" maxLabel="₹1,00,000" min={500} max={100000} step={500} value={monthlyInvestment} onChange={(value) => setMonthlyInvestment(clampMonthlyInvestment(value))} prefix="₹" inputMode="numeric" />
                    <CalculatorControl id="expected-return" label="Expected Annual Return" minLabel="1%" maxLabel="30%" min={1} max={30} step={0.1} value={expectedReturn} onChange={(value) => setExpectedReturn(clampExpectedReturn(value))} suffix="%" inputMode="decimal" />
                    <CalculatorControl id="investment-period" label="Investment Period" minLabel="1 year" maxLabel="40 years" min={1} max={40} step={1} value={years} onChange={(value) => setYears(clampYears(value))} suffix="Years" inputMode="numeric" />
                  </div>
                  <ProjectionSummary title={`Your projection over ${years} ${years === 1 ? 'year' : 'years'}`} invested={totalInvested} returns={estimatedReturns} total={futureValueMF} footer={`Based on ${formatINR(monthlyInvestment)}/month at an assumed ${expectedReturn}% annual return.`} />
                </motion.div>
                <ProjectionChart title="SIP growth projection" data={yearlyProjection.map((row) => ({ year: row.year, value: row.totalValue }))} />
                <ProjectionBreakdown title="View your SIP projection, year by year" rows={yearlyProjection} />
              </>
            )}

            {activeCalculator === 'lumpsum' && (
              <>
                <motion.div key="lumpsum" variants={fadeUp} initial="hidden" animate="show" className="mt-8 grid min-w-0 gap-8 rounded-[2rem] border border-border bg-card p-5 shadow-xl shadow-primary/[0.06] sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:p-10">
                  <div className="flex min-w-0 flex-col justify-center gap-8">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent"><Sparkles className="size-3.5" />Illustrative Estimate</div>
                    <CalculatorControl id="lumpsum-investment" label="Investment Amount" minLabel="₹10,000" maxLabel="₹1 Cr" min={10000} max={10000000} step={10000} value={lumpsumInvestment} onChange={(value) => setLumpsumInvestment(clampLumpsumInvestment(value))} prefix="₹" inputMode="numeric" />
                    <CalculatorControl id="lumpsum-return" label="Expected Annual Return" minLabel="1%" maxLabel="30%" min={1} max={30} step={0.1} value={lumpsumReturn} onChange={(value) => setLumpsumReturn(clampExpectedReturn(value))} suffix="%" inputMode="decimal" />
                    <CalculatorControl id="lumpsum-period" label="Investment Period" minLabel="1 year" maxLabel="40 years" min={1} max={40} step={1} value={lumpsumYears} onChange={(value) => setLumpsumYears(clampYears(value))} suffix="Years" inputMode="numeric" />
                  </div>
                  <ProjectionSummary title={`Your projection over ${lumpsumYears} ${lumpsumYears === 1 ? 'year' : 'years'}`} invested={lumpsumInvestment} returns={lumpsumEstimatedReturns} total={lumpsumFutureValueTotal} footer={`Based on a one-time investment of ${formatINR(lumpsumInvestment)} at an assumed ${lumpsumReturn}% annual return.`} />
                </motion.div>
                <ProjectionChart title="Lumpsum growth projection" data={lumpsumProjection.map((row) => ({ year: row.year, value: row.totalValue }))} />
                <ProjectionBreakdown title="View your Lumpsum projection, year by year" rows={lumpsumProjection} />
              </>
            )}

            {activeCalculator === 'stepup' && (
              <>
                <motion.div key="stepup" variants={fadeUp} initial="hidden" animate="show" className="mt-8 grid min-w-0 gap-8 rounded-[2rem] border border-border bg-card p-5 shadow-xl shadow-primary/[0.06] sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:p-10">
                  <div className="flex min-w-0 flex-col justify-center gap-8">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent"><Sparkles className="size-3.5" />Illustrative Estimate</div>
                    <CalculatorControl id="stepup-sip" label="Initial Monthly SIP" minLabel="₹500" maxLabel="₹1,00,000" min={500} max={100000} step={500} value={stepUpMonthlyInvestment} onChange={(value) => setStepUpMonthlyInvestment(clampMonthlyInvestment(value))} prefix="₹" inputMode="numeric" />
                    <CalculatorControl id="stepup-rate" label="Annual SIP Increase" minLabel="0%" maxLabel="30%" min={0} max={30} step={0.1} value={stepUpRate} onChange={(value) => setStepUpRate(clampStepUpRate(value))} suffix="%" inputMode="decimal" />
                    <CalculatorControl id="stepup-return" label="Expected Annual Return" minLabel="1%" maxLabel="30%" min={1} max={30} step={0.1} value={stepUpReturn} onChange={(value) => setStepUpReturn(clampExpectedReturn(value))} suffix="%" inputMode="decimal" />
                    <CalculatorControl id="stepup-period" label="Investment Period" minLabel="1 year" maxLabel="40 years" min={1} max={40} step={1} value={stepUpYears} onChange={(value) => setStepUpYears(clampYears(value))} suffix="Years" inputMode="numeric" />
                  </div>
                  <ProjectionSummary title={`Your projection over ${stepUpYears} ${stepUpYears === 1 ? 'year' : 'years'}`} invested={stepUpProjectionFinal.invested} returns={stepUpProjectionFinal.estimatedReturns} total={stepUpProjectionFinal.totalValue} footer={`Starts at ${formatINR(stepUpMonthlyInvestment)}/month, increases ${stepUpRate}% each year, with an assumed ${stepUpReturn}% annual return.`} totalLabel="Final Corpus" />
                </motion.div>
                <ProjectionChart title="Step-up SIP growth projection" data={stepUpYearlyProjection.map((row) => ({ year: row.year, value: row.totalValue }))} />
                <ProjectionBreakdown title="View your Step-up SIP projection, year by year" rows={stepUpYearlyProjection} />
              </>
            )}

            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Illustrative calculations only. Actual returns may vary based on market performance. This calculator does not guarantee investment returns.</p>

            {/* ---- Timeline ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              className="mt-16 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                A separate lens
              </p>
              <h3 className="font-display mt-3 text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
                How far could Mutual Funds pull ahead?
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                This uses the same monthly amount as your calculator above, but its own fixed
                horizon — so you can see the Mutual Fund advantage clearly, independent of
                whatever period you're exploring above.
              </p>

              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Horizon
                </p>
                <div className="relative flex rounded-full border border-border bg-card p-1 shadow-sm">
                  {COMPARISON_HORIZONS.map((horizon) => (
                    <button
                      key={horizon}
                      onClick={() => setComparisonYears(horizon)}
                      className={`ft-timeline-btn relative z-10 rounded-full px-5 py-2.5 text-sm font-bold ${
                        comparisonYears === horizon ? 'text-accent-foreground' : 'text-primary/60 hover:text-primary'
                      }`}
                    >
                      {comparisonYears === horizon && (
                        <motion.span
                          layoutId="timelinePill"
                          className="absolute inset-0 -z-10 rounded-full bg-accent shadow-sm shadow-accent/30"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      {horizon} Years
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ---- Comparison ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-6 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/[0.06] sm:p-8 lg:p-10"
            >
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                    The mutual fund advantage
                  </p>
                  <h3 className="font-display mt-2 text-2xl font-semibold text-primary sm:text-3xl">
                    Mutual Fund vs. FD vs. PPF vs. Savings
                  </h3>
                </div>

                {/* Segmented tabs */}
                <div className="relative flex flex-wrap rounded-full border border-border bg-secondary/50 p-1">
                  {comparisonBars.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setCompareTab(tab.key as typeof compareTab)}
                      className={`relative z-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                        compareTab === tab.key ? 'text-accent-foreground' : 'text-primary/70 hover:text-primary'
                      }`}
                    >
                      {compareTab === tab.key && (
                        <motion.span
                          layoutId="compareTabPill"
                          className="absolute inset-0 -z-10 rounded-full bg-accent"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Assumed return for <span className="font-semibold text-primary">{activeComparison.label}</span>:{' '}
                <span className="font-semibold text-accent">{activeComparison.rate}% p.a.</span> — projected over a{' '}
                <span className="font-semibold text-primary">{comparisonYears}-year</span> horizon at{' '}
                {formatINR(monthlyInvestment)}/month, regardless of the period set in the calculator above.
              </p>

              {/* Line chart: wealth growth over time */}
              <div className="mt-8 h-64 min-w-0 w-full overflow-hidden sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthSeries} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border, #E5E1D8)" strokeDasharray="3 6" />
                    <XAxis
                      dataKey="year"
                      tickFormatter={formatYearLabel}
                      tick={{ fontSize: 12, fill: '#8A8578' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => formatINR(v, true)}
                      tick={{ fontSize: 12, fill: '#8A8578' }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip content={<GrowthTooltip />} cursor={{ stroke: 'rgba(11,31,58,0.15)', strokeWidth: 1 }} />
                    <Line
                      type="monotone"
                      dataKey="mf"
                      name="Mutual Fund"
                      stroke={CHART_COLORS.mutualFund}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fd"
                      name="Fixed Deposit"
                      stroke={CHART_COLORS.fd}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="ppf"
                      name="PPF"
                      stroke={CHART_COLORS.ppf}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="savings"
                      name="Savings"
                      stroke={CHART_COLORS.savings}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-muted-foreground">
                <LegendDot color={CHART_COLORS.mutualFund} label="Mutual Fund" />
                <LegendDot color={CHART_COLORS.fd} label="Fixed Deposit" />
                <LegendDot color={CHART_COLORS.ppf} label="PPF" />
                <LegendDot color={CHART_COLORS.savings} label="Savings" dashed />
              </div>

              {/* Bar chart: final wealth comparison */}
              <div className="mt-10 border-t border-border pt-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  Final wealth after {comparisonYears} years
                </p>
                <div className="mt-4 h-64 min-w-0 w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonBars} margin={{ top: 24, right: 12, left: 0, bottom: 0 }} barCategoryGap="24%">
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#8A8578', fontWeight: 600 }}
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(201,162,39,0.06)' }}
                        content={<BarTooltip />}
                      />
                      <Bar
                        dataKey="value"
                        radius={[12, 12, 0, 0]}
                        maxBarSize={72}
                        isAnimationActive={false}
                        label={{
                          position: 'top',
                          formatter: (v: unknown) => formatINR(Number(v), true),
                          fill: '#0B1F3A',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {comparisonBars.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={entry.color}
                            className="transition-opacity duration-200 hover:opacity-85"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* ---- Wealth difference highlight (Feature 6) ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="mt-8 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/[0.06] sm:p-8 lg:p-10"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Investing {formatINR(monthlyInvestment)} every month
              </p>
              <h3 className="font-display mt-2 text-2xl font-semibold text-primary sm:text-3xl">
                Where your money could stand in {comparisonYears} years
              </h3>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ResultCard label="Mutual Fund" value={formatINR(compFutureValueMF, true)} highlight />
                <ResultCard label="PPF" value={formatINR(compFutureValuePPF, true)} />
                <ResultCard label="Fixed Deposit" value={formatINR(compFutureValueFD, true)} />
                <ResultCard label="Savings" value={formatINR(compFutureValueSavings, true)} />
              </div>

              <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-accent/25 bg-accent/[0.07] px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
                <p className="text-sm font-semibold text-primary/80">
                  Potential difference between Mutual Fund and Savings
                </p>
                <p className="font-display text-3xl font-bold text-accent tabular-nums sm:text-4xl">
                  +{formatINR(compGapVsSavings, true)}
                </p>
              </div>
            </motion.div>

            {/* ---- Insight + disclaimer ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]"
            >
              <div className="rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.08] via-card to-card p-7 shadow-sm sm:p-8">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  <TrendingUp className="size-3.5" />
                  What this means for you
                </div>
                <p className="font-display mt-4 text-xl leading-8 text-primary sm:text-2xl">
                  {insightMessage}
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-secondary/40 p-7 sm:p-8">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  <Info className="size-3.5" />
                  Good to know
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  This calculator provides illustrative estimates based on assumed rates of
                  return and should not be considered a guarantee of future performance.
                  Mutual fund investments are subject to market risks. Please read all
                  scheme-related documents carefully before investing.
                </p>
                <button
                  onClick={() => scrollTo('contact')}
                  className="group mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-accent"
                >
                  Talk to an advisor about your plan
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------------- Why Us ---------------- */}
        <section
          id="why-us"
          className="bg-primary px-5 py-24 text-primary-foreground lg:px-8 lg:py-32"
        >
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
            >
             <div className="mx-auto max-w-4xl text-center">
  <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent">
    Why Choose Us
  </p>

  <h2 className="font-display mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
    A partner for the{" "}
    <span className="text-accent">long view.</span>
  </h2>

  <p className="mx-auto mt-8 max-w-3xl text-lg leading-9 text-primary-foreground/75">
    We combine expert knowledge, proven strategies, and personalized service
    to help you achieve your financial aspirations with confidence through
    disciplined, long-term investing.
  </p>
</div>
              <ul className="mt-9 flex flex-col gap-4">
  {reasons.map((reason) => (
    <li key={reason.title} className="flex items-start gap-3 text-base">
      <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-accent text-accent">
        <Check className="size-3.5" />
      </span>

      <div>
        <span className="font-semibold text-primary-foreground">
          {reason.title}
        </span>
        <span className="text-primary-foreground/70">
          {" — "}{reason.description}
        </span>
      </div>
    </li>
  ))}
</ul>
            </motion.div>
          </div>
        </section>

        {/* ---------------- Contact ---------------- */}
        <section id="contact" className="bg-secondary/30 px-5 py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-accent">
                Let&apos;s talk
              </p>
              <h2 className="font-display mt-4 text-4xl font-semibold text-primary sm:text-5xl">
                Your next chapter starts here.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Ready to start your investment journey? We&apos;re here to help you every
                step of the way.
              </p>
            </motion.div>

            <div className="mt-16 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                className="rounded-3xl bg-primary p-8 text-primary-foreground shadow-xl shadow-primary/10 sm:p-10"
              >
                <h3 className="font-display text-2xl font-semibold">Finthree Capital</h3>
                <p className="mt-2 text-primary-foreground/60">Invest in what matters.</p>
                <div className="mt-10 flex flex-col gap-7">
                  <ContactItem
                    icon={MapPin}
                    label="Visit us"
                    text={
                      <>
                        37 D, Shastringar, PAC Camp
                        <br />
                        Gorakhpur – 273014
                      </>
                    }
                  />
                 <ContactItem
  icon={Mail}
  label="Email us"
  text="finthreecapital@gmail.com"
/>

<ContactItem
  icon={Phone}
  label="Call us"
  text={
    <>
      +91 9621692197
      <br />
      +91 9560632786
      <br />
      +91 9927989881
    </>
  }
/>
                </div>
              </motion.div>

              <motion.form
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10"
                onSubmit={handleSubmit}
              >
                <h3 className="font-display text-2xl font-semibold text-primary">
                  Send us a message
                </h3>
                {submitted ? (
                  <div className="mt-8 rounded-2xl bg-accent/15 p-6 text-primary">
                    <Check className="size-7 text-accent" />
                    <p className="mt-3 font-bold">Thank you for reaching out.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Our team will be in touch shortly.
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 flex flex-col gap-5">
                    <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      Full name
                      <input
                        required
                        name="name"
                        value={formData.name}
                        onChange={handleFormFieldChange}
                        className="rounded-xl border border-input bg-background px-4 py-3 text-base font-normal normal-case tracking-normal text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        placeholder="Your name"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      Email address
                      <input
                        required
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormFieldChange}
                        className="rounded-xl border border-input bg-background px-4 py-3 text-base font-normal normal-case tracking-normal text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      Phone Number
                      <input
                        required
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleFormFieldChange}
                        className="rounded-xl border border-input bg-background px-4 py-3 text-base font-normal normal-case tracking-normal text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        placeholder="+91 9876543210"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      Message
                      <textarea
                        required
                        rows={4}
                        name="message"
                        value={formData.message}
                        onChange={handleFormFieldChange}
                        className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-base font-normal normal-case tracking-normal text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        placeholder="Tell us about your investment goals..."
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={sending}
                      aria-busy={sending}
                      className="group inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 font-bold text-accent-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30"
                    >
                      Request a consultation
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </div>
                )}
              </motion.form>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="bg-primary px-5 py-14 text-primary-foreground lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Finthree Capital logo"
                className="size-11 rounded-full object-cover ring-1 ring-white/10"
              />
              <div>
                <p className="font-display font-semibold">Finthree Capital Pvt. Ltd.</p>
                <p className="text-sm text-primary-foreground/55">
                  AMFI-Registered Mutual Fund Distributor
                </p>
              </div>
            </div>
            <div className="flex gap-8 text-sm text-primary-foreground/70">
              <button onClick={() => scrollTo('about')} className="transition-colors hover:text-accent">
                About
              </button>
              <button onClick={() => scrollTo('services')} className="transition-colors hover:text-accent">
                Services
              </button>
              <button onClick={() => scrollTo('contact')} className="transition-colors hover:text-accent">
                Contact
              </button>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-primary-foreground/20 via-primary-foreground/5 to-transparent" />

          <div className="flex flex-col gap-6">
            <p className="flex items-start gap-3 text-sm leading-6 text-primary-foreground/60">
              <ChevronDown className="mt-1 size-4 shrink-0 text-accent" />
              <span>
                <strong className="text-accent">Important notice:</strong> Mutual fund
                investments are subject to market risks. Please read all scheme-related
                documents carefully before investing. Past performance is not indicative of
                future returns.
              </span>
            </p>
            <p className="text-xs tracking-wide text-primary-foreground/35">
              © 2026 Finthree Capital Private Limited. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

<a
        href="https://wa.me/919621692197"
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Finthree Capital on WhatsApp"
        className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform duration-300 hover:scale-110"
      >
        <MessageCircle className="size-7" />
      </a>

      <AskFinthreeChat
        onNavigateCalculator={() => scrollTo('calculator')}
        whatsappHref="https://wa.me/919621692197"
      />

      <EthicalInvestingModal open={ethicalModalOpen} onClose={() => setEthicalModalOpen(false)} />
    </div>
  )
}

function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative py-1 text-sm font-semibold text-primary transition-colors hover:text-accent"
    >
      {label}
      <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent transition-all duration-300 ease-out group-hover:w-full" />
    </button>
  )
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck
  title: string
  text: string
}) {
  return (
    <motion.article
      variants={fadeUp}
      className="group rounded-3xl border border-border bg-card p-8 text-center shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/[0.08]"
    >
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-accent/15 text-accent transition-transform duration-500 group-hover:scale-110">
        <Icon className="size-7" />
      </div>
      <h3 className="mt-6 text-xl font-bold text-primary">{title}</h3>
      <p className="mt-3 leading-7 text-muted-foreground">{text}</p>
    </motion.article>
  )
}

/* ============================================================
   Ethical Investing Focus — modal
   ============================================================ */

function EthicalInvestingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ethical-investing-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-3xl border border-border bg-[#F8F8F6] p-6 shadow-2xl shadow-primary/20 sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-accent hover:text-accent"
        >
          <X className="size-4" />
        </button>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Values-aligned investing
        </p>
        <h3 id="ethical-investing-title" className="font-display mt-3 text-2xl font-semibold text-primary sm:text-3xl">
          Ethical Investing
        </h3>
        <p className="font-display mt-1 text-base italic text-primary/70">
          Invest with purpose. Plan with clarity.
        </p>

        <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
          Ethical investing considers not only potential financial returns, but also factors
          such as environmental responsibility, social impact, and corporate governance.
          At Finthree Capital, we help you explore options that align with your financial
          goals, risk profile, and values.
        </p>

        <p className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 text-xs leading-6 text-muted-foreground">
          Ethical investing does not eliminate investment risk. Fund selection should be
          based on your individual objectives and risk appetite.
        </p>
      </motion.div>
    </div>
  )
}

/* ============================================================
   Ask Finthree — floating chatbot widget
   ============================================================ */

function AskFinthreeChat({
  onNavigateCalculator,
  whatsappHref,
}: {
  onNavigateCalculator: () => void
  whatsappHref: string
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text:
        "Hi! I'm the Ask Finthree assistant. I can explain common investing concepts like SIP, Lumpsum, Step-up SIP, SWP, compounding and more. What would you like to know?",
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Once the user has sent at least one message, the suggested-question
  // chips are no longer needed — hiding them frees up vertical space for
  // the conversation itself.
  const hasUserMessage = messages.some((message) => message.role === 'user')

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const pushMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message])
  }

  const handleAsk = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return
    pushMessage({ id: `u-${Date.now()}`, role: 'user', text: trimmed })
    setInput('')
    setIsTyping(true)
    const { answer, cta } = matchFaqAnswer(trimmed)
    window.setTimeout(() => {
      pushMessage({ id: `b-${Date.now()}`, role: 'bot', text: answer, cta })
      setIsTyping(false)
    }, 450)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handleAsk(input)
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls="ask-finthree-panel"
        aria-label={open ? 'Close Ask Finthree chat assistant' : 'Open Ask Finthree chat assistant'}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-24 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 transition-transform duration-300 hover:scale-110 sm:bottom-5 sm:right-24"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="ask-finthree-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Ask Finthree chat assistant"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-4 bottom-40 top-16 z-40 flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-primary/20 sm:inset-x-auto sm:top-auto sm:bottom-24 sm:right-24 sm:h-[calc(100vh-8rem)] sm:max-h-[720px] sm:min-h-[520px] sm:w-[380px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 bg-primary px-5 py-4 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Bot className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none">Ask Finthree</p>
                  <p className="mt-1 text-xs text-primary-foreground/60">Investing basics, explained</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="flex size-8 items-center justify-center rounded-full text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-primary-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" role="log">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-br-sm bg-accent text-accent-foreground'
                        : 'rounded-bl-sm bg-secondary/60 text-primary'
                    }`}
                  >
                    <p>{message.text}</p>
                    {message.cta === 'calculator' && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateCalculator()
                          setOpen(false)
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        Try the calculator
                        <ArrowRight className="size-3" />
                      </button>
                    )}
                    {message.cta === 'whatsapp' && (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-95"
                      >
                        <MessageCircle className="size-3.5" />
                        Talk to Finthree on WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-secondary/60 px-4 py-2.5 text-sm text-muted-foreground">
                    Typing…
                  </div>
                </div>
              )}
            </div>

            {/* Suggested questions — visible only until the user sends their first message */}
            {!hasUserMessage && (
              <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => handleAsk(question)}
                    className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-accent hover:text-accent"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <p className="border-t border-border px-4 py-1.5 text-[10px] leading-[1.3] text-muted-foreground">
              {CHAT_DISCLAIMER}
            </p>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border px-4 py-3">
              <label htmlFor="ask-finthree-input" className="sr-only">
                Ask a question
              </label>
              <input
                id="ask-finthree-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about SIP, SWP, compounding…"
                className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={!input.trim()}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-sm transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ============================================================
   Wealth Growth Calculator — subcomponents
   ============================================================ */

function CalculatorControl({
  id, label, minLabel, maxLabel, min, max, step, value, onChange, prefix, suffix, inputMode,
}: {
  id: string; label: string; minLabel: string; maxLabel: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void; prefix?: string; suffix?: string; inputMode: 'numeric' | 'decimal'
}) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  // Local text buffer decoupled from the numeric `value` prop so the field
  // can be temporarily empty (or mid-edit) without being clamped on every
  // keystroke. It resyncs whenever `value` changes from outside (e.g. the
  // slider), and is clamped to [min, max] only on blur.
  const [textValue, setTextValue] = useState(String(value))
  useEffect(() => {
    setTextValue(String(value))
  }, [value])

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setTextValue(raw)
    if (raw === '') return
    const next = Number(raw)
    if (Number.isFinite(next)) onChange(next)
  }

  const handleTextBlur = () => {
    const next = Number(textValue)
    if (textValue === '' || !Number.isFinite(next) || next < min) {
      onChange(min)
      setTextValue(String(min))
    } else if (next > max) {
      onChange(max)
      setTextValue(String(max))
    } else {
      setTextValue(String(next))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</label><span className="shrink-0 text-xs font-semibold text-muted-foreground">{minLabel} – {maxLabel}</span></div>
      <div className="ft-input-shell flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
        {prefix && <span aria-hidden className="text-lg font-bold text-primary/50">{prefix}</span>}
        <input id={id} type="number" inputMode={inputMode} min={min} max={max} step={step} value={textValue} onChange={handleTextChange} onBlur={handleTextBlur} className="w-full min-w-0 bg-transparent text-xl font-bold tabular-nums text-primary outline-none [appearance:textfield] sm:text-2xl [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
        {suffix && <span aria-hidden className="shrink-0 text-sm font-medium text-muted-foreground">{suffix}</span>}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={`${label} slider`} className="ft-range w-full" style={{ background: `linear-gradient(to right, #C9A227 0%, #C9A227 ${percentage}%, #E5E1D8 ${percentage}%, #E5E1D8 100%)` }} />
      <div className="flex justify-between text-xs text-muted-foreground"><span>{minLabel}</span><span>{maxLabel}</span></div>
    </div>
  )
}

function ProjectionSummary({ title, invested, returns, total, footer, totalLabel = 'Total Value' }: { title: string; invested: number; returns: number; total: number; footer: string; totalLabel?: string }) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-5 rounded-3xl bg-secondary/40 p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"><ResultCard label="Invested" value={formatINR(invested, true)} /><ResultCard label="Est. Returns" value={formatINR(returns, true)} /></div>
      <ResultCard label={totalLabel} value={formatINR(total, true)} highlight />
      <p className="text-xs leading-5 text-muted-foreground">{footer}</p>
    </div>
  )
}

function ProjectionChart({ title, data }: { title: string; data: { year: number; value: number }[] }) {
  return (
    <div className="mt-6 rounded-[2rem] border border-border bg-card p-5 shadow-xl shadow-primary/[0.06] sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Growth chart</p>
      <h3 className="font-display mt-2 text-xl font-semibold text-primary sm:text-2xl">{title}</h3>
      <div className="mt-5 h-64 w-full min-w-0 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border, #E5E1D8)" strokeDasharray="3 6" />
            <XAxis dataKey="year" tickFormatter={formatYearLabel} tick={{ fontSize: 11, fill: '#8A8578' }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tickFormatter={(v) => formatINR(Number(v), true)} tick={{ fontSize: 11, fill: '#8A8578' }} axisLine={false} tickLine={false} width={64} />
            <Tooltip formatter={(v: any) => formatINR(Number(v ?? 0), true)} labelFormatter={(label) => formatYearLabel(Number(label))} />
            <Line type="monotone" dataKey="value" name="Projected Value" stroke={CHART_COLORS.mutualFund} strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ProjectionBreakdown({ title, rows }: { title: string; rows: { year: number; invested: number; estimatedReturns: number; totalValue: number }[] }) {
  return (
    <details className="group mt-6 rounded-[2rem] border border-border bg-card shadow-xl shadow-primary/[0.06]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left outline-none sm:p-8 [&::-webkit-details-marker]:hidden">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Year-wise breakdown</p><h3 className="font-display mt-2 text-xl font-semibold text-primary sm:text-2xl">{title}</h3></div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/50 text-primary transition-transform duration-200 group-open:rotate-180" aria-hidden="true"><ChevronDown className="size-5" /></span>
      </summary>
      <div className="border-t border-border px-5 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-6"><div className="max-w-full overflow-x-auto rounded-2xl border border-border" role="region" aria-label="Year-wise projection table" tabIndex={0}>
        <table className="min-w-[640px] w-full text-left text-sm"><thead className="bg-secondary/50 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"><tr><th scope="col" className="px-4 py-4 sm:px-5">Year</th><th scope="col" className="px-4 py-4 sm:px-5">Invested Amount</th><th scope="col" className="px-4 py-4 sm:px-5">Estimated Returns</th><th scope="col" className="px-4 py-4 text-right sm:px-5">Total Value</th></tr></thead><tbody>{rows.map((row) => <tr key={row.year} className="border-t border-border text-primary"><td className="whitespace-nowrap px-4 py-4 font-semibold sm:px-5">{row.year}</td><td className="whitespace-nowrap px-4 py-4 tabular-nums sm:px-5">{formatINR(row.invested)}</td><td className="whitespace-nowrap px-4 py-4 tabular-nums sm:px-5">{formatINR(row.estimatedReturns)}</td><td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums sm:px-5">{formatINR(row.totalValue)}</td></tr>)}</tbody></table>
      </div></div>
    </details>
  )
}

function ResultCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 transition-all duration-300 sm:p-6 ${
        highlight
          ? 'border-accent/30 bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'border-border bg-secondary/40 text-primary hover:border-accent/30'
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.16em] ${
          highlight ? 'text-accent' : 'text-muted-foreground'
        }`}
      >
        {label}
      </p>
      <p className={`font-display mt-2 break-words text-xl font-semibold leading-tight tabular-nums sm:text-3xl lg:text-4xl ${highlight ? 'text-accent' : 'text-primary'}`}>
        {value}
      </p>
    </div>
  )
}

function LegendDot({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block h-[3px] w-4 rounded-full"
        style={{ backgroundColor: dashed ? 'transparent' : color, borderTop: dashed ? `2px dashed ${color}` : undefined }}
      />
      {label}
    </span>
  )
}

function GrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card/95 px-4 py-3 text-sm shadow-xl backdrop-blur">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {formatYearLabel(label)}
      </p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-primary/80">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-primary">{formatINR(entry.value, true)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null
  return (
    <div className="rounded-xl border border-border bg-card/95 px-4 py-3 text-sm shadow-xl backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{item.label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-primary">{formatINR(item.value, true)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{item.rate}% assumed p.a.</p>
    </div>
  )
}

function ContactItem({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof MapPin
  label: string
  text: ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-bold capitalize">{label}</p>
        <p className="mt-2 break-words text-sm leading-6 text-primary-foreground/70">{text}</p>
      </div>
    </div>
  )
}
