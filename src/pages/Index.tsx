import { Link } from 'react-router-dom';
import { Bot, ArrowRight, Zap, Shield, MessageSquare, FileText, Globe, Smartphone, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: 'AI-Powered Agents',
    description: 'Create intelligent conversational agents trained on your data',
  },
  {
    icon: FileText,
    title: 'Document Training',
    description: 'Upload PDFs, docs, and URLs to build your knowledge base',
  },
  {
    icon: Globe,
    title: 'Web Widget',
    description: 'Embed a customizable chat widget on any website',
  },
  {
    icon: Smartphone,
    title: 'WhatsApp Integration',
    description: 'Connect your agents to WhatsApp for mobile support',
  },
  {
    icon: Zap,
    title: 'Credit-Based Usage',
    description: 'Pay only for what you use with transparent pricing',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption',
  },
];

const benefits = [
  '24/7 automated customer support',
  'Reduce response times by 80%',
  'Scale without hiring more staff',
  'Capture and qualify leads automatically',
  'Multilingual support out of the box',
  'Detailed analytics and insights',
];

const Index = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">AgentHub</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link to="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link to="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Link to="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            🚀 Now with GPT-4 and Claude support
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Build AI Agents That
            <span className="text-primary"> Actually Understand </span>
            Your Business
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create conversational AI agents trained on your documents.
            Deploy to web, WhatsApp, and more in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Demo
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 50 free credits
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">10K+</p>
              <p className="text-muted-foreground">Active Agents</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">50M+</p>
              <p className="text-muted-foreground">Messages Handled</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">99.9%</p>
              <p className="text-muted-foreground">Uptime</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary">2,500+</p>
              <p className="text-muted-foreground">Happy Customers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Build AI Agents
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A complete platform for creating, training, and deploying conversational AI
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="bg-card hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Transform Your Customer Experience
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of businesses using AI agents to provide instant,
                personalized support at scale.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/30 p-8 flex items-center justify-center">
                <MessageSquare className="w-32 h-32 text-primary/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Build Your First AI Agent?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Get started for free and deploy your first conversational agent in under 5 minutes.
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Building Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">AgentHub</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Documentation</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Support</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 AgentHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
