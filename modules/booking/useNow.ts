"use client";
import {useEffect,useState} from "react";
export function useNow() {
  const [now,setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  },[]);
  return now;
}
