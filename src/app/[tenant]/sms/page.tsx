'use client'

import { useState, useEffect, useRef } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { MessageSquare, Send, Loader2, User, Search, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { useSettings } from '@/lib/settings-context'
import { useSMSNotifications } from '@/lib/sms-notifications-context'
import { linkifyText } from '@/lib/linkify'
import { createLogger } from '@/lib/logger'
import toast from 'react-hot-toast'

const log = createLogger('sms')

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  notes: string
  communication_date: string
  metadata?: {
    from_number?: string
    to_number?: string
  }
  contact_id?: string
  lead_id?: string
  account_id?: string
  contacts?: {
    first_name: string
    last_name: string
  }
  leads?: {
    first_name: string
    last_name: string
  }
  accounts?: {
    name: string
  }
}

interface Conversation {
  phoneNumber: string
  displayName: string
  lastMessage: string
  lastMessageDate: string
  unreadCount: number
  contactId?: string
  leadId?: string
  accountId?: string
}

interface Person {
  id: string
  name: string
  phone: string
  type: 'contact' | 'lead' | 'account' | 'staff'
  email?: string
}

export default function SMSMessagesPage() {
  const { settings } = useSettings()
  const { isThreadUnread, markThreadAsRead, unreadThreads } = useSMSNotifications()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false)
  const [people, setPeople] = useState<Person[]>([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleSearch, setPeopleSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'contact' | 'lead' | 'account' | 'staff'>('all')
  const [recentMessageIds, setRecentMessageIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousMessagesRef = useRef<Message[]>([])

  const defaultCountryCode = settings?.integrations?.thirdPartyIntegrations?.twilio?.defaultCountryCode || '+1'

  // Handle selecting a conversation - mark as read immediately
  const handleSelectConversation = (phoneNumber: string) => {
    setSelectedPhone(phoneNumber)
    markThreadAsRead(phoneNumber)
  }

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Track new messages and make them bold for 5 seconds
  useEffect(() => {
    const previousIds = new Set(previousMessagesRef.current.map(m => m.id))
    const newIds = messages.filter(m => !previousIds.has(m.id)).map(m => m.id)

    if (newIds.length > 0) {
      setRecentMessageIds(prev => {
        const updated = new Set(prev)
        newIds.forEach(id => updated.add(id))
        return updated
      })

      // Remove from recent after 5 seconds
      setTimeout(() => {
        setRecentMessageIds(prev => {
          const updated = new Set(prev)
          newIds.forEach(id => updated.delete(id))
          return updated
        })
      }, 5000)
    }

    previousMessagesRef.current = messages
  }, [messages])

  // Fetch all conversations
  useEffect(() => {
    fetchConversations()
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [])

  // Fetch messages for selected conversation
  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone)
    }
  }, [selectedPhone])

  const normalizePhone = (phone: string) => {
    return phone.replace(/[\s\-\(\)\+]/g, '').slice(-10)
  }

  // Get unread count for a specific thread
  const getThreadUnreadCount = (phoneNumber: string) => {
    const normalized = normalizePhone(phoneNumber)
    const thread = unreadThreads.find(t => t.normalizedPhone === normalized)
    return thread?.unreadCount || 0
  }

  // Fetch contacts, leads, accounts, and staff for new message
  const fetchPeople = async () => {
    setPeopleLoading(true)
    try {
      const [contactsRes, leadsRes, accountsRes, staffRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/leads'),
        fetch('/api/accounts'),
        fetch('/api/users')
      ])

      const peopleList: Person[] = []

      if (contactsRes.ok) {
        const contacts = await contactsRes.json()
        contacts.forEach((c: any) => {
          if (c.phone) {
            peopleList.push({
              id: c.id,
              name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Contact',
              phone: c.phone,
              type: 'contact',
              email: c.email
            })
          }
        })
      }

      if (leadsRes.ok) {
        const leads = await leadsRes.json()
        leads.forEach((l: any) => {
          if (l.phone) {
            peopleList.push({
              id: l.id,
              name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unnamed Lead',
              phone: l.phone,
              type: 'lead',
              email: l.email
            })
          }
        })
      }

      if (accountsRes.ok) {
        const accounts = await accountsRes.json()
        accounts.forEach((a: any) => {
          if (a.phone) {
            peopleList.push({
              id: a.id,
              name: a.name || 'Unnamed Account',
              phone: a.phone,
              type: 'account',
              email: a.email
            })
          }
        })
      }

      if (staffRes.ok) {
        const users = await staffRes.json()
        // Handle both array and object with users property
        const usersList = Array.isArray(users) ? users : (users.users || [])
        
        usersList.forEach((u: any) => {
          if (u.phone || u.phone_number) {
            peopleList.push({
              id: u.id,
              name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unnamed Staff',
              phone: u.phone || u.phone_number,
              type: 'staff',
              email: u.email
            })
          }
        })
      }

      // Sort alphabetically by name
      peopleList.sort((a, b) => a.name.localeCompare(b.name))
      
      setPeople(peopleList)
    } catch (error) {
      log.error({ error }, 'Error fetching people')
    } finally {
      setPeopleLoading(false)
    }
  }

  const handleSelectPerson = (person: Person) => {
    handleSelectConversation(person.phone)
    setIsNewMessageModalOpen(false)
    setPeopleSearch('')
    setSelectedCategory('all')
  }
  
  // Filter people by search and category
  const filteredPeople = people.filter(p => {
    // Apply search filter
    const matchesSearch = p.name.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      p.phone.includes(peopleSearch) ||
      p.email?.toLowerCase().includes(peopleSearch.toLowerCase())
    
    // Apply category filter
    const matchesCategory = selectedCategory === 'all' || p.type === selectedCategory
    
    return matchesSearch && matchesCategory
  })
  
  // Count by type
  const counts = {
    all: people.length,
    contact: people.filter(p => p.type === 'contact').length,
    lead: people.filter(p => p.type === 'lead').length,
    account: people.filter(p => p.type === 'account').length,
    staff: people.filter(p => p.type === 'staff').length
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      
      // Fetch users (staff) to match phone numbers
      const usersResponse = await fetch('/api/users')
      let usersByPhone = new Map<string, any>()
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        const usersList = Array.isArray(usersData) ? usersData : (usersData.users || [])
        
        usersList.forEach((u: any) => {
          const phone = u.phone || u.phone_number
          if (phone) {
            const normalized = normalizePhone(phone)
            usersByPhone.set(normalized, u)
          }
        })
      }
      
      const response = await fetch('/api/communications?communication_type=sms')
      
      if (response.ok) {
        const allMessages = await response.json()
        
        console.log('📥 Fetched', allMessages.length, 'total SMS messages')
        console.log('📋 Sample messages:', allMessages.slice(0, 3))
        
        // Group messages by phone number
        const conversationMap = new Map<string, Conversation>()
        
        allMessages.forEach((msg: Message) => {
          const phoneNumber = msg.direction === 'inbound' 
            ? msg.metadata?.from_number 
            : msg.metadata?.to_number
          
          if (!phoneNumber) {
            console.warn('⚠️ Message missing phone number:', { direction: msg.direction, metadata: msg.metadata, id: msg.id })
            return
          }
          
          const normalized = normalizePhone(phoneNumber)
          console.log('📞 Processing message:', { 
            direction: msg.direction, 
            phoneNumber, 
            normalized,
            hasMetadata: !!msg.metadata,
            metadata: msg.metadata 
          })
          
          if (!conversationMap.has(normalized)) {
            // Determine display name
            let displayName = phoneNumber
            
            // Check for contact, lead, or account first (from database relationships)
            console.log('🔍 Determining display name for', phoneNumber, {
              hasContact: !!msg.contacts,
              hasLead: !!msg.leads,
              hasAccount: !!msg.accounts,
              contactData: msg.contacts,
              leadData: msg.leads,
              accountData: msg.accounts,
              leadId: msg.lead_id,
              contactId: msg.contact_id,
              accountId: msg.account_id
            })
            
            if (msg.contacts?.first_name) {
              displayName = `${msg.contacts.first_name} ${msg.contacts.last_name || ''}`.trim()
            } else if (msg.leads?.first_name) {
              displayName = `${msg.leads.first_name} ${msg.leads.last_name || ''}`.trim()
            } else if (msg.accounts?.name) {
              displayName = msg.accounts.name
            } else {
              // If no database relationship, check if phone matches a user (staff)
              const matchedUser = usersByPhone.get(normalized)
              if (matchedUser) {
                displayName = matchedUser.name || `${matchedUser.first_name || ''} ${matchedUser.last_name || ''}`.trim() || phoneNumber
              }
            }
            
            conversationMap.set(normalized, {
              phoneNumber,
              displayName,
              lastMessage: msg.notes,
              lastMessageDate: msg.communication_date,
              unreadCount: 0,
              contactId: msg.contact_id,
              leadId: msg.lead_id,
              accountId: msg.account_id
            })
          } else {
            // Update if this message is more recent
            const existing = conversationMap.get(normalized)!
            if (new Date(msg.communication_date) > new Date(existing.lastMessageDate)) {
              existing.lastMessage = msg.notes
              existing.lastMessageDate = msg.communication_date
            }
          }
        })
        
        // Convert to array and sort by most recent
        const conversationsArray = Array.from(conversationMap.values()).sort(
          (a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
        )
        
        console.log('✅ Grouped into', conversationsArray.length, 'conversations')
        console.log('📋 Conversations:', conversationsArray)
        
        setConversations(conversationsArray)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (phoneNumber: string) => {
    try {
      const response = await fetch('/api/communications?communication_type=sms')
      
      if (response.ok) {
        const allMessages = await response.json()
        const normalized = normalizePhone(phoneNumber)
        
        // Filter messages for this phone number
        const threadMessages = allMessages.filter((msg: Message) => {
          const msgPhone = msg.direction === 'inbound' 
            ? msg.metadata?.from_number 
            : msg.metadata?.to_number
          return msgPhone && normalizePhone(msgPhone) === normalized
        })
        
        // Sort by date (oldest first for chat display)
        threadMessages.sort((a: Message, b: Message) => 
          new Date(a.communication_date).getTime() - new Date(b.communication_date).getTime()
        )
        
        setMessages(threadMessages)
      }
    } catch (error) {
      log.error({ error }, 'Error fetching messages')
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPhone) return

    // Automatically prepend country code if phone doesn't start with +
    let formattedPhone = selectedPhone.trim()
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.replace(/[\s\-\(\)]/g, '')
      formattedPhone = `${defaultCountryCode}${formattedPhone}`
    }

    setSending(true)

    try {
      const response = await fetch('/api/integrations/twilio/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: newMessage,
        }),
      })

      if (response.ok) {
        setNewMessage('')
        // Refresh messages after sending
        await fetchMessages(selectedPhone)
        await fetchConversations()
      } else {
        const error = await response.json()
        toast.error(`Failed to send SMS: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      log.error({ error }, 'Error sending SMS')
      toast.error('Failed to send SMS. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  const filteredConversations = conversations.filter(conv => 
    conv.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phoneNumber.includes(searchQuery)
  )

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-[#347dc4]" />
            SMS Messages
          </h1>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Conversations List */}
          <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
            {/* Search & New Message */}
            <div className="p-4 border-b border-gray-200 bg-white space-y-2">
              <Button
                onClick={() => {
                  setIsNewMessageModalOpen(true)
                  fetchPeople()
                }}
                className="w-full bg-[#347dc4] hover:bg-[#2c6ba8]"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500 px-4">
                  <MessageSquare className="h-8 w-8 mb-2 text-gray-400" />
                  <p className="text-sm text-center">No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const unread = isThreadUnread(conv.phoneNumber)
                  const threadUnreadCount = getThreadUnreadCount(conv.phoneNumber)
                  return (
                    <button
                      key={conv.phoneNumber}
                      onClick={() => handleSelectConversation(conv.phoneNumber)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-100 transition-colors ${
                        selectedPhone === conv.phoneNumber ? 'bg-blue-50 border-l-4 border-l-[#347dc4]' : ''
                      } ${unread ? 'bg-blue-100 border-l-4 border-l-red-500' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 relative">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
                            unread ? 'bg-red-500' : 'bg-[#347dc4]'
                          }`}>
                            {conv.displayName.charAt(0).toUpperCase()}
                          </div>
                          {unread && threadUnreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold">{threadUnreadCount > 99 ? '99+' : threadUnreadCount}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm truncate ${unread ? 'font-black text-gray-900' : 'font-medium text-gray-900'}`}>
                              {conv.displayName}
                            </p>
                            <div className="flex items-center gap-2">
                              {unread && threadUnreadCount > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                                  {threadUnreadCount} new
                                </span>
                              )}
                              <p className={`text-xs ${unread ? 'font-bold text-red-500' : 'text-gray-500'}`}>
                                {formatTime(conv.lastMessageDate)}
                              </p>
                            </div>
                          </div>
                          <p className={`text-xs truncate ${unread ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>
                            {conv.phoneNumber}
                          </p>
                          <p className={`text-xs truncate mt-1 ${unread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                            {conv.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Side - Message Thread */}
          <div className="flex-1 flex flex-col">
            {selectedPhone ? (
              <>
                {/* Thread Header */}
                <div className="border-b border-gray-200 px-6 py-4 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#347dc4] flex items-center justify-center text-white font-medium">
                      {conversations.find(c => c.phoneNumber === selectedPhone)?.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {conversations.find(c => c.phoneNumber === selectedPhone)?.displayName}
                      </p>
                      <p className="text-sm text-gray-500">{selectedPhone}</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                  {messages.map((msg) => {
                    const isRecent = recentMessageIds.has(msg.id)
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'} ${isRecent ? 'animate-pulse' : ''}`}
                      >
                        <div
                          className={`max-w-md px-4 py-2 rounded-2xl transition-all ${
                            msg.direction === 'outbound'
                              ? 'bg-[#347dc4] text-white rounded-br-sm'
                              : `bg-white text-gray-900 border rounded-bl-sm ${isRecent ? 'border-[#347dc4] border-2 shadow-md' : 'border-gray-200'}`
                          }`}
                        >
                          <p className={`text-sm whitespace-pre-wrap break-words ${isRecent && msg.direction === 'inbound' ? 'font-semibold' : ''}`}>
                            {linkifyText(
                              msg.notes,
                              msg.direction === 'outbound'
                                ? 'underline hover:opacity-80'
                                : 'text-blue-600 underline hover:text-blue-800'
                            )}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(msg.communication_date)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Type a message..."
                      className="resize-none"
                      rows={3}
                      disabled={sending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="bg-[#347dc4] hover:bg-[#2c6ba8] self-end"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Press Enter to send • Shift+Enter for new line
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the left to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Message Modal */}
        <Modal
          isOpen={isNewMessageModalOpen}
          onClose={() => {
            setIsNewMessageModalOpen(false)
            setPeopleSearch('')
            setSelectedCategory('all')
          }}
          title="New Message"
          className="sm:max-w-2xl"
        >
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contacts, leads, accounts, staff..."
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            
            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#347dc4] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => setSelectedCategory('contact')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'contact'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Contacts ({counts.contact})
              </button>
              <button
                onClick={() => setSelectedCategory('lead')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'lead'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Leads ({counts.lead})
              </button>
              <button
                onClick={() => setSelectedCategory('account')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'account'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                Accounts ({counts.account})
              </button>
              <button
                onClick={() => setSelectedCategory('staff')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'staff'
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                Staff ({counts.staff})
              </button>
            </div>

            {/* People List */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              {peopleLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {filteredPeople.map((person) => (
                      <button
                        key={`${person.type}-${person.id}`}
                        onClick={() => handleSelectPerson(person)}
                        className="w-full text-left px-4 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-[#347dc4] flex items-center justify-center text-white font-medium">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {person.name}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              person.type === 'contact' ? 'bg-blue-100 text-blue-800' :
                              person.type === 'lead' ? 'bg-green-100 text-green-800' :
                              person.type === 'staff' ? 'bg-orange-100 text-orange-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {person.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">{person.phone}</p>
                          {person.email && (
                            <p className="text-xs text-gray-500 truncate">{person.email}</p>
                          )}
                        </div>
                      </button>
                    ))
                  }
                  {filteredPeople.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <User className="h-12 w-12 mb-2 text-gray-300" />
                      <p className="text-sm">
                        {selectedCategory === 'all' 
                          ? 'No people with phone numbers found'
                          : `No ${selectedCategory}s with phone numbers found`
                        }
                      </p>
                      {peopleSearch && (
                        <p className="text-xs mt-1">Try adjusting your search or filter</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  )
}

