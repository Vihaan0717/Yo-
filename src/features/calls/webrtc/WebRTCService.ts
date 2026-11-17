// Free Public Google STUN servers for ₹0-cost NAT Traversal
export const defaultIceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor() {}

  async startLocalMedia(type: 'audio' | 'video'): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (err) {
      console.warn('Real camera/mic access failed or denied, creating audio fallback stream:', err);
      // Create fallback synthetic stream so WebRTC peer connection does not fail
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();
        this.localStream = dest.stream;
        return dest.stream;
      } catch {
        const stream = new MediaStream();
        this.localStream = stream;
        return stream;
      }
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  createPeerConnection(
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onRemoteStream: (stream: MediaStream) => void
  ): RTCPeerConnection {
    this.onRemoteStreamCallback = onRemoteStream;
    this.peerConnection = new RTCPeerConnection({
      iceServers: defaultIceServers
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamCallback?.(event.streams[0]);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    return this.peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error('WebRTC createOffer failed:', err);
      return null;
    }
  }

  async createAnswer(remoteOffer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
      // Process any queued candidates after remote description is set
      await this.processPendingCandidates();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error('WebRTC createAnswer failed:', err);
      return null;
    }
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processPendingCandidates();
    } catch (err) {
      console.error('WebRTC setRemoteAnswer failed:', err);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('WebRTC addIceCandidate failed:', err);
    }
  }

  private async processPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const cand = this.pendingCandidates.shift();
      if (cand) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('Pending candidate failed to add:', e);
        }
      }
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  stopAll() {
    this.pendingCandidates = [];
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
  }
}
