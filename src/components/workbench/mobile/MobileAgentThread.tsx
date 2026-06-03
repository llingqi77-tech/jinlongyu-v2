import { useEffect, useRef, useState } from 'react'
import { useShortageStore } from '../../../store/shortageStore'
import { sendMobileAgentMessage } from '../../../utils/mobileAgentDialogue'
import { ChatMessageRow } from '../shared/ChatMessageRow'
import { MobileChatMessageGrid } from './MobileChatMessageGrid'
import { MobileOrderInfoCard } from './MobileOrderInfoCard'
import { MobileShortageHome } from './MobileShortageHome'

export function MobileAgentThread() {
  const messages = useShortageStore((s) => s.mobileChatMessages)
  const threadRef = useRef<HTMLDivElement>(null)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    const welcomeOnly =
      messages.length === 1 && messages[0]?.kind === 'welcome_card' && messages[0]?.side === 'agent'
    el.scrollTop = welcomeOnly ? 0 : el.scrollHeight
  }, [messages, streamingId])

  useEffect(() => {
    if (messages.length <= prevCountRef.current) {
      prevCountRef.current = messages.length
      return
    }
    const added = messages.slice(prevCountRef.current)
    prevCountRef.current = messages.length
    const lastAgent = [...added].reverse().find((m) => m.side === 'agent')
    if (lastAgent) setStreamingId(lastAgent.id)
  }, [messages])

  return (
    <div className="mobile-chat-thread" ref={threadRef}>
      {messages.map((msg) => {
        if (msg.kind === 'welcome_card' && msg.side === 'agent') {
          return (
            <div key={msg.id} className="mobile-welcome-card-group">
              {msg.timestamp ? (
                <div className="mobile-welcome-card-group__time">
                  <span className="chat-message__time">{msg.timestamp}</span>
                </div>
              ) : null}
              <MobileShortageHome />
            </div>
          )
        }

        if (msg.kind === 'order_info' && msg.side === 'agent') {
          return (
            <MobileChatMessageGrid key={msg.id} side="agent">
              <MobileOrderInfoCard
                details={msg.meta?.orderDetails ?? []}
                progress={msg.meta?.taskProgress}
                taskIndex={msg.meta?.taskIndex}
                fulfillmentMethodLabel={msg.meta?.fulfillmentMethodLabel}
                fulfillmentFieldLabel={msg.meta?.fulfillmentFieldLabel}
                fulfillmentDetail={msg.meta?.fulfillmentDetail}
                completed={msg.meta?.orderStatus === 'completed'}
              />
            </MobileChatMessageGrid>
          )
        }

        const isUser = msg.side === 'user'
        return (
          <ChatMessageRow
            key={msg.id}
            side={isUser ? 'user' : 'agent'}
            name=""
            showName={false}
            time={msg.timestamp}
            content={msg.content}
            actions={!isUser ? msg.meta?.actions : undefined}
            onAction={sendMobileAgentMessage}
            stream={
              !isUser &&
              msg.id === streamingId &&
              msg.kind !== 'welcome_card' &&
              msg.kind !== 'order_info'
            }
            onStreamComplete={() => {
              if (msg.id === streamingId) setStreamingId(null)
            }}
          />
        )
      })}
    </div>
  )
}
