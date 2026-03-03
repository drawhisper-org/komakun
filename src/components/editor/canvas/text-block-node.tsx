import React, { memo } from "react";
import { Text as KonvaText, Rect, Group, Circle } from "react-konva";
import type { TextBlock } from "@/stores/project-store";
import {
  normalizeMangaText,
  tokenizeVertical,
  tokenCellCount,
  toHalfwidthPunct,
  SINGLE_CENTER_PUNCT,
  FULLWIDTH_PUNCT,
  type VToken,
} from "./utils/vertical-text";

/* ── Text Block Node ── */

export const TextBlockNode = memo(function TextBlockNode({ block, fontGeneration }: { block: TextBlock; fontGeneration: number }) {
  // fontGeneration is used to force re-render when fonts finish loading
  void fontGeneration;
  const displayText = block.translatedText || block.originalText;
  if (!displayText) return null;

  const isVertical = block.textDirection === "vertical";
  const fontFamily = block.fontFamily || "Comic Neue, sans-serif";
  const fontColor = block.fontColor || "#000000";
  const align = block.textAlign || "center";
  const lineH = block.lineHeight ?? 1.2;
  const rotation = block.rotation ?? 0;
  const fontWeight = block.fontWeight || "normal";
  const fontStyle = block.fontStyle || "normal";
  const letterSpacing = block.letterSpacing ?? 0;
  const strokeEnabled = block.strokeEnabled ?? false;
  const strokeW = block.strokeWidth ?? 4;
  const contentAlign = block.contentAlign || "middle";
  const pad = block.padding ?? 0;

  // Effective inner dimensions after padding
  const innerW = Math.max(1, block.width - pad * 2);
  const innerH = Math.max(1, block.height - pad * 2);

  if (isVertical) {
    // Vertical text: multi-column right-to-left layout like real manga.
    const fontSize = block.fontSize || 14;
    const charH = fontSize * 1.15 + letterSpacing;
    const colW = fontSize * lineH;
    const charsPerCol = Math.max(1, Math.floor(innerH / charH));

    const normalizedText = normalizeMangaText(displayText);

    const segments = normalizedText.split("\n");
    const columns: VToken[][] = [];
    for (const seg of segments) {
      const tokens = tokenizeVertical(seg);
      if (tokens.length === 0) {
        columns.push([]);
      } else {
        let col: VToken[] = [];
        let cells = 0;
        for (const tok of tokens) {
          const c = tokenCellCount(tok);
          if (cells + c > charsPerCol && col.length > 0) {
            columns.push(col);
            col = [];
            cells = 0;
          }
          col.push(tok);
          cells += c;
        }
        if (col.length > 0) columns.push(col);
      }
    }

    const combinedStyle =
      `${fontWeight === "bold" ? "bold" : ""} ${fontStyle}`.trim() || "normal";

    const totalColumnsW = columns.length * colW;
    const slack = Math.max(0, innerW - totalColumnsW);
    const groupOffset =
      align === "center" ? slack / 2 :
      align === "right" ? slack :
      0;

    // Check if any column has special tokens (combined, dots, dash, wave, paren, or single ！？)
    const hasSpecialTokens = columns.some((col) => col.some((t) =>
      t.type !== "char" || SINGLE_CENTER_PUNCT.has(t.text)
    ));

    // Simple path: all chars are simple — use single KonvaText per column (fast)
    if (!hasSpecialTokens) {
      return (
        <Group
          x={block.x + pad}
          y={block.y + pad}
          width={innerW}
          height={innerH}
          rotation={rotation}
          clipX={0}
          clipY={0}
          clipWidth={innerW}
          clipHeight={innerH}
          listening={false}
        >
          {columns.map((col, ci) => {
            const colX = groupOffset + (totalColumnsW - (ci + 1) * colW);
            const colCells = col.reduce((n, t) => n + (t.type === "char" ? 1 : 1), 0);
            const colContentH = colCells * charH;
            const vSlack = Math.max(0, innerH - colContentH);
            const colYOffset =
              contentAlign === "middle" ? vSlack / 2 :
              contentAlign === "bottom" ? vSlack : 0;
            const sharedProps = {
              x: colX,
              y: colYOffset,
              width: colW,
              text: col.map((t) => t.type === "char" ? t.text : "").join("\n"),
              fontSize,
              lineHeight: 1.15,
              letterSpacing,
              fontFamily,
              fontStyle: combinedStyle,
              align: "center" as const,
              verticalAlign: "top" as const,
              wrap: "none" as const,
              listening: false,
            };
            return strokeEnabled ? (
              <Group key={ci}>
                <KonvaText {...sharedProps} fill="white" stroke="white" strokeWidth={strokeW} lineJoin="round" />
                <KonvaText {...sharedProps} fill={fontColor} strokeEnabled={false} />
              </Group>
            ) : (
              <KonvaText key={ci} {...sharedProps} fill={fontColor} />
            );
          })}
        </Group>
      );
    }

    // Complex path: render each token individually
    return (
      <Group
        x={block.x + pad}
        y={block.y + pad}
        width={innerW}
        height={innerH}
        rotation={rotation}
        clipX={0}
        clipY={0}
        clipWidth={innerW}
        clipHeight={innerH}
        listening={false}
      >
        {columns.map((col, ci) => {
          const colX = groupOffset + (totalColumnsW - (ci + 1) * colW);
          let cellIndex = 0;
          const colCells = col.reduce((n, t) => n + tokenCellCount(t), 0);
          const colContentH = colCells * charH;
          const vSlack = Math.max(0, innerH - colContentH);
          const colYOffset =
            contentAlign === "middle" ? vSlack / 2 :
            contentAlign === "bottom" ? vSlack : 0;
          return (
            <Group key={ci}>
              {col.map((token, ti) => {
                const tokenY = cellIndex * charH + colYOffset;
                const cellsUsed = tokenCellCount(token);
                cellIndex += cellsUsed;

                if (token.type === "combined") {
                  const pairFontSize = fontSize * 0.88;
                  const renderChars = Array.from(token.text).map(toHalfwidthPunct);
                  const halfW = colW / 2;
                  return (
                    <Group key={ti}>
                      {renderChars.map((ch, ci) => {
                        const cProps = {
                          text: ch,
                          fontSize: pairFontSize,
                          fontFamily,
                          fontStyle: combinedStyle,
                          align: "center" as const,
                          verticalAlign: "middle" as const,
                          width: halfW,
                          height: charH,
                          x: colX + ci * halfW,
                          y: tokenY,
                          wrap: "none" as const,
                          listening: false,
                        };
                        return strokeEnabled ? (
                          <Group key={ci}>
                            <KonvaText {...cProps} fill="white" stroke="white" strokeWidth={strokeW * 0.7} lineJoin="round" />
                            <KonvaText {...cProps} fill={fontColor} strokeEnabled={false} />
                          </Group>
                        ) : (
                          <KonvaText key={ci} {...cProps} fill={fontColor} />
                        );
                      })}
                    </Group>
                  );
                }

                if (token.type === "dots") {
                  const totalH = cellsUsed * charH;
                  const dotRadius = Math.max(1.5, fontSize * 0.055);
                  const gap = totalH / (token.count + 1);
                  const dotCx = colX + colW / 2;
                  const dotElements: React.ReactNode[] = [];
                  for (let d = 0; d < token.count; d++) {
                    const dY = tokenY + gap * (d + 1);
                    if (strokeEnabled) {
                      dotElements.push(
                        <Circle key={`s${d}`} x={dotCx} y={dY} radius={dotRadius + strokeW * 0.3} fill="white" listening={false} />,
                      );
                    }
                    dotElements.push(
                      <Circle key={`f${d}`} x={dotCx} y={dY} radius={dotRadius} fill={fontColor} listening={false} />,
                    );
                  }
                  return <Group key={ti}>{dotElements}</Group>;
                }

                if (token.type === "dash") {
                  const dashH = cellsUsed * charH;
                  const lineThickness = Math.max(1.5, fontSize * 0.065);
                  const lineX = colX + colW / 2 - lineThickness / 2;
                  const marginY = charH * 0.08;
                  if (strokeEnabled) {
                    return (
                      <Group key={ti}>
                        <Rect x={lineX - strokeW * 0.4} y={tokenY + marginY} width={lineThickness + strokeW * 0.8} height={dashH - marginY * 2} fill="white" cornerRadius={lineThickness} listening={false} />
                        <Rect x={lineX} y={tokenY + marginY} width={lineThickness} height={dashH - marginY * 2} fill={fontColor} cornerRadius={lineThickness / 2} listening={false} />
                      </Group>
                    );
                  }
                  return (
                    <Rect key={ti} x={lineX} y={tokenY + marginY} width={lineThickness} height={dashH - marginY * 2} fill={fontColor} cornerRadius={lineThickness / 2} listening={false} />
                  );
                }

                if (token.type === "wave") {
                  const waveCenterX = colX + colW / 2;
                  const waveCenterY = tokenY + charH / 2;
                  const waveProps = {
                    text: token.text,
                    fontSize,
                    fontFamily,
                    fontStyle: combinedStyle,
                    align: "center" as const,
                    verticalAlign: "middle" as const,
                    width: charH,
                    height: colW,
                    offsetX: charH / 2,
                    offsetY: colW / 2,
                    x: waveCenterX,
                    y: waveCenterY,
                    rotation: 90,
                    wrap: "none" as const,
                    listening: false,
                  };
                  return strokeEnabled ? (
                    <Group key={ti}>
                      <KonvaText {...waveProps} fill="white" stroke="white" strokeWidth={strokeW} lineJoin="round" />
                      <KonvaText {...waveProps} fill={fontColor} strokeEnabled={false} />
                    </Group>
                  ) : (
                    <KonvaText key={ti} {...waveProps} fill={fontColor} />
                  );
                }

                if (token.type === "paren") {
                  const parenCenterX = colX + colW / 2;
                  const parenCenterY = tokenY + charH / 2;
                  const parenProps = {
                    text: token.text,
                    fontSize,
                    fontFamily,
                    fontStyle: combinedStyle,
                    align: "center" as const,
                    verticalAlign: "middle" as const,
                    width: charH,
                    height: colW,
                    offsetX: charH / 2,
                    offsetY: colW / 2,
                    x: parenCenterX,
                    y: parenCenterY,
                    rotation: 90,
                    wrap: "none" as const,
                    listening: false,
                  };
                  return strokeEnabled ? (
                    <Group key={ti}>
                      <KonvaText {...parenProps} fill="white" stroke="white" strokeWidth={strokeW} lineJoin="round" />
                      <KonvaText {...parenProps} fill={fontColor} strokeEnabled={false} />
                    </Group>
                  ) : (
                    <KonvaText key={ti} {...parenProps} fill={fontColor} />
                  );
                }

                // Normal single character
                const isCenterPunct = SINGLE_CENTER_PUNCT.has(token.text);
                const renderText = FULLWIDTH_PUNCT.has(token.text) ? toHalfwidthPunct(token.text) : token.text;
                const charProps = {
                  text: renderText,
                  fontSize,
                  fontFamily,
                  fontStyle: combinedStyle,
                  letterSpacing,
                  align: "center" as const,
                  verticalAlign: isCenterPunct ? "middle" as const : "top" as const,
                  width: colW,
                  height: isCenterPunct ? charH : undefined,
                  x: colX,
                  y: tokenY,
                  wrap: "none" as const,
                  listening: false,
                };
                return strokeEnabled ? (
                  <Group key={ti}>
                    <KonvaText {...charProps} fill="white" stroke="white" strokeWidth={strokeW} lineJoin="round" />
                    <KonvaText {...charProps} fill={fontColor} strokeEnabled={false} />
                  </Group>
                ) : (
                  <KonvaText key={ti} {...charProps} fill={fontColor} />
                );
              })}
            </Group>
          );
        })}
      </Group>
    );
  }

  const horizProps = {
    x: block.x + pad,
    y: block.y + pad,
    width: innerW,
    height: innerH,
    rotation,
    text: normalizeMangaText(displayText),
    fontSize: block.fontSize || 14,
    lineHeight: lineH,
    letterSpacing,
    fontFamily,
    fontStyle: `${fontWeight === "bold" ? "bold" : ""} ${fontStyle}`.trim() || "normal",
    align,
    verticalAlign: contentAlign as "top" | "middle" | "bottom",
    wrap: "word" as const,
    listening: false,
  };

  if (strokeEnabled) {
    return (
      <Group>
        <KonvaText
          {...horizProps}
          fill="white"
          stroke="white"
          strokeWidth={strokeW}
          lineJoin="round"
        />
        <KonvaText
          {...horizProps}
          fill={fontColor}
          strokeEnabled={false}
        />
      </Group>
    );
  }

  return (
    <KonvaText
      {...horizProps}
      fill={fontColor}
    />
  );
});
