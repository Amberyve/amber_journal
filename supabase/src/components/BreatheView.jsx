import React, { useEffect, useRef, useState } from "react";

const SEQ = [["in", 4], ["hold", 7], ["out", 8]];

export default function BreatheView() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("ready");
  const [count, setCount] = useState(0);
  const [cycles, setCycles] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!running) return;
    let idx = 0, left = SEQ[0][1];
    setPhase(SEQ[0][0]); setCount(left);
    timer.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        idx = (idx + 1) % SEQ.length;
        if (idx === 0) setCycles((c) => c + 1);
        left = SEQ[idx][1];
        setPhase(SEQ[idx][0]);
      }
      setCount(left);
    }, 1000);
    return () => clearInterval(timer.current);
  }, [running]);

  const stop = () => { setRunning(false); setPhase("ready"); clearInterval(timer.current); };
  const scale = running && phase !== "out" ? 1 : 0.62;
  const dur = phase === "in" ? 4 : phase === "out" ? 8 : 0.4;

  return (
    <div>
      <h2 className="h2">When it's too much right now</h2>
      <p className="sub">Two things that work in under three minutes.</p>

      <div className="card breathe">
        <div className="label">Breathe 4–7–8</div>
        <div className="circlewrap">
          <div className="circle" style={{ transform: `scale(${scale})`, transitionDuration: `${dur}s` }} />
          <div className="circletext">
            <span className="phase">
              {!running ? "ready" : phase === "in" ? "breathe in" : phase === "hold" ? "hold" : "breathe out"}
            </span>
            {running && <span className="count">{count}</span>}
          </div>
        </div>
        <button className="btn" onClick={() => (running ? stop() : setRunning(true))}>
          {running ? "Stop" : "Start"}
        </button>
        {cycles > 0 && (
          <p className="fine">{cycles} {cycles === 1 ? "round" : "rounds"} done. Four is usually enough.</p>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Come back to the room — 5, 4, 3, 2, 1</div>
        <p className="reflect" style={{ marginTop: 6 }}>
          Say each one out loud if you can. It interrupts the spiral by making your
          attention do something concrete.
        </p>
        <ul className="list">
          <li><b>5</b> things you can see</li>
          <li><b>4</b> things you can touch</li>
          <li><b>3</b> things you can hear</li>
          <li><b>2</b> things you can smell</li>
          <li><b>1</b> thing you can taste</li>
        </ul>
      </div>

      <p className="fine" style={{ marginTop: 18 }}>
        These help with a hard moment. They don't replace real support — if the hard
        moments are most days, please talk to someone you trust or a professional.
      </p>
    </div>
  );
}
