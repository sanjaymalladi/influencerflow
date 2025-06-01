import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { outreachAPI } from '@/services/apiService';
import api from '@/services/apiService';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface DebugResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
  timestamp?: string;
}

const ApiDebugPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, { ...result, timestamp: new Date().toISOString() }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testApiConnection = async () => {
    setIsLoading(true);
    addResult({ status: 'warning', message: 'Starting API connectivity tests...' });

    try {
      // Test 1: Basic API health check
      addResult({ status: 'warning', message: 'Testing basic API connection...' });
      const healthResponse = await fetch('https://influencerflow.onrender.com/api/health');
      
      if (healthResponse.ok) {
        addResult({ status: 'success', message: 'API server is reachable' });
      } else {
        addResult({ status: 'error', message: `API health check failed: ${healthResponse.status}` });
      }

      // Test 2: Check authentication
      const token = localStorage.getItem('authToken');
      if (token) {
        addResult({ status: 'success', message: 'Auth token found in localStorage' });
      } else {
        addResult({ status: 'warning', message: 'No auth token found - some features may not work' });
      }

      // Test 3: Test outreach API endpoints
      addResult({ status: 'warning', message: 'Testing outreach API endpoints...' });
      
      try {
        const emailsResponse = await outreachAPI.getEmails();
        addResult({ 
          status: 'success', 
          message: `Successfully fetched emails (${emailsResponse.emails.length} emails found)`,
          data: { emailCount: emailsResponse.emails.length }
        });

        // Test 4: Check for draft emails that can be sent
        const draftEmails = emailsResponse.emails.filter(email => email.status === 'draft');
        if (draftEmails.length > 0) {
          addResult({ 
            status: 'success', 
            message: `Found ${draftEmails.length} draft emails ready to send`,
            data: { draftEmails: draftEmails.slice(0, 3).map(e => ({ id: e.id, subject: e.subject })) }
          });
        } else {
          addResult({ status: 'warning', message: 'No draft emails found to test sending' });
        }

      } catch (apiError: any) {
        addResult({ 
          status: 'error', 
          message: `Outreach API error: ${apiError.message}`,
          data: { error: apiError.response?.data }
        });
      }

      // Test 5: Check pipeline endpoint
      try {
        const pipelineResponse = await outreachAPI.getPipeline();
        addResult({ 
          status: 'success', 
          message: 'Pipeline data loaded successfully',
          data: { 
            totalEmails: pipelineResponse.metrics.totalEmails,
            sentCount: pipelineResponse.metrics.sentCount 
          }
        });
      } catch (pipelineError: any) {
        addResult({ 
          status: 'error', 
          message: `Pipeline API error: ${pipelineError.message}` 
        });
      }

    } catch (error: any) {
      addResult({ 
        status: 'error', 
        message: `Connection test failed: ${error.message}`,
        data: { error: error.toString() }
      });
    } finally {
      setIsLoading(false);
      addResult({ status: 'warning', message: 'API connectivity tests completed' });
    }
  };

  const testEmailSending = async () => {
    setIsLoading(true);
    addResult({ status: 'warning', message: '🧪 Testing email sending endpoints...', timestamp: new Date().toISOString() });
    
    try {
      // First, test what endpoints are available
      const endpoints = [
        '/outreach/emails',
        '/outreach/pipeline', 
        '/outreach/stats',
        '/outreach/templates'
      ];
      
      addResult({ status: 'warning', message: '🔍 Testing available endpoints...', timestamp: new Date().toISOString() });
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint);
          addResult({ 
            status: 'success', 
            message: `✅ ${endpoint} - Status: ${response.status}`, 
            data: `Response size: ${JSON.stringify(response.data).length} bytes`,
            timestamp: new Date().toISOString() 
          });
        } catch (error: any) {
          addResult({ 
            status: 'error', 
            message: `❌ ${endpoint} - Status: ${error.response?.status || 'Network Error'}`, 
            data: error.response?.data?.message || error.message,
            timestamp: new Date().toISOString() 
          });
        }
      }

      // Test creating a test email
      addResult({ status: 'warning', message: '📧 Testing email creation...', timestamp: new Date().toISOString() });
      
      const testEmail = await outreachAPI.createEmail({
        campaignId: 'test-campaign-id',
        creatorId: 'test-creator-id',
        subject: 'Test Email from Debug Panel',
        body: 'This is a test email created by the debug panel to test the API.'
      });
      
      addResult({ 
        status: 'success', 
        message: '✅ Test email created successfully!', 
        data: `Email ID: ${testEmail.id}`,
        timestamp: new Date().toISOString() 
      });

      // Test sending the email
      addResult({ status: 'warning', message: '📤 Testing email sending...', timestamp: new Date().toISOString() });
      
      // Test different potential endpoints
      const sendEndpoints = [
        `/outreach/emails/${testEmail.id}/send`,
        `/outreach/send/${testEmail.id}`,
        `/outreach/send-email/${testEmail.id}`,
        `/outreach/emails/${testEmail.id}/send-email`
      ];
      
      let sendSuccess = false;
      for (const endpoint of sendEndpoints) {
        try {
          const response = await api.put(endpoint);
          addResult({ 
            status: 'success', 
            message: `✅ Email sent via ${endpoint}!`, 
            data: response.data,
            timestamp: new Date().toISOString() 
          });
          sendSuccess = true;
          break;
        } catch (error: any) {
          addResult({ 
            status: 'error', 
            message: `❌ Failed to send via ${endpoint} - Status: ${error.response?.status}`, 
            data: error.response?.data?.message || error.message,
            timestamp: new Date().toISOString() 
          });
        }
      }
      
      if (!sendSuccess) {
        // Try with POST method
        addResult({ status: 'warning', message: '🔄 Trying POST method for sending...', timestamp: new Date().toISOString() });
        
        for (const endpoint of sendEndpoints) {
          try {
            const response = await api.post(endpoint);
            addResult({ 
              status: 'success', 
              message: `✅ Email sent via POST ${endpoint}!`, 
              data: response.data,
              timestamp: new Date().toISOString() 
            });
            sendSuccess = true;
            break;
          } catch (error: any) {
            addResult({ 
              status: 'error', 
              message: `❌ Failed POST to ${endpoint} - Status: ${error.response?.status}`, 
              data: error.response?.data?.message || error.message,
              timestamp: new Date().toISOString() 
            });
          }
        }
      }
      
      if (!sendSuccess) {
        addResult({ 
          status: 'error', 
          message: '❌ All email sending endpoints failed. Check backend implementation.', 
          timestamp: new Date().toISOString() 
        });
      }
      
    } catch (error: any) {
      console.error('Email sending test failed:', error);
      addResult({ 
        status: 'error', 
        message: `❌ Email sending test failed: ${error.message}`, 
        data: error.response?.data,
        timestamp: new Date().toISOString() 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          API Debug Panel
        </CardTitle>
        <p className="text-sm text-gray-600">
          Diagnose API connectivity and email sending issues
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testApiConnection} 
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Test API Connection
          </Button>
          <Button 
            onClick={testEmailSending} 
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Test Email Sending
          </Button>
          <Button 
            onClick={clearResults} 
            variant="ghost"
            size="sm"
          >
            Clear Results
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="font-medium text-sm">Test Results:</h3>
            {results.map((result, index) => (
              <Alert key={index} className={`${getStatusColor(result.status)} border`}>
                <div className="flex items-start gap-2">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <AlertDescription className="text-sm">
                      <div className="font-medium">{result.message}</div>
                      {result.data && (
                        <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                      {result.timestamp && (
                        <div className="text-xs opacity-60 mt-1">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <strong>Common Issues:</strong>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Check if backend server is running and accessible</li>
              <li>• Verify authentication token is valid</li>
              <li>• Ensure email service is configured on backend</li>
              <li>• Check network connectivity and CORS settings</li>
              <li>• Verify creator emails are properly set</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ApiDebugPanel; 