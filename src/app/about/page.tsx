"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Target, 
  Heart,
  Phone,
  Shield,
  Globe,
  Car,
  Lightbulb,
  Rocket
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import PublicLayout from "@/components/layouts/PublicLayout";

export default function AboutPage() {
  const { isDarkMode } = useTheme();


  const values = [
    {
      icon: Heart,
      title: "Dealer-First",
      description: "Every decision we make is centered around what's best for our dealer partners. Your success is our success."
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description: "We handle your business-critical data with the highest security standards and complete transparency."
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Continuously pushing boundaries to bring cutting-edge solutions that keep you ahead of the competition."
    },
    {
      icon: Users,
      title: "Partnership",
      description: "We're not just a vendor – we're your long-term technology partner committed to your growth."
    }
  ];


  const stats = [
    { number: "10,000+", label: "Active Dealers", icon: Users, growth: "+25% this year" },
    { number: "500K+", label: "Vehicles Managed", icon: Car, growth: "Daily transactions" },
    { number: "50+", label: "Countries Served", icon: Globe, growth: "Global presence" },
    { number: "99.9%", label: "Platform Uptime", icon: Shield, growth: "24/7 reliability" }
  ];


  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <Image 
            src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            alt="Team collaboration" 
            fill
            className="object-cover scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-blue-900/70"></div>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Empowering Dealers to
            <span className="block bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Drive Success
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-200 leading-relaxed mb-8">
            We&apos;re on a mission to revolutionize the automotive retail industry through innovative technology and unwavering commitment to dealer success.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/contact">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4"
              >
                <Phone className="w-5 h-5 mr-2" />
                Get in Touch
              </Button>
            </Link>
            
            <Link href="/join">
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 hover:border-white/70 font-semibold px-8 py-4 backdrop-blur-sm transition-all duration-200"
              >
                Join Our Platform
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className={`text-center transition-all duration-300 hover:scale-105 border-0 group ${
                isDarkMode 
                  ? 'bg-slate-800/50 hover:bg-slate-800' 
                  : 'bg-white shadow-lg hover:shadow-xl'
              }`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`text-3xl font-bold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {stat.number}
                  </div>
                  <div className={`text-sm font-medium mb-1 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {stat.label}
                  </div>
                  <div className={`text-xs ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {stat.growth}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20 lg:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Mission & Vision
            </h2>
            <p className={`text-lg leading-relaxed max-w-3xl mx-auto ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Driving the future of automotive retail through innovation, partnership, and unwavering commitment to dealer success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
            <Card className={`transition-all duration-300 hover:scale-105 border-0 ${
              isDarkMode 
                ? 'bg-slate-800/50' 
                : 'bg-white shadow-lg'
            }`}>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <CardTitle className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className={`text-center text-lg leading-relaxed ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  To empower automotive dealers with innovative technology solutions that streamline operations, 
                  boost sales, and enhance customer experiences, enabling them to thrive in an evolving marketplace.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className={`transition-all duration-300 hover:scale-105 border-0 ${
              isDarkMode 
                ? 'bg-slate-800/50' 
                : 'bg-white shadow-lg'
            }`}>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-white" />
                </div>
                <CardTitle className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Our Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className={`text-center text-lg leading-relaxed ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  To become the global standard for dealership management platforms, fostering a connected 
                  automotive ecosystem where dealers can focus on what they do best – serving customers.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className={`py-16 sm:py-20 lg:py-24 px-4 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Our Values
            </h2>
            <p className={`text-lg leading-relaxed max-w-3xl mx-auto ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              The principles that guide everything we do and shape our relationships with dealers, partners, and team members.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((value, index) => (
              <Card key={index} className={`group text-center transition-all duration-300 hover:scale-105 border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50 hover:bg-slate-800' 
                  : 'bg-white hover:bg-slate-50 shadow-lg'
              }`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {value.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className={`text-3xl sm:text-4xl font-bold mb-6 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Ready to Join Our Mission?
          </h2>
          <p className={`text-lg leading-relaxed mb-8 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Be part of the automotive retail revolution. Let&apos;s work together to transform your dealership operations.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/join">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4"
              >
                Start Your Journey
                <Rocket className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <Link href="/contact">
              <Button 
                variant="outline" 
                size="lg"
                className={`font-semibold px-8 py-4 ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white' 
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Phone className="w-5 h-5 mr-2" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
} 