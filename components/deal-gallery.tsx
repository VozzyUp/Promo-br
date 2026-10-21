"use client";

import { useState } from "react";

/** Imagem principal com miniaturas; só aparece quando a oferta tem mais de uma imagem. */
export function DealGallery({ images, title }: { images: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- trocar por next/image quando o storage tiver loader */}
      <img src={images[current]} alt={`${title} (imagem ${current + 1} de ${images.length})`} className="size-full min-h-64 rounded-xs object-contain" />
      <ul className="flex flex-wrap gap-2" aria-label="Imagens da oferta">
        {images.map((src, i) => (
          <li key={src}>
            <button
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Ver imagem ${i + 1}`}
              aria-current={i === current}
              className={`size-14 overflow-hidden rounded-sm border-2 ${i === current ? "border-accent" : "border-border"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
