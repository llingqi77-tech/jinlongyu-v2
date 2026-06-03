type MobileVoiceListeningBarProps = {
  transcript: string
  onStop: () => void
}

export function MobileVoiceListeningBar({ transcript, onStop }: MobileVoiceListeningBarProps) {
  return (
    <div className="mobile-voice-bar" role="region" aria-label="语音识别中">
      {transcript ? (
        <p className="mobile-voice-bar__transcript">&ldquo;{transcript}&rdquo;</p>
      ) : (
        <p className="mobile-voice-bar__transcript mobile-voice-bar__transcript--placeholder">
          正在聆听…
        </p>
      )}
      <button
        type="button"
        className="mobile-voice-bar__stop"
        onClick={onStop}
        aria-label="停止识别"
      >
        <span className="mobile-voice-bar__stop-icon" aria-hidden />
      </button>
    </div>
  )
}
