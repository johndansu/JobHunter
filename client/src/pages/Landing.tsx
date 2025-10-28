import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Shield, Globe, Database, Users, CheckCircle, Star, TrendingUp, BarChart3, Play, Sparkles, Rocket, Clock, Award, ShoppingCart, FileText, Search, Building2 } from 'lucide-react'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

const Landing = () => {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Extract data from thousands of pages in seconds with our optimized scraping engine. Built for speed and efficiency.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-level security with encrypted data storage and secure API access. Your data is always protected.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Globe,
      title: 'Global Scale',
      description: 'Scrape any website worldwide with our distributed infrastructure. No limits on scale or location.',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      icon: Database,
      title: 'Smart Data',
      description: 'AI-powered data extraction with automatic formatting and validation. Get clean, structured data instantly.',
      color: 'text-slate-600 dark:text-slate-300',
      bgColor: 'bg-slate-100',
    }
  ]

  const stats = [
    { name: 'Pages Scraped Daily', value: '10M+', icon: Globe, color: 'from-teal-500 to-teal-600' },
    { name: 'Enterprise Customers', value: '500+', icon: Users, color: 'from-slate-1000 to-slate-1000' },
    { name: 'Uptime SLA', value: '99.9%', icon: CheckCircle, color: 'from-green-500 to-teal-500' },
    { name: 'Data Points Processed', value: '1B+', icon: Database, color: 'from-orange-500 to-red-500' }
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Data Scientist, TechCorp',
      avatar: 'SC',
      content: 'Reduced our data collection time from weeks to hours. The ROI has been absolutely incredible. This platform transformed how we gather market intelligence.',
      rating: 5,
      color: 'bg-gradient-to-br from-teal-400 to-teal-500'
    },
    {
      name: 'Michael Rodriguez',
      role: 'VP Analytics, DataFlow Inc',
      avatar: 'MR',
      content: 'The most reliable scraping platform we\'ve used. Zero downtime in 18 months. Their support team is phenomenal and always responsive.',
      rating: 5,
      color: 'bg-gradient-to-br from-slate-400 to-slate-400'
    },
    {
      name: 'Jennifer Kim',
      role: 'Head of Research, MarketIntel',
      avatar: 'JK',
      content: 'Transformed our competitive intelligence program. Game changer for our entire organization. The data quality is unmatched.',
      rating: 5,
      color: 'bg-gradient-to-br from-orange-400 to-red-400'
    }
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 dark:bg-slate-900">
      {/* Modern Header with Glass Effect */}
      <header className="border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="h-10 w-10 bg-teal-600 rounded-lg flex items-center justify-center group-hover:bg-teal-700 transition-colors duration-200">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">
                WebScraper<span className="text-teal-600">Pro</span>
              </span>
            </Link>

            <div className="flex items-center space-x-3">
              <ThemeSwitcher />
              <Link 
                to="/login" 
                className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Premium & Bold */}
      <section className="relative bg-gradient-to-b from-white via-slate-50 to-white pt-24 pb-20 overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        {/* Gradient orbs for depth */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-5xl mx-auto mb-16">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold text-slate-900 dark:text-slate-100 mb-8 leading-[1.05] tracking-tight animate-fadeIn">
              Extract web data at{' '}
              <span className="bg-gradient-to-r from-teal-600 via-teal-700 to-teal-700 bg-clip-text text-transparent">
                enterprise scale
              </span>
          </h1>

            <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed animate-fadeIn" style={{ animationDelay: '100ms' }}>
              Powerful, reliable, and secure web scraping for <strong className="text-slate-900 dark:text-slate-100 font-semibold">Fortune 500 companies.</strong> Extract data from any website with zero infrastructure management.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <Link
              to="/register"
                className="px-10 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white text-lg font-bold rounded-xl hover:shadow-2xl hover:shadow-teal-500/30 transition-all duration-200 hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2"
            >
                <Rocket className="h-5 w-5" />
              Start Free Trial
            </Link>
              <button className="px-10 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-lg font-bold rounded-xl hover:bg-slate-50 dark:bg-slate-800 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2">
                <Play className="h-5 w-5" />
              Watch Demo
            </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 animate-fadeIn" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">4.9/5 from enterprise clients</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle className="h-5 w-5 text-teal-600" />
                <span className="font-medium">99.9% Uptime SLA</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Shield className="h-5 w-5 text-teal-600" />
                <span className="font-medium">SOC 2 Certified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats - Bold Metrics */}
      <section className="border-y border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
                <div 
                  key={index}
                  className="text-center group animate-fadeIn hover:-translate-y-1 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-50 rounded-2xl mb-4 group-hover:bg-teal-100 group-hover:scale-110 transition-all duration-300">
                    <Icon className="h-7 w-7 text-teal-600" />
                  </div>
                  <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-1 tracking-tight">{stat.value}</div>
                  <div className="text-base font-semibold text-slate-700 mb-1">{stat.name}</div>
                  <div className="text-xs text-slate-500">Every single day</div>
              </div>
            )
          })}
        </div>
        </div>
      </section>

      {/* Features - Modern Card Grid */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3 animate-fadeIn">
              Built for enterprise scale
          </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 animate-fadeIn" style={{ animationDelay: '100ms' }}>
            Everything you need to extract, process, and analyze web data at scale
          </p>
        </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
                <div 
                  key={index} 
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fadeIn group"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 ${feature.bgColor} rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works - 3 Step Process */}
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3 animate-fadeIn">
              How it works
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 animate-fadeIn" style={{ animationDelay: '100ms' }}>
              Start scraping in minutes with our simple 3-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Define your target',
                description: 'Simply enter the website URL and specify what data you want to extract. Our AI helps you identify the right selectors automatically.',
                icon: Globe
              },
              {
                step: '02',
                title: 'Configure & test',
                description: 'Set up scraping rules, frequency, and data formatting. Test in real-time with our visual editor and see results instantly.',
                icon: Zap
              },
              {
                step: '03',
                title: 'Extract at scale',
                description: 'Deploy your scraper and let our infrastructure handle the rest. Get clean, structured data delivered to your database or API.',
                icon: Database
              }
            ].map((step, index) => {
              const Icon = step.icon
              return (
                <div 
                  key={index}
                  className="relative animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute -top-6 left-0 text-6xl font-bold text-teal-100">
                    {step.step}
                  </div>
                  <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 hover:border-teal-600 hover:shadow-lg transition-all duration-200">
                    <div className="inline-flex p-3 bg-teal-50 rounded-xl mb-4">
                      <Icon className="h-7 w-7 text-teal-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{step.title}</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{step.description}</p>
                  </div>
              </div>
            )
          })}
        </div>
        </div>
      </section>

      {/* Use Cases - Industry Applications */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3 animate-fadeIn">
              Trusted across industries
          </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 animate-fadeIn" style={{ animationDelay: '100ms' }}>
              From e-commerce to market research, teams rely on our platform daily
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'E-commerce',
                description: 'Monitor competitor pricing, product availability, and market trends in real-time.',
                icon: ShoppingCart,
                color: 'text-teal-600',
                bgColor: 'bg-teal-50'
              },
              {
                title: 'Market Research',
                description: 'Gather consumer insights, sentiment data, and competitive intelligence at scale.',
                icon: BarChart3,
                color: 'text-slate-600 dark:text-slate-300',
                bgColor: 'bg-slate-100'
              },
              {
                title: 'Lead Generation',
                description: 'Extract contact information and company data to build targeted prospect lists.',
                icon: Users,
                color: 'text-teal-600',
                bgColor: 'bg-teal-50'
              },
              {
                title: 'Real Estate',
                description: 'Aggregate property listings, pricing data, and market analytics automatically.',
                icon: Building2,
                color: 'text-orange-600',
                bgColor: 'bg-orange-50'
              },
              {
                title: 'Content Aggregation',
                description: 'Collect and curate content from multiple sources for your platform or app.',
                icon: FileText,
                color: 'text-green-600',
                bgColor: 'bg-green-50'
              },
              {
                title: 'SEO Monitoring',
                description: 'Track search rankings, backlinks, and competitor SEO strategies automatically.',
                icon: Search,
                color: 'text-slate-600 dark:text-slate-300',
                bgColor: 'bg-slate-100'
              },
              {
                title: 'Price Intelligence',
                description: 'Stay competitive with automated price monitoring across all major marketplaces.',
                icon: TrendingUp,
                color: 'text-teal-700',
                bgColor: 'bg-teal-100'
              },
              {
                title: 'Academic Research',
                description: 'Collect large-scale datasets for machine learning and academic studies.',
                icon: Database,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50'
              }
            ].map((useCase, index) => {
              const Icon = useCase.icon
              return (
                <div 
                  key={index}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`inline-flex p-3 ${useCase.bgColor} rounded-xl mb-4`}>
                    <Icon className={`h-6 w-6 ${useCase.color}`} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{useCase.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{useCase.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials - Premium Design */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3 animate-fadeIn">
              Trusted by industry leaders
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 animate-fadeIn" style={{ animationDelay: '100ms' }}>
              See what our enterprise customers have to say
            </p>
        </div>
        
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 animate-fadeIn border border-slate-200 dark:border-slate-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

                <p className="text-slate-700 mb-6 leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-full ${testimonial.color} flex items-center justify-center text-white font-bold shadow-md`}>
                    {testimonial.avatar}
                  </div>
              <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{testimonial.name}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 pt-16 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '500+', label: 'Enterprise Clients' },
                { value: '10M+', label: 'Pages Scraped Daily' },
                { value: '99.9%', label: 'Uptime SLA' },
                { value: '24/7', label: 'Expert Support' }
              ].map((stat, index) => (
                <div key={index} className="animate-fadeIn" style={{ animationDelay: `${600 + index * 100}ms` }}>
                  <div className="text-3xl font-bold text-teal-600 mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3 animate-fadeIn">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 animate-fadeIn" style={{ animationDelay: '100ms' }}>
              Start free, scale as you grow. No hidden fees or surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Starter',
                price: 'Free',
                description: 'Perfect for testing and small projects',
                features: [
                  '10K pages/month',
                  'Basic support',
                  'API access',
                  'Standard speed',
                  'Community support'
                ],
                cta: 'Start Free',
                highlighted: false
              },
              {
                name: 'Professional',
                price: '$299',
                period: '/month',
                description: 'For growing businesses',
                features: [
                  '1M pages/month',
                  'Priority support',
                  'Advanced API',
                  'High-speed scraping',
                  'Custom scheduling',
                  'Data exports'
                ],
                cta: 'Start Trial',
                highlighted: true
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                description: 'For large-scale operations',
                features: [
                  'Unlimited pages',
                  'Dedicated support',
                  'Custom infrastructure',
                  'SLA guarantees',
                  'Advanced analytics',
                  'White-label option'
                ],
                cta: 'Contact Sales',
                highlighted: false
              }
            ].map((plan, index) => (
              <div 
                key={index}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-8 ${plan.highlighted ? 'border-2 border-teal-600 shadow-xl relative' : 'border border-slate-200 dark:border-slate-700'} hover:-translate-y-1 transition-all duration-200 animate-fadeIn`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">{plan.price}</span>
                  {plan.period && <span className="text-slate-600 dark:text-slate-300">{plan.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block w-full text-center px-6 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${
                    plan.highlighted 
                      ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:shadow-lg' 
                      : 'bg-slate-100 text-slate-900 dark:text-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3 animate-fadeIn">
              Frequently asked questions
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 animate-fadeIn" style={{ animationDelay: '100ms' }}>
              Everything you need to know about our platform
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Is WebScraperPro really free to start?',
                a: 'Yes! Our Starter plan is completely free with 10K pages per month. No credit card required. You can upgrade anytime as your needs grow.'
              },
              {
                q: 'How does the pricing work?',
                a: 'Pricing is based on the number of pages you scrape per month. You only pay for what you use, and you can upgrade or downgrade at any time.'
              },
              {
                q: 'Is my data secure?',
                a: 'Absolutely. We use bank-level encryption, are SOC 2 certified, and follow strict data protection protocols. Your data is never shared with third parties.'
              },
              {
                q: 'Can I scrape any website?',
                a: 'You can scrape most publicly available websites. We recommend checking each site\'s terms of service and robots.txt file. Our platform respects rate limits automatically.'
              },
              {
                q: 'What kind of support do you offer?',
                a: 'All plans include email support. Professional plans get priority support, and Enterprise customers receive dedicated support with guaranteed response times.'
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! There are no long-term contracts. You can cancel your subscription at any time, and you\'ll only be charged for what you\'ve used.'
              }
            ].map((faq, index) => (
              <details 
                key={index}
                className="group bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:border-teal-600 transition-all duration-200 animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 pr-8">{faq.q}</h3>
                  <div className="flex-shrink-0">
                    <ArrowRight className="h-5 w-5 text-slate-400 group-open:rotate-90 transition-transform duration-200" />
                  </div>
                </summary>
                <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Premium with Gradient */}
      <section className="relative py-24 bg-gradient-to-br from-teal-600 to-teal-800 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900/20 backdrop-blur-sm rounded-full mb-6 animate-fadeIn">
            <Rocket className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">Start extracting data today</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
            Ready to scale your data operations?
          </h2>
          <p className="text-xl text-teal-50 mb-10 max-w-2xl mx-auto animate-fadeIn" style={{ animationDelay: '200ms' }}>
            Join 500+ enterprise teams using WebScraperPro to extract insights from the web at scale
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <Link
            to="/register"
              className="px-10 py-4 bg-white dark:bg-slate-900 text-teal-600 font-bold rounded-xl hover:bg-slate-50 dark:bg-slate-800 transition-all duration-200 hover:shadow-2xl hover:scale-105 active:scale-95 inline-flex items-center justify-center gap-2"
          >
              <Rocket className="h-5 w-5" />
              Start Free Trial
          </Link>
            <button className="px-10 py-4 bg-teal-800 text-white font-bold rounded-xl hover:bg-teal-900 transition-all duration-200 hover:shadow-2xl hover:scale-105 active:scale-95 border-2 border-white/20 inline-flex items-center justify-center gap-2">
              <Play className="h-5 w-5" />
              Watch Demo
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-teal-50 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Premium */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
            {/* Company Info */}
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  WebScraper<span className="bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent">Pro</span>
                </span>
              </Link>
              <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-sm">
                Enterprise-grade web scraping platform trusted by Fortune 500 companies worldwide. Extract data at scale with ease.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['bg-teal-600', 'bg-teal-700', 'bg-teal-600', 'bg-indigo-600'].map((color, i) => (
                    <div key={i} className={`h-8 w-8 rounded-full ${color} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-slate-100">500+</span> enterprise clients
                </p>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Product</h3>
              <ul className="space-y-3 text-sm">
                {[
                  { to: '/register', label: 'Start Free' },
                  { to: '#', label: 'Pricing' },
                  { to: '#', label: 'Features' },
                  { to: '#', label: 'Documentation' }
                ].map((link, i) => (
                  <li key={i}>
                    <Link to={link.to} className="text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors inline-flex items-center gap-2 group">
                      {link.label}
                      <ArrowRight className="h-3 w-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Resources</h3>
              <ul className="space-y-3 text-sm">
                {[
                  { label: 'API Docs', href: '#' },
                  { label: 'Tutorials', href: '#' },
                  { label: 'Blog', href: '#' },
                  { label: 'Support', href: '#' }
                ].map((link, i) => (
                  <li key={i}>
                    <a href={link.href} className="text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors inline-flex items-center gap-2 group">
                      {link.label}
                      <ArrowRight className="h-3 w-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Company</h3>
              <ul className="space-y-3 text-sm">
                {[
                  { label: 'About', href: '#' },
                  { label: 'Careers', href: '#' },
                  { label: 'Privacy', href: '#' },
                  { label: 'Terms', href: '#' }
                ].map((link, i) => (
                  <li key={i}>
                    <a href={link.href} className="text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors inline-flex items-center gap-2 group">
                      {link.label}
                      <ArrowRight className="h-3 w-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              © {new Date().getFullYear()} WebScraperPro. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-teal-600" />
                <span className="text-slate-600 dark:text-slate-300">SOC 2 Certified</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-teal-600" />
                <span className="text-slate-600 dark:text-slate-300">99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-teal-600" />
                <span className="text-slate-600 dark:text-slate-300">Enterprise Ready</span>
              </div>
            </div>
          </div>
      </div>
      </footer>
    </div>
  )
}

export default Landing