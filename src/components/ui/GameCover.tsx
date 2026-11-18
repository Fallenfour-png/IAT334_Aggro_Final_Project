import { iconUrl } from '../../lib/icons';
import type { Project } from '../../state/types';

/** Small square cover for game lists (Games cards, Other Projects). */
export function GameThumb({ project, size }: { project: Project; size: [number, number] }) {
  const [w, h] = size;
  if (project.coverImage) return <img className="game-thumb" src={project.coverImage} alt="" width={w} height={h} style={{ objectFit: 'cover' }} />;
  if (project.coverGradient)
    return <span className="game-thumb" style={{ width: w, height: h, background: `linear-gradient(to bottom, ${project.coverGradient[0]}, ${project.coverGradient[1]})` }} />;
  return <img className="game-thumb" src={iconUrl('game-cover-hollow')} alt="" width={w} height={h} />;
}

/** Signal art positions: the larger Settings cover, and Figma's 142x180 Home header cover (3726:60849). */
const RINGS = {
  large: [
    { left: 50.36, top: -34.03, size: 204.167 },
    { left: 84.39, top: 0, size: 136.111 },
    { left: 115.7, top: 31.3, size: 73.5 },
    { left: 144.28, top: 59.89, size: 16.333 },
  ],
  small: [
    { left: 43.4, top: -29.32, size: 175.94 },
    { left: 72.72, top: 0, size: 117.29 },
    { left: 99.7, top: 26.98, size: 63.34 },
    { left: 124.33, top: 51.61, size: 14.08 },
  ],
};
const RING_ICONS = ['signal-ring-1', 'signal-ring-2', 'signal-ring-3', 'signal-core'];

/** Figma "Game Cover": the drawn Hollow Signal cover, or the uploaded cover image. */
export function GameCover({ project, small = false }: { project: Project; small?: boolean }) {
  const sizeClass = small ? ' game-cover--small' : '';
  if (project.coverImage) {
    return (
      <div className={`game-cover game-cover--image${sizeClass}`}>
        <img src={project.coverImage} alt={`${project.name} cover`} />
      </div>
    );
  }
  if (project.coverGradient) {
    const [from, to] = project.coverGradient;
    return (
      <div className={`game-cover${sizeClass}`} style={{ background: `linear-gradient(to bottom, ${from}, ${to})` }}>
        <p className="t-h3">
          {project.coverTop}
          <br />
          {project.coverBottom}
        </p>
      </div>
    );
  }
  return (
    <div className={`game-cover${sizeClass}`}>
      {RINGS[small ? 'small' : 'large'].map((r, i) => (
        <img key={RING_ICONS[i]} src={iconUrl(RING_ICONS[i])} alt="" style={{ left: r.left, top: r.top, width: r.size, height: r.size }} />
      ))}
      <p className="t-h3">
        {project.coverTop}
        <br />
        {project.coverBottom}
      </p>
    </div>
  );
}
