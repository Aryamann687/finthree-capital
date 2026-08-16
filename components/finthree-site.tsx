'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'
import { motion, animate } from 'framer-motion'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Leaf,
  Mail,
  MapPin,
  Menu,
  Phone,
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

const navItems = ['About', 'Services', 'Why Us', 'Contact']

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

/** Smoothly tweens a displayed number toward `value` whenever it changes. */
function useAnimatedNumber(value: number, duration = 0.7) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const controls = animate(prevRef.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    })
    prevRef.current = value
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return display
}

export function FinthreeSite() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [expectedReturnInput, setExpectedReturnInput] = useState(String(CALC_DEFAULTS.expectedReturn))

  // ---- Wealth Growth Calculator state ----
  const [monthlyInvestment, setMonthlyInvestment] = useState(CALC_DEFAULTS.monthlyInvestment)
  const [monthlyDraft, setMonthlyDraft] = useState(String(CALC_DEFAULTS.monthlyInvestment))
  const [expectedReturn, setExpectedReturn] = useState(CALC_DEFAULTS.expectedReturn)
  const [years, setYears] = useState(CALC_DEFAULTS.years)
  const [compareTab, setCompareTab] = useState<'mf' | 'fd' | 'ppf' | 'savings'>('mf')
  // Comparison charts always project across a fixed horizon, selectable via
  // the timeline buttons — independent of the calculator's own period above.
  const [comparisonYears, setComparisonYears] = useState<number>(DEFAULT_COMPARISON_YEARS)

  const monthlyInputRef = useRef<HTMLInputElement>(null)

  const handleMonthlyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const caret = e.target.selectionStart ?? raw.length
    const digitsBeforeCaret = raw.slice(0, caret).replace(/[^\d]/g, '').length
    const digits = raw.replace(/[^\d]/g, '').slice(0, 6)
    setMonthlyDraft(digits)
    setMonthlyInvestment(digits === '' ? 0 : parseInt(digits, 10))

    // Restore the caret to sit after the same digit it followed pre-format,
    // so typing in the middle of the number doesn't jump to the end.
    requestAnimationFrame(() => {
      const input = monthlyInputRef.current
      if (!input) return
      const formatted = digits === '' ? '' : formatIndianDigits(Number(digits))
      let seen = 0
      let pos = formatted.length
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) seen++
        if (seen === digitsBeforeCaret) {
          pos = i + 1
          break
        }
      }
      input.setSelectionRange(pos, pos)
    })
  }
  const handleMonthlyBlur = () => {
    const clamped = Math.min(100000, Math.max(500, Math.round((monthlyInvestment || 500) / 500) * 500))
    setMonthlyInvestment(clamped)
    setMonthlyDraft(String(clamped))
  }

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
  // Savings figure at the calculator's own period — feeds the top insight
  // sentence only; the comparison charts below use the fixed horizon instead.
  const futureValueSavings = useMemo(
    () => sipFutureValue(monthlyInvestment, SAVINGS_RATE, years),
    [monthlyInvestment, years],
  )

  // ---- Fixed-horizon comparison figures (drive charts, tabs & highlight card) ----
  const compFutureValueMF = useMemo(
    () => sipFutureValue(monthlyInvestment, expectedReturn, comparisonYears),
    [monthlyInvestment, expectedReturn, comparisonYears],
  )
  const compFutureValueFD = useMemo(
    () => sipFutureValue(monthlyInvestment, FD_RATE, comparisonYears),
    [monthlyInvestment, comparisonYears],
  )
  const compFutureValuePPF = useMemo(
    () => sipFutureValue(monthlyInvestment, PPF_RATE, comparisonYears),
    [monthlyInvestment, comparisonYears],
  )
  const compFutureValueSavings = useMemo(
    () => sipFutureValue(monthlyInvestment, SAVINGS_RATE, comparisonYears),
    [monthlyInvestment, comparisonYears],
  )

  const growthSeries = useMemo(() => {
    const mf = buildGrowthSeries(monthlyInvestment, expectedReturn, comparisonYears)
    const fd = buildGrowthSeries(monthlyInvestment, FD_RATE, comparisonYears)
    const ppf = buildGrowthSeries(monthlyInvestment, PPF_RATE, comparisonYears)
    const savings = buildGrowthSeries(monthlyInvestment, SAVINGS_RATE, comparisonYears)
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
  }, [monthlyInvestment, expectedReturn, comparisonYears])

  const comparisonBars = useMemo(
    () => [
      { key: 'mf', label: 'Mutual Fund', rate: expectedReturn, value: compFutureValueMF, color: CHART_COLORS.mutualFund },
      { key: 'fd', label: 'Fixed Deposit', rate: FD_RATE, value: compFutureValueFD, color: CHART_COLORS.fd },
      { key: 'ppf', label: 'PPF', rate: PPF_RATE, value: compFutureValuePPF, color: CHART_COLORS.ppf },
      { key: 'savings', label: 'Savings', rate: SAVINGS_RATE, value: compFutureValueSavings, color: CHART_COLORS.savings },
    ],
    [expectedReturn, compFutureValueMF, compFutureValueFD, compFutureValuePPF, compFutureValueSavings],
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

  const animatedTotalInvested = useAnimatedNumber(totalInvested)
  const animatedEstimatedReturns = useAnimatedNumber(estimatedReturns)
  const animatedFutureValue = useAnimatedNumber(futureValueMF)

  // Animated counters for the fixed-horizon highlight card (Feature 6)
  const animatedCompMF = useAnimatedNumber(compFutureValueMF)
  const animatedCompPPF = useAnimatedNumber(compFutureValuePPF)
  const animatedCompFD = useAnimatedNumber(compFutureValueFD)
  const animatedCompSavings = useAnimatedNumber(compFutureValueSavings)
  const animatedCompGap = useAnimatedNumber(compGapVsSavings)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

        /* Wealth calculator slider — transparent native track, custom gold thumb */
        .ft-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .ft-range::-webkit-slider-runnable-track { background: transparent; }
        .ft-range::-moz-range-track { background: transparent; border: none; }
        .ft-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: #C9A227;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 6px rgba(11, 31, 58, 0.3), 0 0 0 1px rgba(201,162,39,0.25), 0 0 0 8px rgba(201,162,39,0.12);
          margin-top: 0px;
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
          {/* decorative low-opacity shapes */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-28 -right-20 size-[420px] rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute top-1/2 -left-40 size-[380px] -translate-y-1/2 rounded-full bg-primary/[0.05] blur-3xl" />
            <div className="absolute bottom-0 right-1/3 size-[260px] rounded-full bg-accent/[0.07] blur-2xl" />
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
              className="flex flex-wrap justify-center font-display text-5xl font-semibold leading-[1.05] tracking-tight text-primary sm:text-6xl lg:text-7xl"
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
      <p className="mt-10 text-3xl font-bold tracking-tight text-primary sm:text-2xl">
  <span className="not-italic font-bold text-primary">Because</span>
  <br />
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

            <motion.div
              className="mt-12 flex items-center gap-3 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.1, duration: 0.5 }}
            >
             
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
  className="mt-10 rounded-2xl border border-accent/30 bg-accent/10 p-5"
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
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-2xl hover:shadow-primary/[0.08]"
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
                  className="relative mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors group-hover:text-accent"
                >
                  Learn more
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </motion.article>
            ))}
          </motion.div>
        </section>

        {/* ---------------- Wealth Growth Calculator ---------------- */}
        <section id="calculator" className="relative overflow-hidden bg-secondary/40 px-5 py-24 lg:px-8 lg:py-32">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 left-1/4 size-[360px] rounded-full bg-accent/[0.06] blur-3xl" />
            <div className="absolute bottom-0 right-0 size-[320px] rounded-full bg-primary/[0.04] blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-accent">
                Plan with clarity
              </p>
              <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
                Wealth Growth Calculator
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                See how disciplined investing can grow your wealth over time through
                interactive projections.
              </p>
            </motion.div>

            {/* ---- SIP Calculator ---- */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="mt-14 grid gap-8 rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-primary/[0.06] sm:p-8 lg:grid-cols-[1fr_0.9fr] lg:p-10"
            >
              {/* Inputs */}
<div className="flex flex-col justify-center gap-9">
  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
    <Sparkles className="size-3.5" />
    Illustrative Estimate
  </div>

  {/* Monthly SIP — premium amount input, no slider */}
  <div className="space-y-3">
    <label className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">
      Monthly SIP
    </label>
    <div className="ft-input-shell flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3.5 shadow-sm">
      <span className="text-xl font-bold text-primary/50">₹</span>
      <input
        ref={monthlyInputRef}
        type="text"
        inputMode="numeric"
        value={monthlyDraft === '' ? '' : formatIndianDigits(Number(monthlyDraft))}
        onChange={handleMonthlyChange}
        onBlur={handleMonthlyBlur}
        aria-label="Monthly SIP amount in rupees"
        placeholder="10,000"
        className="w-full min-w-0 bg-transparent text-2xl font-bold tabular-nums text-primary outline-none placeholder:text-primary/30"
      />
    </div>
    <p className="text-xs text-muted-foreground">₹500 – ₹1,00,000, in steps of ₹500</p>
  </div>

  {/* ROI - keep existing premium slider */}
  <div className="space-y-4">
  <div className="flex items-center justify-between">
    <label className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">
      Expected Annual Return
    </label>

    <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
     <input
  type="number"
  value={expectedReturnInput}
  min={1}
  max={30}
  step={0.5}
  aria-label="Expected annual return percentage"
  onChange={(e) => {
    const value = e.target.value
    setExpectedReturnInput(value)

    if (value !== "") {
      const num = Number(value)
      if (!isNaN(num)) {
        setExpectedReturn(Math.min(30, Math.max(1, num)))
      }
    }
  }}
  onBlur={() => {
    setExpectedReturnInput(expectedReturn.toString())
  }}
  className="w-16 bg-transparent text-right text-2xl font-bold text-primary outline-none"
/>
      <span className="text-sm text-muted-foreground">%</span>
    </div>
  </div>

  <input
    type="range"
    min={1}
    max={30}
    step={0.5}
    value={expectedReturn}
    onChange={(e) => setExpectedReturn(Number(e.target.value))}
    aria-label="Expected annual return slider"
    className="w-full accent-accent"
  />
</div>
  {/* Investment Period — premium number input, no slider */}
  <div className="space-y-3">
    <label className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">
      Investment Period
    </label>
    <div className="ft-input-shell flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 shadow-sm">
      <input
        type="number"
        value={years}
        min={1}
        max={40}
        step={1}
        onChange={(e) =>
          setYears(Math.min(40, Math.max(1, Number(e.target.value) || 1)))
        }
        aria-label="Investment period in years"
        className="w-16 bg-transparent text-2xl font-bold tabular-nums text-primary outline-none"
      />
      <span className="text-sm font-medium text-muted-foreground">
        {years === 1 ? 'Year' : 'Years'}
      </span>
    </div>
    <p className="text-xs text-muted-foreground">1 – 40 years</p>
  </div>
</div>

              {/* Results — driven only by the inputs above, independent of the comparison horizon below */}
              <div className="flex flex-col justify-center gap-5 rounded-3xl bg-secondary/40 p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Your projection over {years} {years === 1 ? 'year' : 'years'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <ResultCard label="Invested" value={formatINR(animatedTotalInvested, true)} />
                  <ResultCard label="Est. Returns" value={formatINR(animatedEstimatedReturns, true)} />
                </div>
                <ResultCard label="Total Value" value={formatINR(animatedFutureValue, true)} highlight />
                <p className="text-xs leading-5 text-muted-foreground">
                  Based on {formatINR(monthlyInvestment)}/month at an assumed {expectedReturn}% annual return —
                  this figure updates only with the inputs above.
                </p>
              </div>
            </motion.div>

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
              <div className="mt-8 h-72 w-full sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
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
                      width={64}
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
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="fd"
                      name="Fixed Deposit"
                      stroke={CHART_COLORS.fd}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="ppf"
                      name="PPF"
                      stroke={CHART_COLORS.ppf}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
                      animationDuration={1100}
                      animationEasing="ease-out"
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
                      animationDuration={1100}
                      animationEasing="ease-out"
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
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonBars} margin={{ top: 24, right: 12, left: 0, bottom: 0 }} barCategoryGap="24%">
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#8A8578', fontWeight: 600 }}
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
                        animationDuration={1000}
                        animationEasing="ease-out"
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
                <ResultCard label="Mutual Fund" value={formatINR(animatedCompMF, true)} highlight />
                <ResultCard label="PPF" value={formatINR(animatedCompPPF, true)} />
                <ResultCard label="Fixed Deposit" value={formatINR(animatedCompFD, true)} />
                <ResultCard label="Savings" value={formatINR(animatedCompSavings, true)} />
              </div>

              <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-accent/25 bg-accent/[0.07] px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
                <p className="text-sm font-semibold text-primary/80">
                  Potential difference between Mutual Fund and Savings
                </p>
                <p className="font-display text-3xl font-bold text-accent tabular-nums sm:text-4xl">
                  +{formatINR(animatedCompGap, true)}
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

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              className="relative"
            >
              
             
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
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitted(true)
                }}
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
                        className="rounded-xl border border-input bg-background px-4 py-3 text-base font-normal normal-case tracking-normal text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        placeholder="Your name"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      Email address
                      <input
                        required
                        type="email"
                        className="rounded-xl border border-input bg-background px-4 py-3 text-base font-normal normal-case tracking-normal text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
                      Message
                      <textarea
                        required
                        rows={4}
                        className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-base font-normal normal-case tracking-normal text-foreground outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/30"
                        placeholder="Tell us about your investment goals..."
                      />
                    </label>
                    <button className="group inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 font-bold text-accent-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/30">
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
   Wealth Growth Calculator — subcomponents
   ============================================================ */

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
      className={`rounded-2xl border p-6 transition-all duration-300 ${
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
      <p className={`font-display mt-2 text-3xl font-semibold tabular-nums sm:text-4xl ${highlight ? 'text-accent' : 'text-primary'}`}>
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
        <p className="mt-2 text-sm leading-6 text-primary-foreground/70">{text}</p>
      </div>
    </div>
  )
}