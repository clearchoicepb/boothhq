'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare,
  Phone,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { createLogger } from '@/lib/logger'

const log = createLogger('test-sms')

interface TestMessage {
  id: string;
  direction: 'outbound' | 'inbound';
  notes: string;
  communication_date: string;
  status: string;
  metadata?: {
    twilio_sid?: string;
    from_number?: string;
    to_number?: string;
  };
}

export default function TestSMSPage() {
  const { tenant: tenantSubdomain } = useParams();
  const router = useRouter();
  const { settings: globalSettings } = useSettings();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Test SMS from CRM - Please reply to confirm receipt!');
  const [sending, setSending] = useState(false);
  const [testMessages, setTestMessages] = useState<TestMessage[]>([]);
  const [waitingForReply, setWaitingForReply] = useState(false);
  const [replyReceived, setReplyReceived] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get Twilio settings
  const twilioSettings = globalSettings?.integrations?.thirdPartyIntegrations?.twilio;
  const isTwilioConfigured = twilioSettings?.enabled && 
    twilioSettings?.accountSid && 
    twilioSettings?.authToken && 
    twilioSettings?.phoneNumber;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [testMessages]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const fetchRecentMessages = async (testPhone: string) => {
    try {
      // Fetch communications for this phone number (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const response = await fetch(`/api/communications?communication_type=sms&since=${fiveMinutesAgo}`);
      
      if (response.ok) {
        const data = await response.json();
        
        console.log('📥 Fetched SMS messages:', data.length);
        console.log('🔍 Looking for phone:', testPhone, 'normalized:', normalizePhone(testPhone));
        
        // Filter messages related to our test phone number
        const normalizedTestPhone = normalizePhone(testPhone);
        const relevantMessages = data.filter((msg: TestMessage) => {
          const fromPhone = msg.metadata?.from_number ? normalizePhone(msg.metadata.from_number) : '';
          const toPhone = msg.metadata?.to_number ? normalizePhone(msg.metadata.to_number) : '';
          
          console.log('📨 Message:', {
            direction: msg.direction,
            from: msg.metadata?.from_number,
            to: msg.metadata?.to_number,
            fromNormalized: fromPhone,
            toNormalized: toPhone,
            matches: fromPhone === normalizedTestPhone || toPhone === normalizedTestPhone
          });
          
          return fromPhone === normalizedTestPhone || toPhone === normalizedTestPhone;
        });

        console.log('✅ Relevant messages:', relevantMessages.length);
        
        setTestMessages(relevantMessages.sort((a: TestMessage, b: TestMessage) =>
          new Date(a.communication_date).getTime() - new Date(b.communication_date).getTime()
        ));

        // Check if we received an inbound reply
        const hasInboundReply = relevantMessages.some((msg: TestMessage) => msg.direction === 'inbound');
        if (hasInboundReply && waitingForReply && !replyReceived) {
          setReplyReceived(true);
          setWaitingForReply(false);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      }
    } catch (error) {
      log.error({ error }, 'Error fetching messages');
    }
  };

  const normalizePhone = (phone: string) => {
    return phone.replace(/[\s\-\(\)\+]/g, '').slice(-10);
  };

  const startReplyWatch = (testPhone: string) => {
    setWaitingForReply(true);
    setReplyReceived(false);
    setTimeRemaining(30);

    // Countdown timer
    let secondsLeft = 30;
    const countdownInterval = setInterval(() => {
      secondsLeft--;
      setTimeRemaining(secondsLeft);
      
      if (secondsLeft <= 0) {
        clearInterval(countdownInterval);
        setWaitingForReply(false);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    }, 1000);

    // Poll for replies every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchRecentMessages(testPhone);
    }, 2000);

    // Stop after 30 seconds
    timeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      clearInterval(countdownInterval);
      setWaitingForReply(false);
    }, 30000);
  };

  const handleSendTest = async () => {
    // Validate
    if (!phoneNumber || !message) {
      setError('Please enter both phone number and message');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number (e.g., +1234567890)');
      return;
    }

    setSending(true);
    setError('');
    setTestMessages([]);
    setReplyReceived(false);

    try {
      const response = await fetch('/api/integrations/twilio/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }

      // Success - start watching for replies
      await fetchRecentMessages(phoneNumber);
      startReplyWatch(phoneNumber);
      
    } catch (err) {
      log.error({ err }, 'Error sending test SMS');
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    if (phoneNumber) {
      fetchRecentMessages(phoneNumber);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/${tenantSubdomain}/settings/integrations`}
                className="flex items-center text-[#347dc4] hover:text-[#2c6ba8] transition-colors duration-150"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Integrations
              </Link>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <MessageSquare className="h-8 w-8 mr-3 text-[#347dc4]" />
              SMS Test Tool
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Send a test SMS and watch for replies in real-time
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Connection Status */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          isTwilioConfigured 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            {isTwilioConfigured ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900">Twilio Connected</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Phone Number: <span className="font-mono">{twilioSettings.phoneNumber}</span>
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Account SID: {twilioSettings.accountSid?.substring(0, 12)}...
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-red-900">Twilio Not Configured</h3>
                  <p className="text-sm text-red-700">
                    Please configure Twilio in the{' '}
                    <Link href={`/${tenantSubdomain}/settings/integrations`} className="underline">
                      integrations settings
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Test Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Test Message</h2>
          
          <div className="space-y-4">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  disabled={sending || waitingForReply}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your own phone number to test the integration
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your test message..."
                rows={3}
                disabled={sending || waitingForReply}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#347dc4] focus:border-[#347dc4]"
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length} characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendTest}
              disabled={sending || waitingForReply || !isTwilioConfigured}
              className="w-full px-4 py-3 bg-[#347dc4] text-white rounded-lg hover:bg-[#2c6ba8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
            >
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send Test SMS
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reply Watch Status */}
        {waitingForReply && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 text-blue-600 mr-3 animate-spin" />
                <div>
                  <h3 className="font-semibold text-blue-900">Watching for Reply...</h3>
                  <p className="text-sm text-blue-700">
                    Checking every 2 seconds for incoming messages
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{timeRemaining}s</div>
                <p className="text-xs text-blue-600">remaining</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {replyReceived && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <h3 className="font-semibold text-green-900">✅ Reply Received!</h3>
                <p className="text-sm text-green-700">
                  Your 2-way SMS integration is working correctly!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Display */}
        {testMessages.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b px-4 py-3 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Test Conversation</h3>
                <p className="text-xs text-gray-600">{phoneNumber}</p>
              </div>
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh messages"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {testMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.direction === 'outbound'
                        ? 'bg-blue-600 text-white'
                        : 'bg-green-100 text-gray-900 border-2 border-green-300'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <span className={`text-xs font-medium ${
                        msg.direction === 'outbound' ? 'text-blue-100' : 'text-green-700'
                      }`}>
                        {msg.direction === 'outbound' ? '📤 Sent' : '📥 Received'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.notes}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.direction === 'outbound'
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {format(parseISO(msg.communication_date), 'h:mm:ss a')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Enter your own phone number (the one that will receive the SMS)</li>
            <li>Click "Send Test SMS"</li>
            <li>Check your phone for the message</li>
            <li>Reply to the message within 30 seconds</li>
            <li>Watch as the reply appears in real-time below!</li>
          </ol>
          <p className="text-xs text-blue-700 mt-3">
            <strong>Note:</strong> Make sure you've configured the Twilio webhook URL in your Twilio console:
            <br />
            <code className="bg-blue-100 px-2 py-1 rounded mt-1 inline-block">
              {typeof window !== 'undefined' && window.location.origin}/api/integrations/twilio/inbound
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

