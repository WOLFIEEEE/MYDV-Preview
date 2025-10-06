"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Settings,
  ClipboardCheck,
  UserPlus,
  Trash2,
  AlertTriangle,
  Users
} from "lucide-react";

interface CustomChecklistQuestion {
  id: string;
  question: string;
  type: 'text' | 'boolean' | 'number' | 'select' | 'multiselect' | 'yes_no' | 'dropdown';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
  category?: string;
  order?: number;
}

interface Dealer {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminSettings() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("checklist");
  
  // Checklist questions state
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");
  const [customQuestions, setCustomQuestions] = useState<CustomChecklistQuestion[]>([]);
  const [customQuestionsEnabled, setCustomQuestionsEnabled] = useState(true);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [isSavingCustomQuestionsSetting, setIsSavingCustomQuestionsSetting] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  
  // New question form state
  const [newQuestion, setNewQuestion] = useState<{
    question: string;
    type: 'text' | 'boolean' | 'number' | 'select' | 'multiselect' | 'yes_no' | 'dropdown';
    required: boolean;
    options: string[];
  }>({
    question: '',
    type: 'text',
    required: false,
    options: []
  });
  const [newQuestionOption, setNewQuestionOption] = useState('');

  // Load dealers on component mount
  useEffect(() => {
    loadDealers();
  }, []);

  // Load custom questions when dealer is selected
  useEffect(() => {
    if (selectedDealerId) {
      loadCustomQuestions();
    }
  }, [selectedDealerId]);

  const loadDealers = async () => {
    try {
      const response = await fetch('/api/admin/checklist-questions', {
        method: 'PUT'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setDealers(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading dealers:', error);
    }
  };

  const loadCustomQuestions = async () => {
    if (!selectedDealerId) return;
    
    try {
      const response = await fetch(`/api/admin/checklist-questions?dealerId=${selectedDealerId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setCustomQuestions(result.data.questions || []);
          setCustomQuestionsEnabled(result.data.customQuestionsEnabled !== false);
        }
      }
    } catch (error) {
      console.error('Error loading custom questions:', error);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.question.trim() || !selectedDealerId) return;

    const questionToAdd: CustomChecklistQuestion = {
      id: Date.now().toString(),
      question: newQuestion.question.trim(),
      type: newQuestion.type,
      required: newQuestion.required,
      ...(newQuestion.options.length > 0 && { options: newQuestion.options })
    };

    const updatedQuestions = [...customQuestions, questionToAdd];
    
    try {
      setIsSavingQuestions(true);
      
      const response = await fetch('/api/admin/checklist-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealerId: selectedDealerId,
          questions: updatedQuestions
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCustomQuestions(updatedQuestions);
        setShowAddQuestionModal(false);
        setNewQuestion({
          question: '',
          type: 'text',
          required: false,
          options: []
        });
        setNewQuestionOption('');
        alert('Question added successfully!');
      } else {
        alert(`Failed to add question: ${data.message}`);
      }
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Error adding question. Please try again.');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedDealerId) return;
    
    const updatedQuestions = customQuestions.filter(q => q.id !== questionId);
    
    try {
      setIsSavingQuestions(true);
      
      const response = await fetch('/api/admin/checklist-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealerId: selectedDealerId,
          questions: updatedQuestions
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCustomQuestions(updatedQuestions);
        alert('Question deleted successfully!');
      } else {
        alert(`Failed to delete question: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Error deleting question. Please try again.');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const handleCustomQuestionsToggle = async (enabled: boolean) => {
    if (!selectedDealerId) return;
    
    try {
      setIsSavingCustomQuestionsSetting(true);
      
      const response = await fetch('/api/admin/checklist-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealerId: selectedDealerId,
          customQuestionsEnabled: enabled
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCustomQuestionsEnabled(enabled);
        alert(`Custom checklist questions ${enabled ? 'enabled' : 'disabled'} successfully!`);
      } else {
        alert(`Failed to ${enabled ? 'enable' : 'disable'} custom questions: ${data.message}`);
      }
    } catch (error) {
      console.error('Error toggling custom questions:', error);
      alert('Error updating settings. Please try again.');
    } finally {
      setIsSavingCustomQuestionsSetting(false);
    }
  };

  const addNewQuestionOption = () => {
    if (newQuestionOption.trim() && !newQuestion.options.includes(newQuestionOption.trim())) {
      setNewQuestion(prev => ({
        ...prev,
        options: [...prev.options, newQuestionOption.trim()]
      }));
      setNewQuestionOption('');
    }
  };

  const removeQuestionOption = (optionToRemove: string) => {
    setNewQuestion(prev => ({
      ...prev,
      options: prev.options.filter(option => option !== optionToRemove)
    }));
  };

  // Settings tabs configuration
  const settingsTabs = [
    {
      id: "checklist",
      label: "Checklist Questions",
      description: "Manage vehicle checklist questions for all dealers",
      icon: ClipboardCheck,
      iconBg: "bg-gradient-to-br from-green-500 to-green-600",
      iconColor: "text-white"
    }
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-700 dark:text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">
              Admin Settings
            </h1>
            <p className="text-sm text-slate-600 dark:text-white">
              Manage administrative preferences and system configuration
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex space-x-8">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-white dark:hover:text-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg mr-3 transition-all duration-300 ${
                    activeTab === tab.id 
                      ? tab.iconBg 
                      : 'bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      activeTab === tab.id 
                        ? tab.iconColor 
                        : 'text-slate-600 dark:text-white'
                    }`} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{tab.label}</div>
                    <div className="text-xs text-slate-500 dark:text-white">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {/* Checklist Questions Tab */}
        {activeTab === "checklist" && (
          <div className="space-y-8">
            {/* Dealer Selection */}
            <Card className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-800 dark:via-slate-700/50 dark:to-blue-900/10 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                      Select Dealer
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                      Choose a dealer to manage their custom checklist questions and settings
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      {dealers.length} dealers
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Users className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <select
                    value={selectedDealerId}
                    onChange={(e) => setSelectedDealerId(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm hover:border-blue-300 dark:hover:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-base font-medium appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px'
                    }}
                  >
                    <option value="" className="text-slate-500">
                      {dealers.length === 0 ? 'No dealers available...' : 'Choose a dealer to manage...'}
                    </option>
                    {dealers.map((dealer) => (
                      <option key={dealer.id} value={dealer.id} className="py-2">
                        {dealer.name} • {dealer.email}
                      </option>
                    ))}
                  </select>
                  {selectedDealerId && (
                    <div className="absolute inset-y-0 right-12 flex items-center pointer-events-none">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    </div>
                  )}
                </div>
                
                {dealers.length === 0 && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          No dealers found
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                          Dealers will appear here once they join the platform
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedDealerId && (
                  <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                          Dealer Selected
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                          {dealers.find(d => d.id === selectedDealerId)?.name} is now active for management
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedDealerId && (
              <>
                {/* Custom Questions Enable/Disable Toggle */}
                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                          <ClipboardCheck className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            Custom Checklist Questions
                          </h3>
                          <p className="text-slate-600 dark:text-white">
                            {customQuestionsEnabled 
                              ? 'Custom questions are currently enabled for this dealer'
                              : 'Custom questions are currently disabled for this dealer'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${customQuestionsEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-white'}`}>
                          {customQuestionsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          onClick={() => handleCustomQuestionsToggle(!customQuestionsEnabled)}
                          disabled={isSavingCustomQuestionsSetting}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                            customQuestionsEnabled 
                              ? 'bg-emerald-600' 
                              : 'bg-slate-300 dark:bg-slate-600'
                          } ${isSavingCustomQuestionsSetting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              customQuestionsEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    {!customQuestionsEnabled && (
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                              Custom Questions Disabled
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              When disabled, custom questions will not appear in checklist forms for this dealer. 
                              The standard checklist fields will still be available.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Checklist Questions Header */}
                <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-xl">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
                          <ClipboardCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                            Manage Custom Questions
                          </CardTitle>
                          <CardDescription className="text-slate-600 dark:text-white mt-1">
                            Add and manage custom questions for the selected dealer's vehicle inspection checklist
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowAddQuestionModal(true)}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Questions List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Custom Questions</h3>
                    <p className="text-sm text-slate-500 dark:text-white">{customQuestions.length} questions</p>
                  </div>
                  
                  {customQuestions.length === 0 ? (
                    <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-md">
                      <CardContent className="p-12 text-center">
                        <ClipboardCheck className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                          No Custom Questions Yet
                        </h3>
                        <p className="text-slate-600 dark:text-white mb-6">
                          Add custom questions to enhance this dealer's vehicle inspection checklist
                        </p>
                        <Button
                          onClick={() => setShowAddQuestionModal(true)}
                          className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add First Question
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    customQuestions.map((question, index) => (
                      <Card key={question.id} className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border-0 shadow-md hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-sm font-semibold text-slate-500 dark:text-white">
                                  Q{index + 1}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  question.type === 'dropdown' 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : question.type === 'yes_no'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-white'
                                }`}>
                                  {question.type === 'dropdown' ? 'Dropdown' : question.type === 'yes_no' ? 'Yes/No' : 'Text'}
                                </span>
                                {question.required && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    Required
                                  </span>
                                )}
                              </div>
                              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                {question.question}
                              </h4>
                              {question.options && (
                                <div className="flex flex-wrap gap-2">
                                  {question.options.map((option, optIndex) => (
                                    <span key={optIndex} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white text-sm rounded">
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => handleDeleteQuestion(question.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 dark:border-red-600"
                              disabled={isSavingQuestions}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add New Question</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
                  Question
                </label>
                <input
                  type="text"
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  placeholder="Enter your question..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
                  Question Type
                </label>
                <select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion(prev => ({ 
                    ...prev, 
                    type: e.target.value as any,
                    options: e.target.value === 'dropdown' ? prev.options : []
                  }))}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="text">Text</option>
                  <option value="yes_no">Yes/No</option>
                  <option value="dropdown">Dropdown</option>
                </select>
              </div>

              {newQuestion.type === 'dropdown' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
                    Options
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newQuestionOption}
                      onChange={(e) => setNewQuestionOption(e.target.value)}
                      className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="Add option..."
                    />
                    <Button
                      onClick={addNewQuestionOption}
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newQuestion.options.map((option, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white text-sm rounded flex items-center gap-1"
                      >
                        {option}
                        <button
                          onClick={() => removeQuestionOption(option)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="required"
                  checked={newQuestion.required}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, required: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="required" className="text-sm text-slate-700 dark:text-white">
                  Required field
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => setShowAddQuestionModal(false)}
                variant="outline"
                disabled={isSavingQuestions}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddQuestion}
                disabled={isSavingQuestions || !newQuestion.question.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSavingQuestions ? 'Adding...' : 'Add Question'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

