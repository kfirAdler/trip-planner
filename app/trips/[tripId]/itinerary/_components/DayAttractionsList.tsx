"use client";

import { flushSync } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_META } from "@/lib/categories";
import { moveAttraction } from "../actions";
import { AttractionRow, type Attraction } from "./AttractionRow";

export function DayAttractionsList({
  tripId,
  attractions,
  dayCount,
  canEdit,
}: {
  tripId: string;
  attractions: Attraction[];
  dayCount: number;
  canEdit: boolean;
}) {
  const [items, setItems] = useState(attractions);
  const [movingId, setMovingId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const router = useRouter();

  useEffect(() => {
    setItems(attractions);
  }, [attractions]);

  async function move(id: string, direction: "up" | "down") {
    if (movingId) return;

    const currentIndex = items.findIndex((item) => item.id === id);
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length) return;

    const before = new Map(
      items.map((item) => [item.id, itemRefs.current.get(item.id)?.getBoundingClientRect()])
    );
    const previousItems = items;
    const nextItems = [...items];
    [nextItems[currentIndex], nextItems[nextIndex]] = [
      nextItems[nextIndex],
      nextItems[currentIndex],
    ];

    flushSync(() => {
      setItems(nextItems);
      setMovingId(id);
    });

    for (const item of nextItems) {
      const element = itemRefs.current.get(item.id);
      const previousRect = before.get(item.id);
      const nextRect = element?.getBoundingClientRect();
      if (!element || !previousRect || !nextRect) continue;

      const offset = previousRect.top - nextRect.top;
      if (offset !== 0) {
        element.animate(
          [
            { transform: `translateY(${offset}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: 260,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          }
        );
      }
    }

    try {
      await moveAttraction(tripId, id, direction);
    } catch {
      setItems(previousItems);
      router.refresh();
    } finally {
      setMovingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="pl-1 text-sm font-light text-foreground-muted">
        Nothing planned yet.
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-3">
      {items.length > 1 && (
        <div
          aria-hidden
          className="absolute top-3 bottom-3 left-[15px] w-px bg-border"
        />
      )}
      {items.map((attraction, index) => {
        const meta = CATEGORY_META[attraction.category];
        const isTerminus = attraction.category === "LODGING";

        return (
          <div
            key={attraction.id}
            ref={(element) => {
              if (element) itemRefs.current.set(attraction.id, element);
              else itemRefs.current.delete(attraction.id);
            }}
            className="relative flex gap-3"
          >
            <div className="relative z-10 flex w-[30px] shrink-0 justify-center pt-3.5">
              <span
                className={
                  isTerminus
                    ? "h-4 w-4 shrink-0 rounded-full ring-[3px] ring-background"
                    : "h-3 w-3 shrink-0 rounded-full ring-[3px] ring-background"
                }
                style={{ background: meta.color }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <AttractionRow
                tripId={tripId}
                attraction={attraction}
                dayCount={dayCount}
                canEdit={canEdit}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                isMoving={movingId !== null}
                onMove={(direction) => move(attraction.id, direction)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
