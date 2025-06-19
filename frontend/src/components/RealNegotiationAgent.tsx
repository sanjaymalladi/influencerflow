import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Handshake, Zap } from 'lucide-react';

import CompleteNegotiationSimulator from './CompleteNegotiationSimulator';

interface RealNegotiationAgentProps {
  initialContact?: {
    id: string;
    name: string;
    email: string;
  };
  initialCampaign?: {
    id: string;
    name: string;
    description: string;
    initialPromptTemplate?: string;
  };
}

const RealNegotiationAgent: React.FC<RealNegotiationAgentProps> = ({ 
  initialContact, 
  initialCampaign 
}) => {
  const [contact, setContact] = useState(initialContact || null);
  const [campaign, setCampaign] = useState(initialCampaign || null);

  // Auto-start the simulator if we have both contact and campaign
  const shouldShowSimulator = contact && campaign;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {shouldShowSimulator ? (
        <CompleteNegotiationSimulator 
          contact={contact}
          campaign={campaign}
          onComplete={() => {
            // Optional: you can add navigation logic here if needed
            console.log('Negotiation completed');
          }}
        />
      ) : (
        <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
          <Card className="w-full max-w-2xl shadow-xl border-0 bg-white">
            <CardHeader className="text-center pb-6">
              <CardTitle className="flex items-center justify-center gap-3 text-3xl mb-4 text-gray-800">
                <Handshake className="h-8 w-8 text-[#FFE600]" />
                🤝 Realistic Negotiation Flow
              </CardTitle>
              <p className="text-lg text-gray-600 mb-6">
                Experience professional influencer partnership negotiations with AI-powered conversations
              </p>
            </CardHeader>
            
            <CardContent className="text-center space-y-6 pt-0">
              <div className="space-y-6">
                <p className="text-gray-700 max-w-lg mx-auto leading-relaxed">
                  Experience a complete negotiation journey from initial outreach to signed contract. 
                  Our AI simulates realistic creator responses, handles complex negotiations, and guides you through professional partnership workflows.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      ✨ Features
                    </h4>
                    <ul className="text-gray-700 space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#FFE600] rounded-full"></div>
                        AI-powered responses
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#FFE600] rounded-full"></div>
                        Real negotiation scenarios
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#FFE600] rounded-full"></div>
                        Contract generation
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#FFE600] rounded-full"></div>
                        Professional workflows
                      </li>
                    </ul>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      🎯 Benefits
                    </h4>
                    <ul className="text-gray-700 space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Practice negotiations
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Learn best practices
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Save time & effort
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        Professional outcomes
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-200 mt-8">
                <div className="flex items-center justify-center gap-2 text-orange-800 mb-2">
                  <Handshake className="h-5 w-5" />
                  <span className="font-semibold">Ready to Start</span>
                </div>
                <p className="text-orange-700 text-sm">
                  Please select a creator and campaign from the Creator Database to begin your negotiation experience.
                </p>
                <p className="text-orange-600 text-xs mt-2 font-medium">
                  Navigate to Creator Database → Select Creator → Choose Campaign → Launch Negotiation
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RealNegotiationAgent; 