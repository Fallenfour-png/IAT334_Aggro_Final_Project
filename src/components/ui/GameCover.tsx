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

/** Figma "Game Cover": the drawn Hollow Signal cover, or the uploaded cover image. */
export function GameCover({ project }: { project: Project }) {
  if (project.coverImage) {
    return (
      <div className="game-cover game-cover--image">
        <img src={project.coverImage} alt={`${project.name} cover`} />
      </div>
    );
  }
  if (project.coverGradient) {
    const [from, to] = project.coverGradient;
    return (
      <div className="game-cover" style={{ background: `linear-gradient(to bottom, ${from}, ${to})` }}>
        <p className="t-h3">
          {project.coverTop}
          <br />
          {project.coverBottom}
        </p>
      </div>
    );
  }
  return (
    <div className="game-cover">
      <img src={iconUrl('signal-ring-1')} alt="" style={{ left: 50.36, top: -34.03, width: 204.167, height: 204.167 }} />
      <img src={iconUrl('signal-ring-2')} alt="" style={{ left: 84.39, top: 0, width: 136.111, height: 136.111 }} />
      <img src={iconUrl('signal-ring-3')} alt="" style={{ left: 115.7, top: 31.3, width: 73.5, height: 73.5 }} />
      <img src={iconUrl('signal-core')} alt="" style={{ left: 144.28, top: 59.89, width: 16.333, height: 16.333 }} />
      <p className="t-h3">
        {project.coverTop}
        <br />
        {project.coverBottom}
      </p>
    </div>
  );
}
