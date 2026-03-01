"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

let msgCount = 0;
let resetTime = Date.now();
const RATE_LIMIT = 15;
const RATE_WINDOW = 10000;

export default function ChatInput({
  onSend,
  replyTo,
  editMsg,
  onCancelReply,
  onCancelEdit,
  onEditSave,
  uploading,
  disabled,
}) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  useEffect(() => {
    if (editMsg) {
      setText(editMsg.body || "");
      inputRef.current?.focus();
    }
  }, [editMsg]);

  const checkRateLimit = () => {
    const now = Date.now();
    if (now - resetTime > RATE_WINDOW) {
      msgCount = 0;
      resetTime = now;
    }
    if (msgCount >= RATE_LIMIT) {
      toast.error("Juda ko'p xabar. Biroz kuting");
      return false;
    }
    msgCount++;
    return true;
  };

  const handleSend = async () => {
    if (disabled) return toast.error("Siz cheklangansiz");
    const trimmed = text.trim();
    if (editMsg) {
      if (!trimmed) return;
      await onEditSave(editMsg.id, trimmed);
      setText("");
      return;
    }
    if (!trimmed) return;
    if (!checkRateLimit()) return;
    await onSend({ text: trimmed, type: "text" });
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fayl 10MB dan kichik bo'lishi kerak");
      e.target.value = "";
      return;
    }
    if (!checkRateLimit()) return;
    try {
      await onSend({
        file,
        type: file.type.startsWith("image/") ? "image" : "file",
      });
    } catch (err) {
      toast.error("Fayl yuborishda xato: " + err.message);
    }
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordingTime(0);
        try {
          await onSend({ voiceBlob: blob, type: "voice" });
        } catch (err) {
          toast.error("Ovozli xabar yuborishda xato: " + err.message);
        }
      };
      mr.start(100);
      setIsRecording(true);
      recordTimerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 120) {
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Mikrofonga ruxsat yo'q yoki qurilma topilmadi");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    clearInterval(recordTimerRef.current);
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
  };

  return (
    <div className="bg-base-100 border-t border-base-300 px-4 py-3">
      {/* Reply/Edit preview */}
      {(replyTo || editMsg) && (
        <div className="flex items-center gap-2 mb-2 bg-base-200 rounded-xl px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-semibold">
              {editMsg ? "✏️ Tahrirlash" : `↩️ ${replyTo?.senderName}ga javob`}
            </p>
            <p className="text-xs text-base-content/60 truncate">
              {editMsg?.body || replyTo?.body || "[fayl]"}
            </p>
          </div>
          <button
            onClick={editMsg ? onCancelEdit : onCancelReply}
            className="btn btn-ghost btn-xs btn-circle"
          >
            ✕
          </button>
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 mb-2 bg-primary/10 rounded-xl px-3 py-2">
          <span className="loading loading-spinner loading-xs text-primary" />
          <span className="text-xs text-primary">Yuklanmoqda...</span>
        </div>
      )}

      {/* Recording UI */}
      {isRecording ? (
        <div className="flex items-center gap-3 bg-error/10 border border-error/20 rounded-2xl px-4 py-3">
          <div className="w-3 h-3 rounded-full bg-error animate-pulse" />
          <span className="text-error text-sm font-mono font-bold">
            {formatTime(recordingTime)}
          </span>
          <div className="flex items-end gap-0.5 h-5 flex-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-error/60 rounded-full waveform-bar"
                style={{
                  height: `${8 + Math.random() * 12}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <button
            onClick={cancelRecording}
            className="btn btn-ghost btn-xs rounded-lg text-base-content/50"
          >
            Bekor
          </button>
          <button
            onClick={stopRecording}
            className="btn btn-error btn-sm rounded-xl gap-1"
          >
            ⏹ Yuborish
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          {/* Fayl */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-ghost btn-sm btn-square rounded-xl flex-shrink-0"
            title="Fayl biriktirish"
            disabled={uploading || disabled}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          />

          {/* Matn */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled
                  ? "🚫 Cheklangan"
                  : editMsg
                    ? "Xabarni tahrirlang..."
                    : "Xabar yozing..."
              }
              className="w-full resize-none bg-base-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all chat-input"
              rows={1}
              disabled={disabled || uploading}
              style={{ minHeight: "44px", maxHeight: "128px" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 128) + "px";
              }}
            />
          </div>

          {/* Ovoz */}
          <button
            onClick={startRecording}
            className="btn btn-ghost btn-sm btn-square rounded-xl flex-shrink-0"
            title="Ovozli xabar"
            disabled={uploading || disabled}
          >
            🎙️
          </button>

          {/* Yuborish */}
          <button
            onClick={handleSend}
            className="btn btn-primary btn-sm btn-square rounded-xl flex-shrink-0"
            disabled={(!text.trim() && !editMsg) || uploading || disabled}
          >
            {uploading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <span>➤</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
