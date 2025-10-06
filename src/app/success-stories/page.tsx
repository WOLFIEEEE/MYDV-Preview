"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  PoundSterling, 
  Clock,
  Star,
  ArrowRight,
  Quote,
  Target,
  CheckCircle,
  Play
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import PublicLayout from "@/components/layouts/PublicLayout";

export default function SuccessStoriesPage() {
  const { isDarkMode } = useTheme();

  const successStories = [
    {
      company: "Premium Auto Group",
      location: "Los Angeles, CA",
      size: "50+ vehicles",
      contact: "Sarah Johnson, General Manager",
      image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      results: {
        salesIncrease: "45%",
        timesSaved: "15 hours/week",
        efficiency: "60%",
        roi: "320%"
      },
      story: "After implementing MydealershipView, we completely transformed our operations. The inventory management system helped us reduce overstocking by 30% while the CRM features increased our customer follow-up rates dramatically.",
      quote: "MydealershipView didn't just change our business - it revolutionized it. We're now the top-performing dealership in our region.",
      challenges: ["Manual inventory tracking", "Poor lead follow-up", "Inefficient processes"],
      solutions: ["Automated inventory alerts", "CRM automation", "Streamlined workflows"],
      timeline: "Results achieved within 3 months"
    },
    {
      company: "Metro Motors",
      location: "Chicago, IL",
      size: "100+ vehicles",
      contact: "Michael Chen, Owner",
      image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      results: {
        salesIncrease: "38%",
        timesSaved: "20 hours/week",
        efficiency: "55%",
        roi: "280%"
      },
      story: "The analytics dashboard gave us insights we never knew we needed. Understanding our customer behavior patterns helped us optimize our sales process and increase conversion rates significantly.",
      quote: "The ROI was apparent within the first month. MydealershipView paid for itself many times over.",
      challenges: ["Limited business insights", "Manual reporting", "Lost opportunities"],
      solutions: ["Real-time analytics", "Automated reports", "Lead tracking"],
      timeline: "ROI achieved within 1 month"
    },
    {
      company: "Elite Car Center",
      location: "Miami, FL",
      size: "75+ vehicles",
      contact: "Lisa Rodriguez, Sales Director",
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      results: {
        salesIncrease: "52%",
        timesSaved: "18 hours/week",
        efficiency: "65%",
        roi: "410%"
      },
      story: "Customer management became so much easier with MydealershipView. Our follow-up rates improved by 70%, and we can now track every interaction with potential buyers. The result? More closed deals and happier customers.",
      quote: "Our customers notice the difference. We're more responsive, more organized, and more professional.",
      challenges: ["Poor customer tracking", "Missed follow-ups", "Disorganized processes"],
      solutions: ["Comprehensive CRM", "Automated reminders", "Customer journey tracking"],
      timeline: "Major improvements within 6 weeks"
    }
  ];

  const industryStats = [
    { 
      metric: "Average Sales Increase", 
      value: "42%", 
      description: "Dealers see significant sales growth within 6 months",
      icon: TrendingUp,
      trend: "+8% this quarter",
      color: "emerald"
    },
    { 
      metric: "Time Saved Weekly", 
      value: "18hrs", 
      description: "Automation reduces manual administrative work",
      icon: Clock,
      trend: "Per dealership",
      color: "blue"
    },
    { 
      metric: "Customer Satisfaction", 
      value: "94%", 
      description: "Improved service leads to happier customers",
      icon: Users,
      trend: "Industry leading",
      color: "purple"
    },
    { 
      metric: "ROI Achievement", 
      value: "3 months", 
      description: "Average time to see positive return on investment",
      icon: PoundSterling,
      trend: "Faster than expected",
      color: "orange"
    }
  ];

  const testimonialHighlights = [
    {
      quote: "MydealershipView transformed our entire operation. We're more efficient, more profitable, and our customers are happier.",
      author: "David Thompson",
      role: "Owner, Thompson Auto Sales",
      metric: "+65% sales growth"
    },
    {
      quote: "The inventory management alone saved us thousands in carrying costs. The ROI was incredible.",
      author: "Jennifer Kim",
      role: "Manager, City Car Lot",
      metric: "30% cost reduction"
    },
    {
      quote: "Customer relationships improved dramatically. We now track every interaction and never miss a follow-up.",
      author: "Robert Martinez",
      role: "Sales Director, Martinez Motors",
      metric: "80% better follow-up"
    }
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image 
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            alt="Successful dealership" 
            fill
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-blue-900/70"></div>
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Real Results from
            <span className="block bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Real Dealers
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-200 leading-relaxed mb-8">
            Discover how dealerships across the country are achieving remarkable growth and efficiency with MydealershipView.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/join">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4"
              >
                Start Your Success Story
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-white/50 text-white bg-white/10 hover:bg-white/20 hover:border-white/70 font-semibold px-8 py-4 backdrop-blur-sm transition-all duration-200"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Video Stories
            </Button>
          </div>
        </div>
      </section>

      {/* Industry Stats */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Proven Results Across the Industry
            </h2>
            <p className={`text-lg leading-relaxed ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Average improvements our dealers experience within the first year
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industryStats.map((stat, index) => (
              <Card key={index} className={`text-center transition-all duration-300 hover:scale-105 border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white shadow-lg'
              }`}>
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 ${
                    stat.color === 'emerald' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                    stat.color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                    stat.color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                    'bg-gradient-to-br from-orange-500 to-orange-600'
                  }`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className={`text-3xl font-bold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {stat.value}
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {stat.metric}
                  </h3>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full mb-2 inline-block ${
                    stat.color === 'emerald' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') :
                    stat.color === 'blue' ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700') :
                    stat.color === 'purple' ? (isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700') :
                    (isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700')
                  }`}>
                    {stat.trend}
                  </div>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Success Stories */}
      <section className={`py-16 sm:py-20 lg:py-24 px-4 ${
        isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50'
      }`}>
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Customer Success Stories
            </h2>
            <p className={`text-lg leading-relaxed max-w-3xl mx-auto ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              See how dealerships like yours achieved remarkable growth and efficiency with MydealershipView
            </p>
          </div>

          <div className="space-y-12 sm:space-y-16">
            {successStories.map((story, index) => (
              <Card key={index} className={`overflow-hidden border-0 shadow-xl ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white'
              }`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Image */}
                  <div className="relative h-64 lg:h-auto">
                    <Image 
                      src={story.image} 
                      alt={story.company} 
                      fill
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-white font-semibold">{story.company}</p>
                      <p className="text-gray-200 text-sm">{story.location}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 lg:p-8">
                    <div className="mb-6">
                      <h3 className={`text-2xl font-bold mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {story.company}
                      </h3>
                      <p className={`text-sm mb-4 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`}>
                        {story.contact} • {story.size} • {story.timeline}
                      </p>
                      
                      {/* Results Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className={`text-center p-3 rounded-lg ${
                          isDarkMode ? 'bg-slate-700/50' : 'bg-blue-50'
                        }`}>
                          <div className="text-2xl font-bold text-emerald-500">{story.results.salesIncrease}</div>
                          <div className="text-xs text-slate-500">Sales Increase</div>
                        </div>
                        <div className={`text-center p-3 rounded-lg ${
                          isDarkMode ? 'bg-slate-700/50' : 'bg-blue-50'
                        }`}>
                          <div className="text-2xl font-bold text-blue-500">{story.results.timesSaved}</div>
                          <div className="text-xs text-slate-500">Time Saved</div>
                        </div>
                        <div className={`text-center p-3 rounded-lg ${
                          isDarkMode ? 'bg-slate-700/50' : 'bg-blue-50'
                        }`}>
                          <div className="text-2xl font-bold text-purple-500">{story.results.efficiency}</div>
                          <div className="text-xs text-slate-500">Efficiency Gain</div>
                        </div>
                        <div className={`text-center p-3 rounded-lg ${
                          isDarkMode ? 'bg-slate-700/50' : 'bg-blue-50'
                        }`}>
                          <div className="text-2xl font-bold text-orange-500">{story.results.roi}</div>
                          <div className="text-xs text-slate-500">ROI</div>
                        </div>
                      </div>
                    </div>

                    <p className={`text-base leading-relaxed mb-6 ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      {story.story}
                    </p>

                    <div className={`p-4 rounded-lg border-l-4 border-blue-500 mb-6 ${
                      isDarkMode ? 'bg-slate-700/30' : 'bg-blue-50'
                    }`}>
                      <Quote className="w-6 h-6 text-blue-500 mb-2" />
                      <p className={`italic text-lg ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        &quot;{story.quote}&quot;
                      </p>
                      <p className={`text-sm mt-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-500'
                      }`}>
                        — {story.contact}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className={`font-semibold mb-3 flex items-center ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          <Target className="w-4 h-4 mr-2 text-red-500" />
                          Challenges
                        </h4>
                        <ul className="space-y-2">
                          {story.challenges.map((challenge, idx) => (
                            <li key={idx} className={`text-sm flex items-start space-x-2 ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              <span className="text-red-500 mt-0.5">•</span>
                              <span>{challenge}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className={`font-semibold mb-3 flex items-center ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                          Solutions
                        </h4>
                        <ul className="space-y-2">
                          {story.solutions.map((solution, idx) => (
                            <li key={idx} className={`text-sm flex items-start space-x-2 ${
                              isDarkMode ? 'text-white' : 'text-slate-600'
                            }`}>
                              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <span>{solution}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Highlights */}
      <section className="py-16 sm:py-20 lg:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              What Our Customers Say
            </h2>
            <p className={`text-lg leading-relaxed ${
              isDarkMode ? 'text-white' : 'text-slate-600'
            }`}>
              Real feedback from dealerships achieving real results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonialHighlights.map((testimonial, index) => (
              <Card key={index} className={`text-center transition-all duration-300 hover:scale-105 border-0 ${
                isDarkMode 
                  ? 'bg-slate-800/50' 
                  : 'bg-white shadow-lg'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 justify-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className={`text-base leading-relaxed mb-4 italic ${
                    isDarkMode ? 'text-white' : 'text-slate-600'
                  }`}>
                    &quot;{testimonial.quote}&quot;
                  </p>
                  <div className="mb-4">
                    <h4 className={`font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {testimonial.author}
                    </h4>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-500'
                    }`}>
                      {testimonial.role}
                    </p>
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {testimonial.metric}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-16 sm:py-20 lg:py-24 px-4 ${
        isDarkMode ? 'bg-slate-800/50' : 'bg-blue-50'
      }`}>
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className={`text-3xl sm:text-4xl font-bold mb-6 ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Ready to Write Your Success Story?
          </h2>
          <p className={`text-lg leading-relaxed mb-8 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Join hundreds of successful dealerships and start achieving remarkable results with MydealershipView.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/join">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4"
              >
                Start Free Trial Today
                <ArrowRight className="w-5 h-5 ml-2" />
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
                Schedule Demo
              </Button>
            </Link>
          </div>

          <p className={`text-sm mt-6 ${
            isDarkMode ? 'text-white' : 'text-slate-500'
          }`}>
            No credit card required • 30-day free trial • Join successful dealers nationwide
          </p>
        </div>
      </section>
    </PublicLayout>
  );
} 