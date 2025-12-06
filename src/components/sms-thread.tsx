'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, Phone } from 'lucide-react'
import { format, isToday, isYesterday, isSameDay, parseISO } from 'date-fns'
import { createLogger } from '@/lib/logger'

const log = createLogger('components')

interface SMSMessage {
  id: string
  direction: 'inbound' | 'outbound'
  notes: string // message content
  communication_date: string
  status: string
  metadata?: {
    twilio_sid?: string
    from_number?: string
    to_number?: string
  }
}

interface SMSThreadProps {
  eventId?: string
  opportunityId?: string
  contactId?: string
  accountId?: string
  leadId?: string
  contactPhone?: string
  onClose?: () => void
}

export function SMSThread({
  eventId,
  opportunityId,
  contactId,
  accountId,
  leadId,
  contactPhone
}: SMSThreadProps) {
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [eventId, opportunityId, contactId, accountId, leadId])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (eventId) params.append('event_id', eventId)
      if (opportunityId) params.append('opportunity_id', opportunityId)
      if (contactId) params.append('contact_id', contactId)
      if (accountId) params.append('account_id', accountId)
      if (leadId) params.append('lead_id', leadId)

      params.append('communication_type', 'sms')

      const response = await fetch(`/api/communications?${params.toString()}`)

      if (response.ok) {
        const data = await response.json()
        setMessages(data.sort((a: SMSMessage, b: SMSMessage) =>
          new Date(a.communication_date).getTime() - new Date(b.communication_date).getTime()
        ))
      }
    } catch (error) {
      log.error({ error }, 'Error fetching SMS messages')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !contactPhone) return

    try {
      setSending(true)

      const response = await fetch('/api/integrations/twilio/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: contactPhone,
          message: newMessage,
          event_id: eventId,
          opportunity_id: opportunityId,
          account_id: accountId,
          contact_id: contactId,
          lead_id: leadId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to send SMS')
      }

      // Clear the input
      setNewMessage('')

      // Refresh messages
      await fetchMessages()
    } catch (error) {
      log.error({ error }, 'Error sending SMS')
      alert('Failed to send SMS. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const formatMessageDate = (dateString: string) => {
    const date = parseISO(dateString)

    if (isToday(date)) {
      return format(date, 'h:mm a')
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`
    } else {
      return format(date, 'MMM d, h:mm a')
    }
  }

  const groupMessagesByDate = (messages: SMSMessage[]) => {
    const groups: { date: string; messages: SMSMessage[] }[] = []

    messages.forEach((message) => {
      const messageDate = parseISO(message.communication_date)
      const dateLabel = isToday(messageDate)
        ? 'Today'
        : isYesterday(messageDate)
        ? 'Yesterday'
        : format(messageDate, 'MMMM d, yyyy')

      const existingGroup = groups.find((g) => g.date === dateLabel)

      if (existingGroup) {
        existingGroup.messages.push(message)
      } else {
        groups.push({ date: dateLabel, messages: [message] })
      }
    })

    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

  if (!contactPhone) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <Phone className="h-12 w-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">No phone number available</p>
        <p className="text-sm">Add a phone number to the contact to send SMS messages.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">SMS Conversation</h3>
            <p className="text-sm text-gray-600">{contactPhone}</p>
          </div>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-sm">No messages yet. Start a conversation!</p>
          </div>
        )}

        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date Divider */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                {group.date}
              </div>
            </div>

            {/* Messages in this date group */}
            {group.messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-3 ${
                  message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.direction === 'outbound'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.notes}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.direction === 'outbound'
                        ? 'text-blue-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatMessageDate(message.communication_date)}
                    {message.status === 'failed' && (
                      <span className="ml-2 text-red-300">Failed</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t px-4 py-3 bg-gray-50">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-4"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
