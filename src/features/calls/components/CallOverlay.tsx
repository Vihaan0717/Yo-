import React, { useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import type { CallSession, Profile } from '../../../types';

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

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 sm:p-6">
      <div className="relative w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden glass-panel border border-white/10 flex flex-col justify-between shadow-2xl">
        
        {/* Call Header */}
        <div className="p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/20">
              <img
                src={otherUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">{otherUser?.display_name || 'Yo Peer'}</h3>
              <p className="text-xs text-indigo-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                {session.status === 'ringing' ? 'Connecting WebRTC P2P stream...' : 'Encrypted WebRTC Session'}
              </p>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-full glass-panel-subtle text-xs text-slate-300 font-mono tracking-wider border border-white/10">
            {session.call_type.toUpperCase()} CALL
          </div>
        </div>

        {/* Video or Audio Visualizer Stage */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {session.call_type === 'video' ? (
            <>
              {/* Remote full video */}
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6">
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-2 border-indigo-500/50 shadow-xl shadow-indigo-500/20">
                      <img
                        src={otherUser?.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-white font-medium">Waiting for video stream...</p>
                    <p className="text-xs text-slate-400 mt-1">WebRTC NAT/STUN traversal active</p>
                  </div>
                )}
              </div>

              {/* Local PiP camera preview */}
              <div className="absolute bottom-6 right-6 w-36 h-48 sm:w-44 sm:h-60 rounded-2xl overflow-hidden glass-panel border border-white/20 shadow-2xl z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : ''}`}
                />
                {isVideoMuted && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80 text-slate-400">
                    <VideoOff className="w-8 h-8 mb-2" />
                    <span className="text-[10px]">Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white backdrop-blur-sm">
                  You
                </div>
              </div>
            </>
          ) : (
            /* Audio Call Experience */
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl shadow-indigo-500/30">
                  <img
                    src={otherUser?.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -inset-2 rounded-3xl border border-indigo-500/20 animate-pulse pointer-events-none" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">{otherUser?.display_name}</h2>
              <p className="text-slate-400 text-sm">@{otherUser?.username}</p>
              
              {/* Audio wave animation */}
              <div className="flex items-center gap-1.5 mt-8 h-8">
                {[40, 75, 55, 95, 60, 80, 45, 90, 70, 40].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1.5 bg-gradient-to-t from-indigo-500 to-purple-400 rounded-full animate-bounce"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Call Action Dock */}
        <div className="p-6 flex items-center justify-center gap-4 z-20 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={onToggleAudio}
            className={`p-4 rounded-2xl glass-panel border border-white/10 transition cursor-pointer ${
              isAudioMuted ? 'bg-red-500/30 text-red-300' : 'text-white hover:bg-white/10'
            }`}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
          >
            {isAudioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {session.call_type === 'video' && (
            <button
              onClick={onToggleVideo}
              className={`p-4 rounded-2xl glass-panel border border-white/10 transition cursor-pointer ${
                isVideoMuted ? 'bg-red-500/30 text-red-300' : 'text-white hover:bg-white/10'
              }`}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}

          <button
            onClick={onEndCall}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium flex items-center gap-2 shadow-lg shadow-red-600/40 hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <PhoneOff className="w-6 h-6" />
            <span>End Call</span>
          </button>
        </div>

      </div>
    </div>
  );
};
