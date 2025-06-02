import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, LogIn, UserPlus, ArrowRight } from 'lucide-react';

interface SignInPromptProps {
  message?: string;
  redirectPath?: string;
}

const SignInPrompt: React.FC<SignInPromptProps> = ({ 
  message = "Please sign in to access this page",
  redirectPath 
}) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    const redirect = redirectPath || window.location.pathname;
    navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
  };

  const handleSignUp = () => {
    const redirect = redirectPath || window.location.pathname;
    navigate(`/auth?tab=register&redirect=${encodeURIComponent(redirect)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE600] via-white to-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Card className="rounded-2xl border border-gray-200 shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FFE600] to-[#E6CF00] rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-[#222222]" />
            </div>
            <CardTitle className="text-2xl font-bold text-[#222222] mb-2">
              Authentication Required
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSignIn}
              className="w-full bg-[#FFE600] hover:bg-[#E6CF00] text-[#222222] rounded-xl font-semibold py-3 h-auto"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign In to Your Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>
            
            <Button 
              onClick={handleSignUp}
              variant="outline"
              className="w-full rounded-xl border-2 border-gray-200 hover:bg-gray-50 py-3 h-auto"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Create New Account
            </Button>
            
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">
                InfluencerFlow connects brands with creators for 
                authentic influencer marketing campaigns.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            New to InfluencerFlow?{' '}
            <button 
              onClick={handleSignUp}
              className="text-[#222222] font-semibold hover:underline"
            >
              Learn more about our platform
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPrompt; 