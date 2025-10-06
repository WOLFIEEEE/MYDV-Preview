"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Target, 
  Award, 
  Heart,
  Linkedin,
  Twitter,
  Mail,
  // MapPin, // Removed unused
  Phone,
  // Calendar, // Removed unused
  TrendingUp,
  Shield,
  Globe,
  Car,
  Lightbulb,
  Rocket,
  Star
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import PublicLayout from "@/components/layouts/PublicLayout";

export default function AboutPage() {
  const { isDarkMode } = useTheme();

  const team = [
    {
      name: "Sarah Chen",
      role: "CEO & Founder",
      bio: "Former automotive industry executive with 15+ years experience. Led digital transformation initiatives at major dealership groups.",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      social: {
        linkedin: "#",
        twitter: "#",
        email: "sarah@mydealershipview.com"
      }
    },
    {
      name: "Michael Rodriguez",
      role: "CTO",
      bio: "Tech visionary with expertise in enterprise software. Previously built scalable platforms serving Fortune 500 companies.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      social: {
        linkedin: "#",
        twitter: "#",
        email: "michael@mydealershipview.com"
      }
    },
    {
      name: "Emma Thompson",
      role: "Head of Customer Success",
      bio: "Passionate about dealer success with deep understanding of automotive retail operations and customer journey optimization.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      social: {
        linkedin: "#",
        twitter: "#",
        email: "emma@mydealershipview.com"
      }
    },
    {
      name: "David Kim",
      role: "Head of Product",
      bio: "Product strategist focused on creating intuitive dealer experiences. Expert in UX design and automotive industry workflows.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
      social: {
        linkedin: "#",
        twitter: "#",
        email: "david@mydealershipview.com"
      }
    }
  ];

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

  const milestones = [
    {
      year: "2019",
      title: "Company Founded",
      description: "Started with a vision to transform dealership operations through technology."
    },
    {
      year: "2020",
      title: "First 100 Dealers",
      description: "Reached our first major milestone with 100 active dealerships on the platform."
    },
    {
      year: "2021",
      title: "Series A Funding",
      description: "Secured £15M in Series A funding to accelerate product development and expansion."
    },
    {
      year: "2022",
      title: "International Expansion",
      description: "Expanded operations to serve dealers across North America and Europe."
    },
    {
      year: "2023",
      title: "AI Integration",
      description: "Launched AI-powered analytics and predictive insights for inventory management."
    },
    {
      year: "2024",
      title: "10,000+ Dealers",
      description: "Serving over 10,000 dealers worldwide with 500,000+ vehicles under management."
    }
  ];

  const stats = [
    { number: "10,000+", label: "Active Dealers", icon: Users, growth: "+25% this year" },
    { number: "500K+", label: "Vehicles Managed", icon: Car, growth: "Daily transactions" },
    { number: "50+", label: "Countries Served", icon: Globe, growth: "Global presence" },
    { number: "99.9%", label: "Platform Uptime", icon: Shield, growth: "24/7 reliability" }
  ];

  const achievements = [
    {
      year: "2024",
      title: "Industry Leader Award",
      description: "Recognized as the #1 Dealership Management Platform by AutoTech Awards",
      icon: Award
    },
    {
      year: "2023",
      title: "£40M+ Customer Benefits",
      description: "Our clients achieved over £40 million in combined operational savings",
      icon: TrendingUp
    },
    {
      year: "2022",
      title: "Global Expansion",
      description: "Successfully expanded to serve dealerships across 50+ countries worldwide",
      icon: Globe
    }
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

      {/* Achievements Section - NEW */}
      <section className={`py-16 px-4 ${
        isDarkMode ? 'bg-slate-800/20' : 'bg-blue-50/50'
      }`}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Recent Achievements
            </h2>
            <p className={`text-lg leading-relaxed ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Milestones that showcase our commitment to excellence and innovation
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {achievements.map((achievement, index) => (
              <Card key={index} className={`border-0 transition-all duration-300 hover:scale-105 ${
                isDarkMode ? 'bg-slate-800/50' : 'bg-white shadow-lg'
              }`}>
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                    isDarkMode ? 'bg-gradient-to-br from-blue-500/20 to-purple-600/20' : 'bg-gradient-to-br from-blue-50 to-purple-50'
                  }`}>
                    <achievement.icon className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className={`text-sm font-semibold mb-2 px-3 py-1 rounded-full inline-block ${
                    isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {achievement.year}
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {achievement.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {achievement.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className={`py-16 sm:py-20 lg:py-24 px-4 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className={`text-3xl sm:text-4xl font-bold mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Our Story
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Founded in 2019 by automotive industry veterans, MydealershipView was born from a simple observation: 
                dealerships were struggling with outdated technology that hindered rather than helped their operations.
              </p>
              <p className={`text-lg leading-relaxed mb-6 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Having worked in various roles across the automotive retail ecosystem, our founders understood 
                the daily challenges dealers face – from inventory management to customer relationship building.
              </p>
              <p className={`text-lg leading-relaxed mb-8 ${
                isDarkMode ? 'text-white' : 'text-slate-600'
              }`}>
                Today, we&apos;re proud to serve over 10,000 dealers worldwide, helping them streamline operations, 
                increase sales, and deliver exceptional customer experiences.
              </p>
              
              <Link href="/success-stories">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold"
                >
                  Read Success Stories
                  <Star className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-2xl">
                <Image 
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                  alt="Team meeting" 
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Rocket className="w-12 h-12 text-white" />
              </div>
            </div>
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

      {/* Timeline */}
      <section className="py-16 sm:py-20 lg:py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Our Journey
            </h2>
            <p className={`text-lg leading-relaxed ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Key milestones that have shaped our growth and evolution
            </p>
          </div>

          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {milestone.year.slice(-2)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {milestone.year}
                    </span>
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {milestone.title}
                  </h3>
                  <p className={`leading-relaxed ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className={`py-16 sm:py-20 lg:py-24 px-4 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Meet Our Leadership Team
            </h2>
            <p className={`text-lg leading-relaxed max-w-3xl mx-auto ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Experienced leaders with deep automotive industry knowledge and technology expertise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className={`group transition-all duration-300 hover:scale-105 border-0 overflow-hidden ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white shadow-lg'
              }`}>
                <div className="relative h-64 overflow-hidden">
                  <Image 
                    src={member.image} 
                    alt={member.name} 
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
                
                <CardContent className="p-6">
                  <h3 className={`text-xl font-bold mb-1 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {member.name}
                  </h3>
                  <p className={`text-sm font-semibold mb-3 ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {member.role}
                  </p>
                  <p className={`text-sm leading-relaxed mb-4 ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {member.bio}
                  </p>
                  
                  <div className="flex space-x-3">
                    <Link 
                      href={member.social.linkedin}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isDarkMode 
                          ? 'bg-slate-700 text-slate-400 hover:bg-blue-600 hover:text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      <Linkedin className="w-4 h-4" />
                    </Link>
                    <Link 
                      href={member.social.twitter}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isDarkMode 
                          ? 'bg-slate-700 text-slate-400 hover:bg-blue-400 hover:text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-blue-400 hover:text-white'
                      }`}
                    >
                      <Twitter className="w-4 h-4" />
                    </Link>
                    <Link 
                      href={`mailto:${member.social.email}`}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isDarkMode 
                          ? 'bg-slate-700 text-slate-400 hover:bg-emerald-600 hover:text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-600 hover:text-white'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                    </Link>
                  </div>
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