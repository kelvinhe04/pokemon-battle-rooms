import { useEffect, useRef, useState, useCallback } from "react";

type Track = "battle" | "victory" | "none";

const TRACKS: Record<string, string> = {
  battle: "/music/battle.mp3",
  victory: "/music/victory.mp3",
};

export function useGameAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("pokemon_music_muted") === "true";
    } catch {
      return false;
    }
  });
  const mutedRef = useRef(muted);
  const [currentTrack, setCurrentTrack] = useState<Track>("none");

  // Keep ref in sync so play() always uses the latest muted value
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const play = useCallback((track: Track) => {
    if (track === "none") return;
    const src = TRACKS[track];
    if (!src) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    const audio = new Audio(src);
    audio.loop = track === "battle";
    audio.volume = 0.4;
    audio.muted = mutedRef.current;

    audio.play().catch(() => {});
    audioRef.current = audio;
    setCurrentTrack(track);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setCurrentTrack("none");
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      try {
        localStorage.setItem("pokemon_music_muted", String(next));
      } catch {}
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return { play, stop, toggleMute, muted, currentTrack };
}
