import { useRef } from "react";
import ContentCard from "./ContentCard";
import "./ContentRow.css";

export default function ContentRow({ title, items }) {
  const trackRef = useRef(null);

  const scroll = (dir) => {
    if (!trackRef.current) return;
    const amount = trackRef.current.clientWidth * 0.8;
    trackRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!items?.length) return null;

  return (
    <div className="tx-row">
      <h2 className="tx-row__title">{title}</h2>
      <div className="tx-row__wrap">
        <button className="tx-row__arrow tx-row__arrow--left" onClick={() => scroll("left")}>
          ‹
        </button>
        <div className="tx-row__track" ref={trackRef}>
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
        <button className="tx-row__arrow tx-row__arrow--right" onClick={() => scroll("right")}>
          ›
        </button>
      </div>
    </div>
  );
}
