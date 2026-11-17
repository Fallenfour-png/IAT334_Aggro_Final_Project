const files = import.meta.glob('../assets/icons/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>;

export function iconUrl(name: string): string {
  const url = files[`../assets/icons/${name}.svg`];
  if (!url) throw new Error(`Unknown icon: ${name}`);
  return url;
}

/**
 * Renders an SVG icon. With `tint`, the icon is drawn as a mask filled with the
 * current text colour, so hover states can recolour it like the Figma hover variants.
 */
export function Icon({
  name,
  size = 16,
  width,
  height,
  className,
  tint,
}: {
  name: string;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  tint?: boolean;
}) {
  const w = width ?? size;
  const h = height ?? size;
  if (tint) {
    const url = `url("${iconUrl(name)}")`;
    return (
      <span
        aria-hidden
        className={`mi ${className ?? ''}`}
        style={{ width: w, height: h, WebkitMaskImage: url, maskImage: url }}
      />
    );
  }
  return (
    <img
      src={iconUrl(name)}
      width={w}
      height={h}
      alt=""
      className={className}
      draggable={false}
      style={{ flexShrink: 0 }}
    />
  );
}
