import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import type { CallSession, Profile } from '../../../types';
import { Avatar } from '../../../components/yo/Avatar';
import { SoundEffectsService } from '../../../services/feedback/SoundEffectsService';
import { HapticsService } from '../../../services/feedback/HapticsService';

interface CallOverlayProps {
  session: CallSession;
  otherUser?: Profile;
  onEndCall: () => void;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  session,
  otherUser,
  onEndCall,
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo,
  localStream,
  remoteStream,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Play outgoing ringtone while waiting for peer / ringing
  useEffect(() => {
    let interval: any = null;
    if (session.status === 'ringing') {
      SoundEffectsService.playRingtoneBurst();
      HapticsService.light();
      interval = setInterval(() => {
        SoundEffectsService.playRingtoneBurst();
      }, 2400);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session.status]);

  // Duration timer once connected
  useEffect(() => {
    let timer: any = null;
    if (session.status === 'accepted') {
      timer = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [session.status]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-3 sm:p-6">
      {/* Hidden audio element dedicated to playing peer remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative w-full max-w-md h-[92vh] sm:h-[85vh] rounded-[36px] overflow-hidden glass-strong border border-white/10 flex flex-col justify-between shadow-2xl bg-[#0b0f19]">
        
        {/* Call Header */}
        <div className="px-5 pt-12 pb-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <Avatar 
              chat={{
                name: otherUser?.display_name || 'Yo Peer',
                avatar_url: otherUser?.avatar_url,
                hue: otherUser?.username ? (otherUser.username.charCodeAt(0) * 37) % 360 : 210
              }} 
              size={48} 
            />
            <div>
              <h3 className="font-bold text-base text-white">{otherUser?.display_name || 'Yo Peer'}</h3>
              <p className="text-xs text-primary flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>
                  {session.status === 'ringing' 
                    ? 'Ringing...' 
                    : `Live (${formatDuration(callDuration)})`}
                </span>
              </p>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full glass text-[10px] text-slate-300 font-semibold tracking-wider border border-white/10 uppercase">
            {session.call_type} Call
          </div>
        </div>

        {/* Video or Audio Stage */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {session.call_type === 'video' ? (
            <>
              {/* Remote Video Stream */}
              <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 flex flex-col items-center">
                    <Avatar 
                      chat={{
                        name: otherUser?.display_name || 'Yo Peer',
                        avatar_url: otherUser?.avatar_url,
                        hue: 220
                      }} 
                      size={96} 
                    />
                    <p className="text-white font-semibold text-sm mt-4">
                      {session.status === 'ringing' ? 'Calling...' : 'Connecting P2P video stream...'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Google STUN Encrypted Channel</p>
                  </div>
                )}
              </div>

              {/* Local Video Camera Preview */}
              <div className="absolute bottom-5 right-5 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden glass border border-white/20 shadow-2xl z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : ''}`}
                />
                {isVideoMuted && (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                    Camera Off
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Audio Call UI */
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="relative mb-6">
                <Avatar 
                  chat={{
                    name: otherUser?.display_name || 'Yo Peer',
                    avatar_url: otherUser?.avatar_url,
                    hue: otherUser?.username ? (otherUser.username.charCodeAt(0) * 37) % 360 : 210
                  }} 
                  size={120} 
                />
                <div className="absolute -inset-3 rounded-full border border-primary/30 animate-pulse pointer-events-none" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-1">{otherUser?.display_name}</h2>
              <p className="text-slate-400 text-xs">@{otherUser?.username || 'contact'}</p>
              
              <div className="text-xs text-primary font-medium mt-3">
                {session.status === 'ringing' 
                  ? 'Calling...' 
                  : `${formatDuration(callDuration)} · High-Fidelity WebRTC Audio`}
              </div>

              {/* Audio visualizer wave */}
              <div className="flex items-center gap-1.5 mt-7 h-8">
                {[35, 70, 50, 90, 65, 80, 45, 85, 60, 40].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1 bg-gradient-to-t from-primary to-accent rounded-full animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Call Action Controls */}
        <div className="p-6 flex items-center justify-center gap-5 z-20 bg-gradient-to-t from-black/90 to-transparent">
          <button
            onClick={() => {
              HapticsService.light();
              onToggleAudio();
            }}
            className={`p-3.5 rounded-full glass border border-white/10 transition cursor-pointer active:scale-90 ${
              isAudioMuted ? 'bg-red-500/30 text-red-300 border-red-500/40' : 'text-white hover:bg-white/10'
            }`}
            title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {session.call_type === 'video' && (
            <button
              onClick={() => {
                HapticsService.light();
                onToggleVideo();
              }}
              className={`p-3.5 rounded-full glass border border-white/10 transition cursor-pointer active:scale-90 ${
                isVideoMuted ? 'bg-red-500/30 text-red-300 border-red-500/40' : 'text-white hover:bg-white/10'
              }`}
              title={isVideoMuted ? 'Turn camera on' : 'Turn camera off'}
            >
              {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => {
              HapticsService.heavy();
              SoundEffectsService.playDelete();
              onEndCall();
            }}
            className="p-4 rounded-full bg-red-600 text-white shadow-glow hover:bg-red-700 active:scale-90 transition cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

      </div>
    </div>
  );
};
