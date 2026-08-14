'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react'

const logo = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/WhatsApp%20Image%202026-08-14%20at%208.39.38%20PM-UzqctecHO4qQ0NmjYXFGVONkgYMCBI.jpeg'
const heroImage = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=85'
const whyImage = 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85'

const navItems = ['About', 'Services', 'Why Us', 'Contact']
const services = [
  { icon: TrendingUp, title: 'Systematic Investment Plan', short: 'SIP', text: 'Build wealth gradually with regular, disciplined investments.' },
  { icon: ArrowRight, title: 'Systematic Transfer Plan', short: 'STP', text: 'Transfer investments systematically to optimize returns.' },
  { icon: Wallet, title: 'One-time Investment', short: 'Lumpsum', text: 'Invest a significant amount for potential long-term growth.' },
  { icon: ArrowRight, title: 'Systematic Withdrawal Plan', short: 'SWP', text: 'Generate regular income from your mutual fund investments.' },
]
const reasons = [
  'Expert guidance from certified professionals',
  'Goal-based investing strategies',
  'Personalized portfolio recommendations',
  'Regular performance monitoring',
  'Comprehensive financial planning support',
]

export function FinthreeSite() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button aria-label="Finthree Capital home" onClick={() => scrollTo('home')} className="flex items-center">
            <img src={logo} alt="Finthree Capital logo" className="size-14 rotate-90 rounded-full object-cover" />
          </button>
          <nav className="hidden items-center gap-10 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <button key={item} onClick={() => scrollTo(item === 'Why Us' ? 'why-us' : item.toLowerCase())} className="text-sm font-semibold text-primary transition-colors hover:text-accent">
                {item}
              </button>
            ))}
          </nav>
          <button onClick={() => scrollTo('contact')} className="hidden rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5 md:block">Get Started</button>
          <button className="rounded-md p-2 md:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && <nav className="flex flex-col gap-4 border-t border-border bg-background px-5 py-5 md:hidden">{navItems.map((item) => <button key={item} onClick={() => scrollTo(item === 'Why Us' ? 'why-us' : item.toLowerCase())} className="text-left font-semibold text-primary">{item}</button>)}<button onClick={() => scrollTo('contact')} className="rounded-full bg-accent px-5 py-3 font-bold text-accent-foreground">Get Started</button></nav>}
      </header>

      <main>
        <section id="home" className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-28 lg:pt-24">
          <div>
            <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-accent"><Sparkles className="size-4" /> Invest with intention</p>
            <h1 className="max-w-xl text-5xl font-extrabold leading-[1.05] tracking-tight text-primary sm:text-6xl lg:text-7xl">Invest Smart.<br /><span className="text-accent">Grow Steady.</span><br />Secure Your Future.</h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">Finthree Capital helps you invest wisely with SIP, STP, Lumpsum, and SWP plans tailored to your financial goals.</p>
            <div className="mt-9 flex flex-wrap gap-4"><button onClick={() => scrollTo('contact')} className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 font-bold text-accent-foreground transition-transform hover:-translate-y-1">Start Your Journey <ArrowRight className="size-4" /></button><button onClick={() => scrollTo('services')} className="rounded-full border border-primary/20 px-7 py-4 font-bold text-primary hover:border-accent hover:text-accent">Explore Services</button></div>
            <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground"><ShieldCheck className="size-5 text-accent" /> AMFI-registered mutual fund distributor</div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] bg-muted shadow-2xl shadow-primary/10"><img src={heroImage} alt="A hand carefully building a stable investment tower" className="aspect-[1.12] w-full object-cover" /><div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-primary p-5 text-primary-foreground shadow-xl sm:bottom-7 sm:left-7 sm:right-auto sm:max-w-xs"><p className="text-2xl font-extrabold">Your goals.</p><p className="text-2xl font-extrabold text-accent">Our guidance.</p><p className="mt-2 text-sm text-primary-foreground/70">A more confident way to invest.</p></div></div>
        </section>

        <section id="about" className="bg-secondary/50 px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Built around you</p><h2 className="mt-4 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">A clear path to financial growth.</h2><p className="mt-6 text-lg leading-8 text-muted-foreground">An AMFI-registered mutual fund distributor helping individuals achieve financial growth through disciplined investing. We believe in building long-term wealth through informed decisions and personalized strategies.</p></div><div className="mt-14 grid gap-5 md:grid-cols-3"><Feature icon={ShieldCheck} title="Trust" text="AMFI-registered and compliant with regulatory standards." /><Feature icon={Sparkles} title="Transparency" text="Clear insights into your investments and performance." /><Feature icon={Target} title="Tailored Solutions" text="Customized strategies aligned with your financial goals." /></div></div></section>

        <section id="services" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Our expertise</p><h2 className="mt-3 text-4xl font-extrabold text-primary sm:text-5xl">Investment solutions<br className="hidden sm:block" /> that fit your life.</h2></div><p className="max-w-md text-base leading-7 text-muted-foreground">Choose the investment strategy that aligns with your financial objectives and current stage of life.</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{services.map(({ icon: Icon, title, short, text }) => <article key={short} className="group rounded-2xl border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl"><div className="flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent"><Icon className="size-6" /></div><p className="mt-7 text-sm font-bold uppercase tracking-widest text-accent">{short}</p><h3 className="mt-2 text-xl font-bold text-primary">{title}</h3><p className="mt-4 leading-7 text-muted-foreground">{text}</p><button onClick={() => scrollTo('contact')} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary group-hover:text-accent">Learn more <ArrowRight className="size-4" /></button></article>)}</div></section>

        <section id="why-us" className="bg-primary px-5 py-20 text-primary-foreground lg:px-8 lg:py-28"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Why choose us</p><h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">A partner for the<br /><span className="text-accent">long view.</span></h2><p className="mt-6 max-w-lg text-lg leading-8 text-primary-foreground/70">We combine expert knowledge, proven strategies, and personalized service to help you achieve your financial aspirations with confidence.</p><ul className="mt-8 flex flex-col gap-4">{reasons.map((reason) => <li key={reason} className="flex items-center gap-3 text-base"><span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-accent text-accent"><Check className="size-3.5" /></span>{reason}</li>)}</ul></div><div className="relative"><img src={whyImage} alt="Professionals collaborating around a table" className="aspect-[1.2] w-full rounded-[2rem] object-cover opacity-90" /><div className="absolute -bottom-5 -left-4 rounded-2xl bg-accent px-6 py-5 text-accent-foreground shadow-xl sm:-left-6"><p className="text-3xl font-extrabold">25+</p><p className="text-sm font-semibold">years of combined<br />experience</p></div></div></div></section>

        <section id="contact" className="px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">Let&apos;s talk</p><h2 className="mt-4 text-4xl font-extrabold text-primary sm:text-5xl">Your next chapter starts here.</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">Ready to start your investment journey? We&apos;re here to help you every step of the way.</p></div><div className="mt-14 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-3xl bg-primary p-8 text-primary-foreground sm:p-10"><h3 className="text-2xl font-bold">Finthree Capital</h3><p className="mt-2 text-primary-foreground/60">Invest in what matters.</p><div className="mt-10 flex flex-col gap-7"><ContactItem icon={MapPin} label="Visit us" text={<>37 D, Shastringar, PAC Camp<br />Gorakhpur – 273014</>} /><ContactItem icon={Mail} label="Email us" text="finthreecapital@gmail.com" /><ContactItem icon={Phone} label="Call us" text="+91 9005950010 / 11 / 12 / 14 / 15" /></div></div><form className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-10" onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}><h3 className="text-2xl font-bold text-primary">Send us a message</h3>{submitted ? <div className="mt-8 rounded-2xl bg-accent/15 p-6 text-primary"><Check className="size-7 text-accent" /><p className="mt-3 font-bold">Thank you for reaching out.</p><p className="mt-1 text-sm text-muted-foreground">Our team will be in touch shortly.</p></div> : <div className="mt-8 flex flex-col gap-5"><label className="flex flex-col gap-2 text-sm font-semibold text-primary">Full name<input required className="rounded-xl border border-input bg-background px-4 py-3 font-normal outline-none ring-accent focus:ring-2" placeholder="Your name" /></label><label className="flex flex-col gap-2 text-sm font-semibold text-primary">Email address<input required type="email" className="rounded-xl border border-input bg-background px-4 py-3 font-normal outline-none ring-accent focus:ring-2" placeholder="you@example.com" /></label><label className="flex flex-col gap-2 text-sm font-semibold text-primary">Message<textarea required rows={4} className="resize-none rounded-xl border border-input bg-background px-4 py-3 font-normal outline-none ring-accent focus:ring-2" placeholder="Tell us about your investment goals..." /></label><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 font-bold text-accent-foreground hover:brightness-95">Request a consultation <ArrowRight className="size-4" /></button></div>}</form></div></div></section>
      </main>

      <footer className="bg-primary px-5 py-12 text-primary-foreground lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-8"><div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><img src={logo} alt="Finthree Capital logo" className="size-11 rotate-90 rounded-full object-cover" /><div><p className="font-bold">Finthree Capital Pvt. Ltd.</p><p className="text-sm text-primary-foreground/60">AMFI-Registered Mutual Fund Distributor</p></div></div><div className="flex gap-6 text-sm text-primary-foreground/70"><button onClick={() => scrollTo('about')} className="hover:text-accent">About</button><button onClick={() => scrollTo('services')} className="hover:text-accent">Services</button><button onClick={() => scrollTo('contact')} className="hover:text-accent">Contact</button></div></div><div className="border-t border-primary-foreground/15 pt-7"><p className="flex items-start gap-3 text-sm leading-6 text-primary-foreground/60"><ChevronDown className="mt-1 size-4 shrink-0 text-accent" /><span><strong className="text-accent">Important notice:</strong> Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing. Past performance is not indicative of future returns.</span></p><p className="mt-6 text-xs text-primary-foreground/40">© 2026 Finthree Capital Private Limited. All rights reserved.</p></div></div></footer>
      <a href="https://wa.me/919005950010" target="_blank" rel="noreferrer" aria-label="Chat with Finthree Capital on WhatsApp" className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-lg font-extrabold text-accent-foreground shadow-xl transition-transform hover:scale-105">WA</a>
    </div>
  )
}

function Feature({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) { return <article className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm"><div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Icon className="size-7" /></div><h3 className="mt-6 text-xl font-bold text-primary">{title}</h3><p className="mt-3 leading-7 text-muted-foreground">{text}</p></article> }
function ContactItem({ icon: Icon, label, text }: { icon: typeof MapPin; label: string; text: React.ReactNode }) { return <div className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-5" /></div><div><p className="font-bold capitalize">{label}</p><p className="mt-2 text-sm leading-6 text-primary-foreground/70">{text}</p></div></div> }
