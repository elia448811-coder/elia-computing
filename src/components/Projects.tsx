import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { projects } from "@/data/projects";

export function ProjectCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`project-grid ${compact ? "project-grid-compact" : ""}`}>
      {projects.map((project, index) => (
        <article key={project.id} className={`project-card project-${project.id}`} style={{ "--project-color": project.color } as CSSProperties}>
          <div className="project-art">
            <span className="project-index">0{index + 1}</span>
            <Image className="project-screenshot" src={project.image} alt={`צילום מסך של ${project.name}`} width={1440} height={900} sizes="(max-width: 600px) 94vw, 46vw" loading={!compact && index === 0 ? "eager" : "lazy"} unoptimized />
          </div>
          <div className="project-card-body">
            <p className="project-category">{project.category}</p>
            <h3>{project.name}</h3>
            {!compact ? <p className="project-headline">{project.headline}</p> : null}
            <p className="project-description">{project.description}</p>
            {!compact ? <ul className="project-tags" aria-label="תחומי הפרויקט">{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul> : null}
            <a className="project-link" href={project.href} target="_blank" rel="noopener noreferrer">
              <span>{project.action}<span className="sr-only"> (נפתח בחלון חדש)</span></span>

            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Projects() {
  return (
    <section id="projects" className="section-y home-projects relative" aria-labelledby="projects-title">
      <div className="container-site">
        <div className="projects-section-heading">
          <div><p className="project-category">עבודה אמיתית, תוצאה שאפשר לראות</p><h2 id="projects-title">מהרעיון למסך.</h2><p className="mt-3 text-silver-muted">הצצה לפרויקטים שפיתחנו ולעסקים שקיבלו נוכחות דיגיטלית משלהם.</p></div>
          <Link href="/projects" className="btn btn-secondary">לכל הפרויקטים</Link>
        </div>
        <ProjectCards compact />
      </div>
    </section>
  );
}
